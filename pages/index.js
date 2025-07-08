// ==============================================================================
// Файл: pages/index.js
// Версия: Финальная, отлаженная, с восстановленным UI
//
// Изменения:
// 1. Полностью восстановлена ваша оригинальная JSX-разметка для всех шагов.
// 2. Логика обработки ответа от API перенесена полностью сюда,
//    чтобы избежать ошибок и корректно отображать все данные.
// ==============================================================================

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import demoTasks from '../src/demoTasks.json';
import Stepper from '../src/components/Stepper';
import { marked } from 'marked'; // Убедитесь, что эта библиотека установлена: npm install marked

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function CreatoriaWizard() {
  const [step, setStep] = useState(1);
  const [taskKey, setTaskKey] = useState('');
  const [description, setDescription] = useState('');
  const [yamlText, setYamlText] = useState('');
  const [goalVariables, setGoalVariables] = useState([]);
  const [constraints, setConstraints] = useState([]);
  
  // Здесь будут храниться все данные, полученные от API
  const [apiResponse, setApiResponse] = useState(null); 
  
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  function extractDescriptions(item) {
    if (typeof item === 'string') return item;
    if (Array.isArray(item)) return item.map(extractDescriptions).join('; ');
    if (item?.description) return item.description;
    if (item && typeof item === 'object') return Object.values(item).map(extractDescriptions).join('; ');
    return String(item);
  }

  const handleGenerateYaml = async () => {
    if (!description.trim()) return alert('Enter a description');
    setRunning(true);
    try {
      const res = await fetch('/api/generate-yaml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to generate YAML');
      setYamlText(json.yaml);
      setGoalVariables((json.data.goals || []).map(extractDescriptions));
      setConstraints((json.data.constraints || []).map(extractDescriptions));
      setStep(2);
    } catch (err) {
      alert('YAML error: ' + err.message);
    } finally {
      setRunning(false);
    }
  };

  const handleSelectDemo = () => {
    if (!taskKey) return;
    const demo = demoTasks[taskKey];
    setDescription(demo.description);
    setYamlText(`goals:\n  - ${demo.goals.join('\n  - ')}\n\nconstraints:\n  - ${demo.constraints.join('\n  - ')}`);
    setGoalVariables(demo.goals);
    setConstraints(demo.constraints);
    setApiResponse(demo); // Загружаем демо-данные для отображения
    setStep(2);
  };

  const runOptimization = () => {
    setRunning(true);
    setProgress(0);
    const interval = setInterval(() => setProgress(p => Math.min(100, p + 20)), 300);
    
    // Если выбран демо-режим, просто переходим на следующий шаг
    if (taskKey) {
        clearInterval(interval);
        setRunning(false);
        setProgress(100);
        setStep(3);
        return;
    }

    // В "живом" режиме мы передаем `description`
    const payload = { description };

    fetch('/api/run-opt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(r => r.json())
      .then(res => {
        clearInterval(interval);
        setRunning(false);
        setProgress(100);

        if (res.error) {
            throw new Error(res.error);
        }
        
        // Сохраняем ВЕСЬ ответ от API в одно состояние
        setApiResponse(res);
        setStep(3);
      })
      .catch(err => {
        clearInterval(interval);
        setRunning(false);
        alert('Optimization error: ' + err.message);
      });
  };

  const handleFullAnalysis = () => {
    setStep(4);
  };

  // --- НОВАЯ, БОЛЕЕ НАДЕЖНАЯ ФУНКЦИЯ РЕНДЕРИНГА ---
  const renderResults = () => {
    // ДИАГНОСТИКА: Логируем полученные данные
    console.log("=== ДИАГНОСТИКА FRONTEND ===");
    console.log("Полный apiResponse:", apiResponse);
    
    if (apiResponse && apiResponse.numerical_results) {
      console.log("numerical_results:", apiResponse.numerical_results);
      if (apiResponse.numerical_results.result) {
        console.log("result:", apiResponse.numerical_results.result);
        console.log("front:", apiResponse.numerical_results.result.front);
        console.log("metadata:", apiResponse.numerical_results.result.metadata);
      }
    }
    
    // Извлекаем данные из сохраненного ответа ИЛИ из демо-задач
    let paretoDataForProcessing;
    
    if (taskKey && demoTasks[taskKey]) {
      // Если используем демо-задачу, берем данные из demoTasks
      paretoDataForProcessing = demoTasks[taskKey].pareto;
    } else {
      // Если используем реальный API, берем данные из apiResponse
      paretoDataForProcessing = apiResponse?.pareto || apiResponse?.numerical_results?.result?.front;
    }
    
    if (!Array.isArray(paretoDataForProcessing) || paretoDataForProcessing.length === 0) {
        return <p className="text-center text-yellow-400">Результаты вычислений недоступны или имеют неверный формат.</p>;
    }
    
    // Используем данные как есть, без добавления cost и интерполяции
    let processedData = paretoDataForProcessing;

    const top5 = processedData.slice(0, 5);
    const numericKeys = Object.keys(top5[0] || {}).filter(k => typeof top5[0][k] === 'number');
    
    // Определяем ключи целей - исключаем служебные поля
    const actualObjectiveKeys = numericKeys.filter(k => 
      !k.startsWith('parameter') && 
      !k.includes('type') && 
      !k.includes('id') &&
      k !== 'type' &&
      k !== 'index' &&
      k !== 'solution_id'
    );
    
    const actualNObjectives = actualObjectiveKeys.length;
    
    console.log(`Обнаружено ${actualNObjectives} целей:`, actualObjectiveKeys);
    console.log(`Всего числовых полей: ${numericKeys.length}:`, numericKeys);
    
    let plotArea = null;

    if (processedData.length < 1) {
      plotArea = <p className="text-center text-red-400">Visualization cannot be built: no data points available.</p>;
    } else if (actualNObjectives === 1) {
      // Для 1D задач показываем только значение, без графика
      const objKey = actualObjectiveKeys[0];
      const bestValue = processedData[0][objKey];
      
      plotArea = (
        <div className="text-center p-8 bg-gray-800 rounded-lg">
          <h3 className="text-xl mb-4">Single Objective Optimization Result</h3>
          <div className="text-3xl font-bold text-green-400 mb-2">
            {typeof bestValue === 'number' ? bestValue.toFixed(4) : bestValue}
          </div>
          <div className="text-lg text-gray-300">
            {objKey.replace('objective', 'Objective ').replace('_', ' ')}
          </div>
          {processedData.length > 1 && (
            <div className="mt-4 text-sm text-gray-400">
              Found {processedData.length} solutions. Best solution shown above.
            </div>
          )}
        </div>
      );
    } else if (actualNObjectives === 2) {
      // Для 2D задач показываем 2D график - используем только первые 5 точек
      const [k1, k2] = actualObjectiveKeys;
      const plotData = processedData.slice(0, 5); // Ограничиваем до 5 точек как в таблице
      
      // Динамические подписи осей на основе метаданных
      const getAxisLabel = (key, metadata) => {
        // Пытаемся найти информацию в метаданных
        if (metadata && metadata.objectives) {
          const objInfo = metadata.objectives.find(obj => obj.key === key);
          if (objInfo) {
            return objInfo.unit ? `${objInfo.name} (${objInfo.unit})` : objInfo.name;
          }
        }
        
        // Фолбэк к статическим правилам
        if (key.includes('mass')) return 'Total Mass (kg)';
        if (key.includes('stress')) return 'Stress Ratio';
        if (key.includes('weight')) return 'Weight (kg)';
        if (key.includes('strength')) return 'Stress Ratio';
        if (key.includes('efficiency')) return 'Efficiency (%)';
        if (key.includes('cost')) return 'Cost ($)';
        if (key.includes('energy')) return 'Energy (kWh)';
        if (key.includes('pressure')) return 'Pressure Drop (Pa)';
        
        return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      };
      
      // Извлекаем метаданные если доступны
      const metadata = processedData[0]?.metadata || (apiResponse?.numerical_results?.result?.metadata);
      
      plotArea = (
        <Plot
            data={[{
                x: plotData.map(p => p[k1]),
                y: plotData.map(p => p[k2]),
                mode: 'markers+lines',
                type: 'scatter',
                marker: { size: 8, color: '#FFAA00' },
                line: { color: '#FFAA00' }
            }]}
            layout={{
              title: 'Pareto Front Visualization (2D)',
              xaxis: { title: getAxisLabel(k1, metadata), color: '#fff', gridcolor: '#444' },
              yaxis: { title: getAxisLabel(k2, metadata), color: '#fff', gridcolor: '#444' },
              paper_bgcolor: '#0e1117',
              font: { color: '#fff' },
              height: 500,
              autosize: true,
              margin: { l: 10, r: 10, t: 40, b: 10 },
            }}
            style={{ width: '100%', height: '50vh' }}
            config={{ responsive: true }}
        />
      );
    } else if (actualNObjectives === 3) {
      // Для 3D задач показываем 3D график - используем только первые 5 точек
      const [k1, k2, k3] = actualObjectiveKeys;
      const plotData = processedData.slice(0, 5); // Ограничиваем до 5 точек как в таблице
      
      plotArea = (
        <Plot
            data={[{ 
                x: plotData.map(p => p[k1]), 
                y: plotData.map(p => p[k2]), 
                z: plotData.map(p => p[k3]), 
                mode: 'markers', 
                type: 'scatter3d', 
                marker: { size: 6, color: '#FFAA00' } 
            }]}
            layout={{
              title: 'Pareto Front Visualization (3D)',
              scene: {
                xaxis: { title: k1, color: '#fff', gridcolor: '#444' },
                yaxis: { title: k2, color: '#fff', gridcolor: '#444' },
                zaxis: { title: k3, color: '#fff', gridcolor: '#444' },
              },
              paper_bgcolor: '#0e1117',
              font: { color: '#fff' },
              height: 600,
              autosize: true,
              margin: { l: 10, r: 10, t: 40, b: 10 },
            }}
            style={{ width: '100%', height: '60vh' }}
            config={{ responsive: true }}
        />
      );
    } else if (actualNObjectives > 3) {
      plotArea = <p className="text-center text-yellow-400">Visualization for {actualNObjectives} objectives is not supported yet. Please see the table below for details.</p>;
    } else {
      plotArea = <p className="text-center text-red-400">Visualization cannot be built: no objectives detected.</p>;
    }
    
    return (
      <>
        {plotArea}
        <div className="mt-6 overflow-x-auto">
          <h3 className="text-lg mb-2">Top 5 Solutions</h3>
          <table className="min-w-full bg-gray-800 text-white rounded">
            <thead>
              <tr>{Object.keys(top5[0] || {}).map(col => {
                let displayName = col;
                if (col.includes('mass') && col.includes('kg')) displayName = 'Mass (kg)';
                else if (col.includes('stress') && col.includes('ratio')) displayName = 'Stress Ratio';
                else if (col.includes('thickness') && col.includes('cm')) displayName = 'Thickness (cm)';
                else if (col.includes('width') && col.includes('cm')) displayName = 'Width (cm)';
                else if (col === 'type') displayName = 'Solution Type';
                else displayName = col.replace(/_/g, ' ').toUpperCase();
                
                return <th key={col} className="px-4 py-2 border-gray-700 border-b text-left">{displayName}</th>;
              })}</tr>
            </thead>
            <tbody>
              {top5.map((row, i) => (
                <tr key={i} className={i % 2 ? 'bg-gray-700' : 'bg-gray-600'}>
                  {Object.keys(row).map(col => <td key={col} className="px-4 py-2 border-gray-700 border-b">{typeof row[col] === 'number' ? row[col].toFixed(2) : row[col]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  };
  
  // --- Основной JSX с восстановленной логикой Шагов 3 и 4 ---
  return (
    <div className="min-h-screen bg-[#0e1117] text-white p-6 mx-auto">
      <header className="flex flex-col items-center mb-8 mt-4">
        <div className="flex items-center">
          <Image src="/favicon.png" alt="Logo" width={40} height={40} className="mr-4" />
          <div>
            <h1 className="text-3xl font-semibold">Creatoria Demo</h1>
            <p className="text-base">Smart assistant for invention and optimization</p>
          </div>
        </div>
      </header>
      
      <Stepper step={step} setStep={setStep} steps={['Step 1', 'Step 2', 'Step 3', 'Step 4']} />

      <div className="pl-4">
        {step === 1 && (
          <div className="flex justify-center">
            <div className="bg-gray-700 rounded-lg shadow-lg p-6 my-6 max-w-xl w-full">
              <div className="flex items-center justify-center mb-4"><h2 className="text-xl">Step 1: Describe your problem or select demo</h2><span className="ml-2">🖉</span></div>
              <div className="space-y-4">
                <select className="w-full bg-gray-800 p-2 rounded" value={taskKey} onChange={e => { setTaskKey(e.target.value); setApiResponse(null); }}>
                  <option value="">-- Select Demo or Custom --</option>
                  {Object.entries(demoTasks).map(([key, val]) => (<option key={key} value={key}>{val.description.substring(0, 50) + '...'}</option>))}
                </select>
                {!taskKey ? (
                  <>
                    <textarea rows={4} className="w-full bg-gray-800 p-3 rounded" placeholder="Enter problem description" value={description} onChange={e => setDescription(e.target.value)} />
                    <button onClick={handleGenerateYaml} disabled={running} className="bg-orange-500 px-4 py-2 rounded hover:bg-orange-600 disabled:bg-gray-500">{running ? 'Generating...' : 'Generate YAML'}</button>
                  </>
                ) : (
                  <>
                    <p className="w-full bg-gray-900 p-3 rounded">{demoTasks[taskKey].description}</p>
                    <button onClick={handleSelectDemo} className="bg-blue-500 px-4 py-2 rounded hover:bg-blue-600">Next →</button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {yamlText && step >= 2 && (
            <div className="flex justify-center my-8">
                <pre className="bg-gray-900 p-6 rounded-xl shadow-lg max-w-2xl w-full text-white text-md whitespace-pre-wrap">{yamlText}</pre>
            </div>
        )}
        
        {step === 2 && (
            <div className="flex justify-center">
                <div className="bg-gray-700 rounded-lg shadow-lg p-6 my-6 max-w-xl w-full">
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={() => setStep(1)} className="bg-[#FFAA00] text-black px-4 py-2 rounded hover:bg-yellow-500 mr-4">← Back</button>
                        <h2 className="text-xl">Step 2: Configure Goals & Constraints</h2><span className="ml-2">⚙️</span>
                    </div>
                    <div className="mb-4"><h3 className="font-medium mb-2">Goals</h3>{goalVariables.map((g, i) => (<div key={i} className="bg-gray-800 p-3 rounded mb-2">{g}</div>))}</div>
                    <div className="mb-4"><h3 className="font-medium mb-2">Constraints</h3>{constraints.map((c, i) => (<div key={i} className="bg-gray-800 p-3 rounded mb-2">{c}</div>))}</div>
                    <button onClick={runOptimization} disabled={running} className={`w-full py-2 rounded ${running ? 'bg-gray-500' : 'bg-green-500 hover:bg-green-600'}`}>{running ? `Running... ${progress}%` : 'Run Optimization'}</button>
                </div>
            </div>
        )}

        {step === 3 && (
            <div className="bg-gray-700 rounded-lg shadow-lg p-6 my-6 max-w-4xl w-full mx-auto">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setStep(2)} className="bg-[#FFAA00] text-black px-4 py-2 rounded hover:bg-yellow-500 mr-4">← Back</button>
                <h2 className="text-xl">Step 3: Results</h2><span className="ml-2">📊</span>
              </div>
              {renderResults()}
              {(apiResponse?.human_readable_report || (taskKey && demoTasks[taskKey]?.explanations)) && (
                  <div className="bg-gray-800 rounded-lg p-6 mt-8 shadow-lg max-w-2xl mx-auto">
                      <h3 className="text-lg font-semibold mb-2">AI Data Summary:</h3>
                      <p className="text-gray-200">
                        {apiResponse?.human_readable_report 
                          ? (apiResponse.human_readable_report.match(/#\s*Резюме\s*([\s\S]*?)\n\n##/)?.[1]?.trim() || apiResponse.explanations?.summary || "Краткое саммари недоступно.")
                          : (taskKey && demoTasks[taskKey]?.explanations ? demoTasks[taskKey].explanations.join(' ') : "Отчет не был сгенерирован.")
                        }
                      </p>
                  </div>
              )}
              <div className="flex justify-end mt-6">
                  <button onClick={handleFullAnalysis} className="bg-[#FFAA00] text-black px-4 py-2 rounded hover:bg-yellow-500">Full Analysis</button>
              </div>
            </div>
        )}

        {step === 4 && (
            <div className="bg-gray-700 rounded-lg shadow-lg p-6 my-6 max-w-4xl w-full mx-auto">
              <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setStep(3)} className="bg-[#FFAA00] text-black px-4 py-2 rounded hover:bg-yellow-500 mr-4">← Back</button>
                  <h2 className="text-xl">Full AI Data Analysis</h2><span className="ml-2">🧠</span>
              </div>
              {apiResponse?.human_readable_report && (
                  <div className="bg-gray-800 rounded-lg p-6 mt-8 shadow-lg max-w-2xl mx-auto text-left"
                       dangerouslySetInnerHTML={{ __html: marked.parse(apiResponse.human_readable_report) }}/>
              )}
               {apiResponse?.full_analysis && (
                  <div className="bg-gray-800 rounded-lg p-6 mt-8 shadow-lg max-w-2xl mx-auto text-left">
                     <h3 className="text-lg font-semibold mb-2">Full AI Data Analysis:</h3>
                      {apiResponse.full_analysis.summary && <p className="mb-2 text-gray-200"><b>Summary:</b> {apiResponse.full_analysis.summary}</p>}
                      {apiResponse.full_analysis.trends && <p className="mb-2 text-gray-200"><b>Trends:</b> {apiResponse.full_analysis.trends}</p>}
                      {apiResponse.full_analysis.anomalies && <p className="mb-2 text-gray-200"><b>Anomalies:</b> {apiResponse.full_analysis.anomalies}</p>}
                      {apiResponse.full_analysis.recommendations && <p className="mb-2 text-gray-200"><b>Recommendations:</b> {apiResponse.full_analysis.recommendations}</p>}
                  </div>
              )}
            </div>
        )}
      </div>
    </div>
  );
}
