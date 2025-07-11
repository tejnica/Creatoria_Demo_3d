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

// Функция для форматирования чисел с сокращением (1 000 000 → 1M, 15000 → 15.0K)
function formatNumber(value) {
  if (typeof value !== 'number') return value;
  if (Math.abs(value) >= 1e9) return (value / 1e9).toFixed(2) + 'B';
  if (Math.abs(value) >= 1e6) return (value / 1e6).toFixed(2) + 'M';
  if (Math.abs(value) >= 1e3) return (value / 1e3).toFixed(2) + 'K';
  if (Math.abs(value) >= 1) return value.toFixed(2);
  return value.toExponential(2);
}

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

  // Функция для получения читаемых названий колонок
  const getDisplayName = (col, metadata) => {
    // Служебные поля
    if (col === 'type') return 'Solution Type';
    if (col === 'id') return 'ID';
    
    // Пытаемся найти информацию в метаданных
    if (metadata) {
      // Проверяем цели
      if (metadata.objectives) {
        const objInfo = metadata.objectives.find(obj => obj.key === col);
        if (objInfo) {
          return objInfo.unit ? `${objInfo.name} (${objInfo.unit})` : objInfo.name;
        }
      }
      
      // Проверяем переменные
      if (metadata.variables) {
        const varInfo = metadata.variables.find(v => v.key === col);
        if (varInfo) {
          return varInfo.unit ? `${varInfo.name} (${varInfo.unit})` : varInfo.name;
        }
      }
    }
    
    // Для всех остальных полей: просто красиво форматируем название
    return col
      .replace(/_/g, ' ')           // подчеркивания в пробелы
      .replace(/([A-Z])/g, ' $1')   // camelCase в слова
      .trim()                       // убираем лишние пробелы
      .replace(/\b\w/g, l => l.toUpperCase()); // каждое слово с большой буквы
  };

  // --- НОВАЯ, БОЛЕЕ НАДЕЖНАЯ ФУНКЦИЯ РЕНДЕРИНГА ---
  const renderResults = () => {
    // ДИАГНОСТИКА: Логируем полученные данные
    // Проверяем наличие данных для отладки (только при необходимости)
    if (!apiResponse?.numerical_results?.result?.front && !apiResponse?.pareto && !(taskKey && demoTasks[taskKey])) {
      console.warn("Нет данных для отображения результатов оптимизации");
    }
    
    // Извлекаем данные из сохраненного ответа ИЛИ из демо-задач
    let paretoDataForProcessing;
    
    // ИСПРАВЛЕНИЕ: Всегда сначала проверяем новый формат от Backend
    if (apiResponse?.numerical_results?.result?.front) {
      // Новый формат от Backend - приоритет
      paretoDataForProcessing = apiResponse.numerical_results.result.front;
    } else if (taskKey && demoTasks[taskKey]) {
      // Демо-задача как fallback
      paretoDataForProcessing = demoTasks[taskKey].pareto;
    } else {
      // Старый формат как последний fallback
      paretoDataForProcessing = apiResponse?.pareto;
      
      // Проверяем качество данных
      if (paretoDataForProcessing && paretoDataForProcessing.length > 0 && 
          Object.keys(paretoDataForProcessing[0]).length === 1 && 
          paretoDataForProcessing[0].type) {
        console.warn("Получены неполные данные от Backend - только типы решений без числовых значений");
      }
    }
    

    
    if (!Array.isArray(paretoDataForProcessing) || paretoDataForProcessing.length === 0) {
        return <p className="text-center text-yellow-400">Результаты вычислений недоступны или имеют неверный формат.</p>;
    }
    
    // Используем данные как есть, без добавления cost и интерполяции
    // Фильтруем элементы, у которых есть хотя бы одно числовое значение.
    let processedData = paretoDataForProcessing.filter(entry => Object.values(entry).some(v => typeof v === 'number'));

    // Если после фильтрации ничего не осталось — откатываемся к оригинальным данным.
    if (processedData.length === 0) processedData = paretoDataForProcessing;

    const top5 = processedData.slice(0, 5);
    

         // Используем метаданные для определения целей
     const metadata = apiResponse?.numerical_results?.result?.metadata || {};
     const objectives = metadata?.objectives || [];
     
     // Определяем числовые ключи
     const numericKeys = Object.keys(top5[0] || {}).filter(k => typeof top5[0][k] === 'number');
     
     let actualObjectiveKeys = [];
     if (objectives.length > 0) {
       // Используем метаданные - приоритет
       actualObjectiveKeys = objectives.map(obj => obj.key);
     } else {
       // Fallback: определяем цели из числовых ключей
       actualObjectiveKeys = numericKeys.filter(k => 
         !k.startsWith('parameter') && 
         !k.includes('type') && 
         !k.includes('id') &&
         k !== 'type' &&
         k !== 'index' &&
         k !== 'solution_id'
       );
     }
     
     const actualNObjectives = actualObjectiveKeys.length;
     
     // Полезные логи для будущих улучшений (единицы измерения, новые задачи)
     if (objectives.length > 0) {
       console.log('Метаданные целей:', objectives.map(obj => `${obj.key} (${obj.unit || 'без единиц'})`));
     }
     if (actualNObjectives === 0) {
       console.warn('Не обнаружено целей оптимизации в данных');
     }
    

    
    let plotArea = null;

    if (processedData.length < 1) {
      plotArea = <p className="text-center text-red-400">Visualization cannot be built: no data points available.</p>;
    } else if (actualNObjectives === 1) {
      // Для 1D задач показываем только значение, без графика
      const objKey = actualObjectiveKeys[0];
      const bestValue = processedData[0][objKey];
      
      // Извлекаем метаданные для отображения единиц
      const metadata1D = processedData[0]?.metadata || (apiResponse?.numerical_results?.result?.metadata);
      const objectiveInfo = metadata1D?.objectives?.find(obj => obj.key === objKey);
      const displayName = objectiveInfo ? 
        (objectiveInfo.unit ? `${objectiveInfo.name} (${objectiveInfo.unit})` : objectiveInfo.name) :
        objKey.replace('objective', 'Objective ').replace('_', ' ');
      
      plotArea = (
        <div className="text-center p-8 bg-gray-800 rounded-lg">
          <h3 className="text-xl mb-4">Single Objective Optimization Result</h3>
          <div className="text-3xl font-bold text-green-400 mb-2">
            {typeof bestValue === 'number' ? bestValue.toFixed(4) : bestValue}
          </div>
          <div className="text-lg text-gray-300">
            {displayName}
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
      const metadata = processedData[0]?.metadata || (apiResponse?.numerical_results?.result?.metadata);
      // Формируем кастомные hovertext для каждой точки
      const hoverTexts = plotData.map((p, idx) => {
        const xVal = p[k1];
        const yVal = p[k2];
        // Извлекаем единицы из метаданных
        const xUnit = (metadata?.objectives?.find(obj => obj.key === k1)?.unit) || '';
        const yUnit = (metadata?.objectives?.find(obj => obj.key === k2)?.unit) || '';
        // Тип решения
        const type = p.type ? `<b>${p.type}</b><br/>` : '';
        return `${type}${getAxisLabel(k1, metadata)}: <b>${xVal}</b> ${xUnit}<br/>${getAxisLabel(k2, metadata)}: <b>${yVal}</b> ${yUnit}`;
      });
      plotArea = (
        <Plot
            data={[{
                x: plotData.map(p => p[k1]),
                y: plotData.map(p => p[k2]),
                mode: 'markers+lines',
                type: 'scatter',
                marker: { 
                  size: 10, 
                  color: '#FFAA00',
                  line: { color: '#fff', width: 1 }
                },
                line: { 
                  color: '#FFAA00',
                  width: 2
                },
                text: hoverTexts,
                hoverinfo: 'text',
                hoverlabel: { bgcolor: '#222', bordercolor: '#FFAA00', font: { color: '#fff' } },
            }]}
            layout={{
              title: {
                text: 'Pareto Front Visualization (2D)',
                font: { size: 18, color: '#fff', weight: 'bold' },
                x: 0.5,
                xanchor: 'center'
              },
              xaxis: {
                title: getAxisLabel(k1, metadata),
                color: '#fff',
                gridcolor: '#666',
                gridwidth: 1,
                linecolor: '#fff',
                linewidth: 2,
                tickformat: '',
                tickvals: plotData.map(p => p[k1]),
                ticktext: plotData.map(p => formatNumber(p[k1])),
                titlefont: { size: 14, color: '#fff', weight: 'bold' },
                tickfont: { size: 12, color: '#fff' },
                tickmode: 'array',
                tickangle: 0,
                tickpadding: 8,
              },
              yaxis: {
                title: {
                  text: getAxisLabel(k2, metadata),
                  standoff: 30 // увеличенный отступ для подписи оси Y
                },
                color: '#fff',
                gridcolor: '#666',
                gridwidth: 1,
                linecolor: '#fff',
                linewidth: 2,
                tickformat: '',
                tickvals: plotData.map(p => p[k2]),
                ticktext: plotData.map(p => formatNumber(p[k2])),
                titlefont: { size: 14, color: '#fff', weight: 'bold' },
                tickfont: { size: 12, color: '#fff' },
                tickmode: 'array',
                tickangle: 0,
                tickpadding: 8,
              },
              paper_bgcolor: '#0e1117',
              font: { color: '#fff' },
              height: 500,
              autosize: true,
              margin: { l: 100, r: 20, t: 60, b: 60 }, // увеличенный левый отступ
            }}
            style={{ width: '100%', height: '50vh' }}
            config={{ responsive: true }}
        />
      );
    } else if (actualNObjectives === 3) {
      // Для 3D задач показываем 3D график - используем только первые 5 точек
      const [k1, k2, k3] = actualObjectiveKeys;
      const plotData = processedData.slice(0, 5); // Ограничиваем до 5 точек как в таблице
      
      // Извлекаем метаданные для 3D графика
      const metadata3D = processedData[0]?.metadata || (apiResponse?.numerical_results?.result?.metadata);
      
      plotArea = (
        <Plot
            data={[{ 
                x: plotData.map(p => p[k1]), 
                y: plotData.map(p => p[k2]), 
                z: plotData.map(p => p[k3]), 
                mode: 'markers', 
                type: 'scatter3d', 
                marker: { 
                  size: 8, 
                  color: '#FFAA00',
                  line: { color: '#fff', width: 1 }
                } 
            }]}
            layout={{
              title: {
                text: 'Pareto Front Visualization (3D)',
                font: { size: 18, color: '#fff', weight: 'bold' },
                x: 0.5,
                xanchor: 'center'
              },
              scene: {
                xaxis: { 
                  title: getAxisLabel(k1, metadata3D), 
                  color: '#fff', 
                  gridcolor: '#666',
                  gridwidth: 1,
                  linecolor: '#fff',
                  linewidth: 2,
                  titlefont: { size: 14, color: '#fff', weight: 'bold' },
                  tickfont: { size: 12, color: '#fff' }
                },
                yaxis: { 
                  title: getAxisLabel(k2, metadata3D), 
                  color: '#fff', 
                  gridcolor: '#666',
                  gridwidth: 1,
                  linecolor: '#fff',
                  linewidth: 2,
                  titlefont: { size: 14, color: '#fff', weight: 'bold' },
                  tickfont: { size: 12, color: '#fff' }
                },
                zaxis: { 
                  title: getAxisLabel(k3, metadata3D), 
                  color: '#fff', 
                  gridcolor: '#666',
                  gridwidth: 1,
                  linecolor: '#fff',
                  linewidth: 2,
                  titlefont: { size: 14, color: '#fff', weight: 'bold' },
                  tickfont: { size: 12, color: '#fff' }
                },
              },
              paper_bgcolor: '#0e1117',
              font: { color: '#fff' },
              height: 600,
              autosize: true,
              margin: { l: 60, r: 20, t: 60, b: 60 },
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
    
    // Извлекаем метаданные для таблицы
    const tableMetadata = processedData[0]?.metadata || (apiResponse?.numerical_results?.result?.metadata);
    
    return (
      <>
        {plotArea}
        <div className="mt-6 overflow-x-auto">
          <h3 className="text-lg mb-2">Top 5 Solutions</h3>
          <table className="min-w-full bg-gray-800 text-white rounded">
            <thead>
              <tr>{Object.keys(top5[0] || {}).map(col => (
                <th key={col} className="px-4 py-2 border-gray-700 border-b text-left">
                  {getDisplayName(col, tableMetadata)}
                </th>
              ))}</tr>
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
