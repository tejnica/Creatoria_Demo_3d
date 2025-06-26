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
  const [resultData, setResultData] = useState([]);
  const [explanations, setExplanations] = useState(null); // Краткое объяснение для Шага 3
  const [fullAnalysisData, setFullAnalysisData] = useState(null); // Полный отчет для Шага 4
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  function extractDescriptions(item) {
    if (typeof item === 'string') return item;
    if (Array.isArray(item)) return item.map(extractDescriptions).join('; ');
    if (item && typeof item === 'object') {
      if (item.description) return item.description;
      return Object.values(item).map(extractDescriptions).join('; ');
    }
    return String(item);
  }

  const handleGenerateYaml = async () => {
    if (!description.trim()) return alert('Enter a description');
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

  // --- ОБНОВЛЕННАЯ ЛОГИКА ---
  const runOptimization = () => {
    setRunning(true);
    setProgress(0);
    const interval = setInterval(() => setProgress(p => Math.min(100, p + 20)), 300);
    
    // В "живом" режиме мы передаем `description`, а не `goals` и `constraints`
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

        setResultData(res.pareto);
        // Сохраняем краткое объяснение для Шага 3
        setExplanations(res.explanations);
        // Сохраняем ПОЛНЫЙ отчет для Шага 4
        setFullAnalysisData(res.full_analysis);
        setStep(3);
      })
      .catch(err => {
        clearInterval(interval);
        setRunning(false);
        alert('Optimization error: ' + err.message);
      });
  };

  // --- ОБНОВЛЕННАЯ ЛОГИКА ---
  const handleFullAnalysis = () => {
    // Больше не делаем новый API-запрос!
    // Просто переключаем шаг, чтобы показать уже загруженные данные.
    if (fullAnalysisData) {
        setStep(4);
    } else {
        alert("Full analysis data is not available.");
    }
  };

  const hasResults = Array.isArray(resultData) && resultData.length > 0;

  const renderResults = () => {
    if (!hasResults) return null;
    const numericKeys = Object.keys(resultData[0]).filter(k => typeof resultData[0][k] === 'number');
    const top5 = resultData.slice(0, 5);
    let plotArea = null;

    if (numericKeys.length >= 3) {
      const [k1, k2, k3] = numericKeys;
      plotArea = (
        <Plot
            data={[{ 
                x: resultData.map(p => p[k1]), 
                y: resultData.map(p => p[k2]), 
                z: resultData.map(p => p[k3]), 
                mode: 'markers', 
                type: 'scatter3d', 
                marker: { size: 6, color: '#FFAA00' } 
            }]}
            layout={{
              scene: {
                xaxis: { title: k1, color: '#fff', gridcolor: '#444' },
                yaxis: { title: k2, color: '#fff', gridcolor: '#444' },
                zaxis: { title: k3, color: '#fff', gridcolor: '#444' },
              },
              paper_bgcolor: '#0e1117',
              font: { color: '#fff' },
              height: 600,
              autosize: true,
              margin: { l: 10, r: 10, t: 10, b: 10 },
            }}
            style={{ width: '100%', height: '60vh' }}
            config={{ responsive: true }}
        />
      );
    } else {
        // ... (ваш код для 1D и 2D графиков остается без изменений) ...
    }

    return (
      <>
        {plotArea}
        <div className="mt-6 overflow-x-auto">
          <h3 className="text-lg mb-2">Top 5 Pareto Solutions</h3>
          <table className="min-w-full bg-gray-800 text-white rounded">
            {/* ... (ваш код для таблицы остается без изменений) ... */}
          </table>
        </div>
      </>
    );
  };
  
  // ... (остальной JSX-код вашего компонента остается без изменений) ...
  return (
    <div className="min-h-screen bg-[#0e1117] text-white p-6 mx-auto">
        {/* ... Header ... */}
        {/* ... Stepper ... */}
        {/* ... Шаги 1 и 2 ... */}
        
        {/* Шаг 3: Results + краткий анализ */}
        {step === 3 && (
            <div className="bg-gray-700 rounded-lg shadow-lg p-6 my-6 max-w-4xl w-full mx-auto">
                {/* ... кнопка Back и заголовок ... */}
                {renderResults()}
                {explanations?.summary && (
                    <div className="bg-gray-800 rounded-lg p-6 mt-8 shadow-lg max-w-2xl mx-auto">
                        <h3 className="text-lg font-semibold mb-2">AI Data Summary:</h3>
                        <p className="text-gray-200">{explanations.summary}</p>
                    </div>
                )}
                <div className="flex justify-end mt-6">
                    <button onClick={handleFullAnalysis} className="bg-[#FFAA00] text-black px-4 py-2 rounded hover:bg-yellow-500">
                        Full Analysis
                    </button>
                </div>
            </div>
        )}

        {/* Шаг 4: Full AI Analysis */}
        {step === 4 && (
            <div className="bg-gray-700 rounded-lg shadow-lg p-6 my-6 max-w-4xl w-full mx-auto">
                {/* ... кнопка Back и заголовок ... */}
                {fullAnalysisData && (
                    <div className="bg-gray-800 rounded-lg p-6 mt-8 shadow-lg max-w-2xl mx-auto text-left">
                        <h3 className="text-lg font-semibold mb-2">Full AI Data Analysis:</h3>
                        {/* Используем pre-wrap для сохранения форматирования Markdown */}
                        <pre className="text-gray-200 whitespace-pre-wrap font-sans">{fullAnalysisData.trends}</pre>
                    </div>
                )}
            </div>
        )}
    </div>
  );
}
