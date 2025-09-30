import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import demoTasks from '../src/demoTasks.json';
import Stepper from '../src/components/Stepper';
import ClarifierDialog from '../src/components/ClarifierDialog';
import { generateYaml, runOptimization, answerClarification } from '../src/api/solver';
import { marked } from 'marked';
import ResultViewer from '../src/components/ResultViewer';
import ErrorBoundary from '../src/components/ErrorBoundary';
import { useToast, ToastContainer } from '../src/components/Toast';
import ThemeToggle from '../src/components/ThemeToggle';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function CreatoriaWizard() {
  const [step, setStep] = useState(1);
  const [taskKey, setTaskKey] = useState('');
  const [description, setDescription] = useState('');
  const [yamlText, setYamlText] = useState('');
  const [goalVariables, setGoalVariables] = useState([]);
  const [constraints, setConstraints] = useState([]);
  
  // Clarification state
  const [clarificationOpen, setClarificationOpen] = useState(false);
  const [clarificationRequest, setClarificationRequest] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [clarificationLoading, setClarificationLoading] = useState(false);
  // Дополнительные состояния для Clarifier-loop
  const [clarAnswer, setClarAnswer] = useState('');
  const [statusMap, setStatusMap] = useState({});
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  
  // API response state
  const [apiResponse, setApiResponse] = useState(null); 
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  // Toast notifications
  const { toasts, addToast, removeToast } = useToast();

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
      // Step 1: Generate initial YAML
      const result = await generateYaml(description);
      
      // Check if clarification is needed
      if (result.warnings && result.warnings.length > 0) {
        // Start clarification loop
        const clarificationResult = await answerClarification({}, []);
        if (clarificationResult.need_clarification) {
          setClarificationRequest(clarificationResult.clarification_request);
          // Инициализация карты статусов на основе ordered_missing
          if (clarificationResult.clarification_request?.ordered_missing) {
            const initialStatusMap = {};
            clarificationResult.clarification_request.ordered_missing.forEach(field => {
              // Маппинг статусов Backend → Frontend для отображения
              let frontendStatus = field.status;
              if (field.status === 'active') frontendStatus = 'missing'; // Активное поле отображается как "missing"
              if (field.status === 'pending') frontendStatus = 'pending';
              initialStatusMap[field.id] = frontendStatus;
            });
            setStatusMap(initialStatusMap);
          }
          setAttemptsLeft(clarificationResult.clarification_request?.attempts_left ?? 3);
          setClarificationOpen(true);
          setConversationHistory([]);
          setRunning(false);
          return;
        }
      }
      
      // No clarification needed, proceed
      setYamlText(JSON.stringify(result.solver_input, null, 2));
      setGoalVariables((result.solver_input?.objectives || []).map(extractDescriptions));
      setConstraints((result.solver_input?.constraints || []).map(extractDescriptions));
      setStep(2);
      
    } catch (err) {
      addToast(`YAML generation failed: ${err.message}`, 'error');
    } finally {
      setRunning(false);
    }
  };

  const handleClarificationSubmit = async (userAnswer) => {
    setClarificationLoading(true);
    try {
      // Определяем текущее активное поле (current_field из clarification_request)
      const currentFieldId = clarificationRequest?.current_field || 
                           clarificationRequest?.ordered_missing?.find(f => f.status === 'active')?.id;
      
      const result = await answerClarification(
        currentFieldId,
        userAnswer,
        conversationHistory
      );

      // Обновляем историю диалога с более детальными сообщениями
      const assistantMessage = result.accepted 
        ? '✅ Answer accepted. Moving to next field.'
        : result.auto_default 
          ? `❌ Max attempts reached (3/3). Using default: ${result.default_value}. Moving to next field.`
          : `❌ Answer rejected (${result.attempts}/3): ${result.reason}. Please try again.`;

      const newHistory = [
        ...conversationHistory,
        { role: 'user', content: userAnswer },
        { role: 'assistant', content: assistantMessage }
      ];
      setConversationHistory(newHistory);

      // Обновляем статус полей на основе новой clarification_request
      if (result.clarification_request?.ordered_missing) {
        const newStatusMap = {};
        result.clarification_request.ordered_missing.forEach(field => {
          // Маппинг статусов Backend → Frontend
          let frontendStatus = field.status;
          if (field.status === 'active') frontendStatus = 'missing'; // Активное поле отображается как "missing"
          if (field.status === 'pending') frontendStatus = 'pending';
          if (field.status === 'resolved') frontendStatus = 'resolved';
          if (field.status === 'conflict') frontendStatus = 'conflict';
          if (field.status === 'default') frontendStatus = 'default';
          
          newStatusMap[field.id] = frontendStatus;
        });
        setStatusMap(newStatusMap);
      }

      // Обновляем счетчик попыток
      if (result.clarification_request) {
        setClarificationRequest(result.clarification_request);
        setAttemptsLeft(result.clarification_request?.attempts_left ?? 3);
      }

      // Завершение цикла — получили solver_input
      if (result.solver_input) {
        setClarificationOpen(false);
        setYamlText(JSON.stringify(result.solver_input, null, 2));
        setGoalVariables((result.solver_input?.objectives || []).map(extractDescriptions));
        setConstraints((result.solver_input?.constraints || []).map(extractDescriptions));
        setStep(2);
        addToast('✅ All clarifications completed! Configuration ready.', 'success');
      }

    } catch (err) {
      addToast(`Clarification failed: ${err.message}`, 'error');
    } finally {
      setClarificationLoading(false);
    }
  };

  // Отправка ответа из модального окна Clarifier
  const handleClarificationSend = () => {
    if (!clarAnswer.trim()) return;
    handleClarificationSubmit(clarAnswer.trim());
    setClarAnswer('');
  };

  const handleSelectDemo = () => {
    if (!taskKey) return;
    const demo = demoTasks[taskKey];
    setDescription(demo.description);
    setYamlText(`goals:\n  - ${demo.goals.join('\n  - ')}\n\nconstraints:\n  - ${demo.constraints.join('\n  - ')}`);
    setGoalVariables(demo.goals);
    setConstraints(demo.constraints);
    setApiResponse(demo);
    setStep(2);
  };

  const runOptimizationStep = async () => {
    setRunning(true);
    setProgress(0);
    const interval = setInterval(() => setProgress(p => Math.min(100, p + 20)), 300);
    
    try {
      if (taskKey) {
        // Demo mode
        clearInterval(interval);
        setRunning(false);
        setProgress(100);
        setStep(3);
        return;
      }

      // Real optimization
      const solverInput = JSON.parse(yamlText);
      const result = await runOptimization({
        problem_ir: {
          task_id: `task_${Date.now()}`,
          ...solverInput
        },
        generate_report: true,
        save_artifacts: false
      });
      
      clearInterval(interval);
      setApiResponse(result);
      setProgress(100);
      setStep(3);
      
    } catch (err) {
      clearInterval(interval);
      addToast(`Optimization failed: ${err.message}`, 'error');
    } finally {
      setRunning(false);
    }
  };

  // Rest of the component remains the same...
  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Creatoria Optimization Wizard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">Step {step} of 3</div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Stepper currentStep={step} />
        
        {/* Step 1: Problem Description */}
        {step === 1 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
            <h2 className="text-lg font-semibold mb-4">Describe Your Optimization Problem</h2>
            
            {/* Demo Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Start (Optional)
              </label>
              <select 
                value={taskKey} 
                onChange={(e) => setTaskKey(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a demo task...</option>
                {Object.entries(demoTasks).map(([key, task]) => (
                  <option key={key} value={key}>{task.title}</option>
                ))}
              </select>
              {taskKey && (
                <button 
                  onClick={handleSelectDemo}
                  className="mt-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                >
                  Load Demo Task
                </button>
              )}
            </div>

            <div className="border-t pt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or describe your own problem
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you want to optimize..."
                className="w-full h-32 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleGenerateYaml}
                disabled={running || !description.trim()}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {running ? 'Processing...' : 'Generate Configuration'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Review Configuration */}
        {step === 2 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
            <h2 className="text-lg font-semibold mb-4">Review Generated Configuration</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-2">Configuration YAML</h3>
                <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto h-64 border">
                  {yamlText}
                </pre>
              </div>
              
              <div>
                <div className="mb-4">
                  <h3 className="font-medium mb-2">Goals ({goalVariables.length})</h3>
                  <ul className="bg-gray-50 p-3 rounded text-sm h-24 overflow-auto border">
                    {goalVariables.map((goal, i) => (
                      <li key={i} className="mb-1">• {goal}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Constraints ({constraints.length})</h3>
                  <ul className="bg-gray-50 p-3 rounded text-sm h-24 overflow-auto border">
                    {constraints.map((constraint, i) => (
                      <li key={i} className="mb-1">• {constraint}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => setStep(1)}
                className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600 transition-colors"
              >
                Back
              </button>
              <button
                onClick={runOptimizationStep}
                disabled={running}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {running ? `Running... ${progress}%` : 'Run Optimization'}
              </button>
            </div>
            
            {running && (
              <div className="mt-4">
                <div className="bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Results */}
        {step === 3 && apiResponse && (
          <div className="mt-6">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Optimization Results</h2>
            </div>
            
            <ResultViewer result={apiResponse} />
 
            <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
              <div className="flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    setStep(1);
                    setApiResponse(null);
                    setDescription('');
                    setYamlText('');
                    setGoalVariables([]);
                    setConstraints([]);
                    setTaskKey('');
                  }}
                  className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors"
                >
                  Start New Optimization
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Clarification Dialog */}
      <ClarifierDialog
        open={clarificationOpen}
        request={clarificationRequest}
        history={conversationHistory}
        statusMap={statusMap}
        attemptsLeft={attemptsLeft}
        answer={clarAnswer}
        setAnswer={setClarAnswer}
        onSend={handleClarificationSend}
        loading={clarificationLoading}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
    </ErrorBoundary>
  );
} 