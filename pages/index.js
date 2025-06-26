import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import demoTasks from '../src/demoTasks.json';
import Stepper from '../src/components/Stepper';

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

  // ... (функции extractDescriptions, handleGenerateYaml, handleSelectDemo без изменений) ...
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
    setStep(2);
  };

  const runOptimization = () => {
    setRunning(true);
    setProgress(0);
    const interval = setInterval(() => setProgress(p => Math.min(100, p + 20)), 300);
    
    // В "живом" режиме мы передаем `description`
    const payload = taskKey ? { taskKey } : { description };

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
    // Извлекаем данные из сохраненного ответа
    const numericalData = apiResponse?.numerical_results;
    if (!numericalData || numericalData.error) {
      return <p className="text-center text-yellow-400">Результаты вычислений недоступны.</p>;
    }

    const { best_for_objective_1, best_for_objective_2, balanced_solution } = numericalData;
    if (!best_for_objective_1 || !best_for_objective_2 || !balanced_solution) {
      return <p className="text-center">Получен неполный набор данных.</p>;
    }
    
    // Готовим данные для 3D-графика и таблицы
    const plotData = [
      { mass: best_for_objective_1[0], stiffness: best_for_objective_1[1], cost: 110, front: "Min Mass" },
      { mass: best_for_objective_2[0], stiffness: best_for_objective_2[1], cost: 120, front: "Max Stiffness" },
      { mass: balanced_solution[0], stiffness: balanced_solution[1], cost: 100, front: "Balanced" }
    ];
    
    const top5 = plotData; // Для MVP покажем все 3 точки
    const plotArea = (
      <Plot
        data={[{ 
            x: plotData.map(p => p.stiffness), 
            y: plotData.map(p => p.mass), 
            z: plotData.map(p => p.cost), 
            mode: 'markers', 
            type: 'scatter3d', 
            marker: { size: 8, color: ['#FF6347', '#4682B4', '#32CD32'], symbol: 'diamond' },
            text: plotData.map(p => p.front),
            hoverinfo: 'text+x+y+z'
        }]}
        layout={{
          title: 'Ключевые решения на фронте Парето',
          scene: {
            xaxis: { title: 'Stiffness (Прочность)', color: '#fff', gridcolor: '#444' },
            yaxis: { title: 'Mass (Масса)', color: '#fff', gridcolor: '#444' },
            zaxis: { title: 'Cost (Стоимость, условно)', color: '#fff', gridcolor: '#444' },
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

    return (
      <>
        {plotArea}
        <div className="mt-6 overflow-x-auto">
          <h3 className="text-lg mb-2">Top Pareto Solutions</h3>
          <table className="min-w-full bg-gray-800 text-white rounded">
            <thead>
              <tr>{Object.keys(top5[0]).map(col => <th key={col} className="px-4 py-2 border-gray-700 border-b text-left">{col}</th>)}</tr>
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
      
      <Stepper step={step} steps={['Step 1', 'Step 2', 'Step 3', 'Step 4']} />

      <div className="pl-4">
        {step === 1 && ( /* ... ваш код для Шага 1 ... */ <div/> )}
        {yamlText && step >= 2 && ( /* ... ваш код для YAML ... */ <div/> )}
        {step === 2 && ( /* ... ваш код для Шага 2 ... */ <div/> )}

        {step === 3 && (
            <div className="bg-gray-700 rounded-lg shadow-lg p-6 my-6 max-w-4xl w-full mx-auto">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setStep(2)} className="bg-[#FFAA00] text-black px-4 py-2 rounded hover:bg-yellow-500 mr-4">← Back</button>
                <h2 className="text-xl">Step 3: Results</h2>
                <span className="ml-2">📊</span>
              </div>
              {renderResults()}
              {apiResponse?.human_readable_report && (
                  <div className="bg-gray-800 rounded-lg p-6 mt-8 shadow-lg max-w-2xl mx-auto">
                      <h3 className="text-lg font-semibold mb-2">AI Data Summary:</h3>
                      <p className="text-gray-200">{apiResponse.human_readable_report.match(/#\s*Резюме\s*([\s\S]*?)\n\n##/)?.[1]?.trim() || "Краткое саммари недоступно."}</p>
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
                  <h2 className="text-xl">Full AI Data Analysis</h2>
                  <span className="ml-2">🧠</span>
              </div>
              {apiResponse?.human_readable_report && (
                  <div className="bg-gray-800 rounded-lg p-6 mt-8 shadow-lg max-w-2xl mx-auto text-left">
                      <h3 className="text-lg font-semibold mb-2">Full AI Data Analysis:</h3>
                      <pre className="text-gray-200 whitespace-pre-wrap font-sans">{apiResponse.human_readable_report}</pre>
                  </div>
              )}
            </div>
        )}
      </div>
    </div>
  );
}
