// src/App.js
import React, { useState } from 'react';
import Plot from 'react-plotly.js';
import logo from './logo_creatoria.png';
import demoTasks from './demoTasks.json';
import Stepper from './components/Stepper';

export default function CreatoriaWizard() {
  const [step, setStep] = useState(1);
  const [taskKey, setTaskKey] = useState('');
  const [description, setDescription] = useState('');
  const [yamlText, setYamlText] = useState('');
  const [goalVariables, setGoalVariables] = useState([]);
  const [constraints, setConstraints] = useState([]);
  const [resultData, setResultData] = useState([]);
  const [explanations, setExplanations] = useState([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  // Normalize YAML items to strings
  function extractDescriptions(item) {
    if (typeof item === 'string') return item;
    if (Array.isArray(item)) return item.map(extractDescriptions).join('; ');
    if (item && typeof item === 'object') {
      if (item.description) return item.description;
      return Object.values(item).map(extractDescriptions).join('; ');
    }
    return String(item);
  }

 

  // Step 1: Generate YAML from description
  const handleGenerateYaml = async () => {
    if (!description.trim()) return alert('Enter a description');
    try {
      const res = await fetch('/api/generate-yaml', {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setYamlText(json.yaml);
      setGoalVariables((json.data.goals || []).map(extractDescriptions));
      setConstraints((json.data.constraints || []).map(extractDescriptions));
      setStep(2);
    } catch (err) {
      alert('YAML error: ' + err.message);
    }
  };

  // Step 1 (demo): select demo and go to config
  const handleSelectDemo = () => {
    if (!taskKey) return;
    const demo = demoTasks[taskKey];
    setDescription(demo.description);
    setYamlText(
      `goals:\n  - ${demo.goals.join('\n  - ')}\n\nconstraints:\n  - ${demo.constraints.join('\n  - ')}`
    );
    setGoalVariables(demo.goals);
    setConstraints(demo.constraints);
    setStep(2);
  };

  // Step 2: Run optimization (demo or live)
  const runOptimization = () => {
    setRunning(true);
    setProgress(0);
    const interval = setInterval(() => setProgress(p => Math.min(100, p + 20)), 300);
    const payload = taskKey
      ? { taskKey }
      : { goals: goalVariables, constraints };

    fetch('/api/run-opt', {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(r => r.json())
      .then(res => {
        clearInterval(interval);
        setRunning(false);
        setProgress(100);
        setResultData(res.pareto);
        setExplanations(res.explanations);
        setStep(4);
      })
      .catch(err => {
        clearInterval(interval);
        setRunning(false);
        alert('Optimization error: ' + err.message);
      });
  };

  const hasResults = Array.isArray(resultData) && resultData.length > 0;

  // Render results (1D,2D,3D + table)
  const renderResults = () => {
    if (!hasResults) return null;
    const numericKeys = Object.keys(resultData[0]).filter(k => typeof resultData[0][k] === 'number');
    const top5 = resultData.slice(0, 5);
    let plotArea = null;

    if (numericKeys.length === 1) {
      const k = numericKeys[0];
      plotArea = (
        <Plot
          data={[{ x: top5.map((_, i) => i + 1), y: top5.map(p => p[k]), type: 'bar', marker: { color: '#FFAA00' } }]}
          layout={{ title: k, paper_bgcolor: '#0e1117', plot_bgcolor: '#0e1117', font: { color: '#fff' } }}
          style={{ width: '100%', height: '40vh' }}
          config={{ responsive: true }}
        />
      );
    } else if (numericKeys.length === 2) {
      const [k1, k2] = numericKeys;
      plotArea = (
        <Plot
          data={[{ x: resultData.map(p => p[k1]), y: resultData.map(p => p[k2]), mode: 'markers', type: 'scatter', marker: { color: '#FFAA00' } }]}
          layout={{ xaxis: { title: k1, color: '#fff' }, yaxis: { title: k2, color: '#fff' }, paper_bgcolor: '#0e1117', plot_bgcolor: '#0e1117', font: { color: '#fff' } }}
          style={{ width: '100%', height: '40vh' }}
          config={{ responsive: true }}
        />
      );
    } else {
      const [k1, k2, k3] = numericKeys.slice(0, 3);
      plotArea = (
        <Plot
          data={[{ x: resultData.map(p => p[k1]), y: resultData.map(p => p[k2]), z: resultData.map(p => p[k3]), mode: 'markers', type: 'scatter3d', marker: { size: 6, color: '#FFAA00' } }]}
          layout={{ scene: { xaxis: { title: k1, color: '#fff', gridcolor: '#444' }, yaxis: { title: k2, color: '#fff', gridcolor: '#444' }, zaxis: { title: k3, color: '#fff', gridcolor: '#444' } }, paper_bgcolor: '#0e1117', plot_bgcolor: '#0e1117', font: { color: '#fff' }, height: 600 }}
          style={{ width: '100%', height: '60vh' }}
          config={{ responsive: true }}
        />
      );
    }

    return (
      <>
        {plotArea}
        <div className="mt-6 overflow-x-auto">
          <h3 className="text-lg mb-2">Top 5 Pareto Solutions</h3>
          <table className="min-w-full bg-gray-800 text-white rounded">
            <thead>
              <tr>{Object.keys(top5[0]).map(col => <th key={col} className="px-4 py-2 border-gray-700 border-b text-left">{col}</th>)}</tr>
            </thead>
            <tbody>
              {top5.map((row, i) => (
                <tr key={i} className={i % 2 ? 'bg-gray-700' : 'bg-gray-600'}>
                  {Object.keys(row).map(col => <td key={col} className="px-4 py-2 border-gray-700 border-b">{row[col]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-[#0e1117] text-white p-6 mx-auto">
      <header className="flex flex-col items-center mb-8 mt-4">
        <div className="flex items-center">
          <img src={logo} alt="Logo" className="h-10 mr-4" />
          <div>
            <h1 className="text-3xl font-semibold">Creatoria Demo</h1>
            <p className="text-base">Smart assistant for invention and optimization</p>
          </div>
        </div>
      </header>

      <Stepper
      step={step}
      steps={['Step 1', 'Step 2', 'Step 3', 'Step 4']}
    />

      {/* Steps container with indent */}
      <div className="pl-4">
        {/* Step 1 */}
        {step === 1 && (
          <div className="flex justify-center">
            <div className="bg-gray-700 rounded-lg shadow-lg p-6 my-6 max-w-xl w-full">
              <div className="flex items-center justify-center mb-4">
                <h2 className="text-xl">Step 1: Describe your problem or select demo</h2>
                <span className="ml-2">🖉</span>
              </div>
              <div className="space-y-4">
                <select
                  className="w-full bg-gray-800 p-2 rounded"
                  value={taskKey}
                  onChange={e => setTaskKey(e.target.value)}
                >
                  <option value="">-- Select Demo or Custom --</option>
                  {Object.entries(demoTasks).map(([key, val]) => (
                    <option key={key} value={key}>{val.description.substring(0, 50) + '...'}</option>
                  ))}
                </select>
                {!taskKey ? (
                  <>
                    <textarea
                      rows={4}
                      className="w-full bg-gray-800 p-3 rounded"
                      placeholder="Enter problem description"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                    />
                    <button
                      onClick={handleGenerateYaml}
                      className="bg-orange-500 px-4 py-2 rounded hover:bg-orange-600"
                    >
                      Generate YAML
                    </button>
                  </>
                ) : (
                  <>
                    <p className="w-full bg-gray-900 p-3 rounded">
                      {demoTasks[taskKey].description}
                    </p>
                    <button
                      onClick={handleSelectDemo}
                      className="bg-blue-500 px-4 py-2 rounded hover:bg-blue-600"
                    >
                      Next →
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Display generated YAML */}
        {yamlText && step >= 2 && (
          <div className="flex justify-center my-8">
            <pre className="bg-gray-900 p-6 rounded-xl shadow-lg max-w-2xl w-full text-white text-md whitespace-pre-wrap">{yamlText}</pre>
          </div>
        )}

        {/* Step 2: Configure Goals & Constraints */}
        {step === 2 && (
          <div className="flex justify-center">
            <div className="bg-gray-700 rounded-lg shadow-lg p-6 my-6 max-w-xl w-full">
              <div className="flex items-center justify-center mb-4">
                <h2 className="text-xl">Step 2: Configure Goals & Constraints</h2>
                <span className="ml-2">⚙️</span>
              </div>
              <div className="mb-4">
                <h3 className="font-medium mb-2">Goals</h3>
                {goalVariables.map((g, i) => (
                  <input key={i} type="text" className="w-full p-3 mb-3 bg-gray-800 rounded" value={g} onChange={e => { const a=[...goalVariables]; a[i]=e.target.value; setGoalVariables(a); }} />
                ))}
              </div>
              <div className="mb-4">
                <h3 className="font-medium mb-2">Constraints</h3>
                {constraints.map((c, i) => (
                  <input key={i} type="text" className="w-full p-3 mb-3 bg-gray-800 rounded" value={c} onChange={e => { const a=[...constraints]; a[i]=e.target.value; setConstraints(a); }} />
                ))}
              </div>
              <div className="flex space-x-2">
                <button onClick={() => setStep(1)} className="bg-gray-700 px-4 py-2 rounded hover:bg-gray-600">← Back</button>
                <button onClick={runOptimization} disabled={running} className="bg-green-600 px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50">{running ? 'Running…' : 'Run Optimization →'}</button>
              </div>
              {running && (
                <div className="mt-2 w-full bg-gray-700 h-4 rounded overflow-hidden">
                  <div className="bg-green-400 h-full transition-all duration-200" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Results */}
        {step === 4 && (
          <div className="flex justify-center">
            <div className="bg-gray-700 rounded-lg shadow-lg p-6 my-6 max-w-xl w-full">
              <div className="flex items-center justify-center mb-4">
                <h2 className="text-xl">Step 4: Explore Results</h2>
                <span className="ml-2">📈</span>
              </div>
              {renderResults()}
              <div className="mt-6">
                <h3 className="text-lg mb-2">AI Explanations</h3>
                {explanations.map((e, i) => <p key={i} className="mb-2">• {e}</p>)}
              </div>
              <button onClick={() => setStep(2)} className="mt-4 bg-gray-700 px-4 py-2 rounded hover:bg-gray-600">← Back to Config</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}