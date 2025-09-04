import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import demoTasks from '../src/demoTasks.json';
import Stepper from '../src/components/Stepper';
import ClarifierDialog from '../src/components/ClarifierDialog';
import TranslationReviewPanel from '../src/components/TranslationReviewPanel';
import { generateYaml, generateYamlEnhanced, runOptimization, startClarification, answerClarification, translateText, analyzeSemantics } from '../src/api/solver';
import { marked } from 'marked';
import ResultViewer from '../src/components/ResultViewer';
import ErrorBoundary from '../src/components/ErrorBoundary';
import { useToast, ToastContainer } from '../src/components/Toast';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function CreatoriaWizard() {
  const [step, setStep] = useState(1);
  const [taskKey, setTaskKey] = useState('');
  const [description, setDescription] = useState('');
  const [yamlText, setYamlText] = useState('');
  const [goalVariables, setGoalVariables] = useState([]);
  const [constraints, setConstraints] = useState([]);
  const [preparser, setPreparser] = useState(null);
  const [pendingClarification, setPendingClarification] = useState(false);
  
  // Clarification state
  const [clarificationOpen, setClarificationOpen] = useState(false);
  const [clarificationRequest, setClarificationRequest] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [clarificationLoading, setClarificationLoading] = useState(false);
  // Дополнительные состояния для Clarifier-loop
  const [clarAnswer, setClarAnswer] = useState('');
  const [statusMap, setStatusMap] = useState({});
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [sessionId, setSessionId] = useState(null);
  
  // API response state
  const [apiResponse, setApiResponse] = useState(null); 
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  // T16: Translation states
  const [showTranslationReview, setShowTranslationReview] = useState(false);
  const [translationData, setTranslationData] = useState(null);
  const [translationLoading, setTranslationLoading] = useState(false);

  // T16 Phase 2.3: Semantic Analysis states
  const [semanticAnalysis, setSemanticAnalysis] = useState(null);
  const [semanticLoading, setSemanticLoading] = useState(false);

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
    setTranslationLoading(true);
    
    try {
      // T16 Phase 1: First translate the text to English
      const translationResult = await translateText(description);
      
      // Store translation data for review
      setTranslationData(translationResult);
      
      // If text was already in English or translation confidence is high, show translation review
      if (translationResult.detected_language !== 'en' || translationResult.confidence < 0.95) {
        setShowTranslationReview(true);
        setRunning(false);
        setTranslationLoading(false);
        return;
      }
      
      // If English text with high confidence, proceed directly
      await proceedWithParsing(translationResult.translated_text);
      
    } catch (err) {
      addToast(`Translation failed: ${err.message}`, 'error');
      setRunning(false);
      setTranslationLoading(false);
    }
  };

  // T16: Function to proceed with parsing after translation confirmation
  const proceedWithParsing = async (finalText) => {
    setTranslationLoading(true);
    try {
      // Step 1: Generate initial YAML using the final (translated) text
      const result = await generateYaml(finalText);
      setPreparser(result?.debug_preparser || null);
      
      // Decide if clarification is needed
      const solverInput = result?.solver_input || {};
      const hasObjectives = Array.isArray(solverInput.objectives) && solverInput.objectives.length > 0;
      const hasVariables = Array.isArray(solverInput.variables) && solverInput.variables.length > 0;
      const needClar = (result?.warnings && result.warnings.length > 0) || !hasObjectives || !hasVariables;

      // Всегда сначала показываем Step 2
      setYamlText(JSON.stringify(solverInput, null, 2));
      const objList1 = Array.isArray(solverInput?.objectives)
        ? solverInput.objectives
        : (Array.isArray(solverInput?.objective)
            ? solverInput.objective
            : (solverInput?.objective ? [solverInput.objective] : []));
      setGoalVariables(objList1.map(extractDescriptions));
      setConstraints((solverInput?.constraints || []).map(extractDescriptions));
      setStep(2);

      setPendingClarification(!!needClar);
      setShowTranslationReview(false);
    } catch (err) {
      addToast(`YAML generation failed: ${err.message}`, 'error');
    } finally {
      setRunning(false);
      setTranslationLoading(false);
    }
  };

  // T16: Translation review handlers
  const handleTranslationConfirm = (editedText) => {
    proceedWithParsing(editedText);
  };

  const handleTranslationBack = () => {
    setShowTranslationReview(false);
    setTranslationData(null);
  };

  const handleTranslationTextChange = (newText) => {
    if (translationData) {
      setTranslationData({
        ...translationData,
        translated_text: newText
      });
    }
  };

  // T16 Phase 2.3: Semantic Analysis handlers
  const handleAnalyzeSemantics = async (text) => {
    setSemanticLoading(true);
    try {
      const result = await analyzeSemantics({
        text: text,
        language: translationData?.detected_language || 'en'
      });
      
      setSemanticAnalysis(result);
      
      if (result.success) {
        addToast('✅ Семантический анализ завершен успешно', 'success');
      } else {
        addToast('⚠️ Семантический анализ завершен с ошибками', 'warning');
      }
    } catch (error) {
      console.error('Semantic analysis error:', error);
      addToast(`Ошибка семантического анализа: ${error.message}`, 'error');
      setSemanticAnalysis({ success: false, error: error.message });
    } finally {
      setSemanticLoading(false);
    }
  };

  const handleUseSemanticResults = (analysisResult) => {
    // Используем enhanced generate-yaml с семантическими результатами
    proceedWithSemanticResults(analysisResult);
  };

  const proceedWithSemanticResults = async (analysisResult) => {
    try {
      // Используем enhanced API с session_id для засеивания ClarifierAgent
      const text = translationData?.translated_text || description;
      const enhancedResult = await generateYamlEnhanced({
        description: text,
        use_semantic_parser: true,
        session_id: analysisResult.session_id
      });

      // Обрабатываем результат
      if (enhancedResult.enhanced_by_semantic_parser) {
        addToast('✅ Используются результаты семантического анализа', 'success');
      }

      // Переходим к clarification с засеянной сессией
      setShowTranslationReview(false);
      setSessionId(enhancedResult.semantic_analysis?.session_id);
      
      // Запускаем clarification loop с засеянными данными
      const clarificationResult = await startClarification();
      if (clarificationResult.need_clarification) {
        const req = clarificationResult.clarification_request;
        setClarificationRequest(req);
        setStatusMap({});
        setConversationHistory([]);
        setClarificationOpen(true);
        setAttemptsLeft(req?.attempts_left ?? 3);
        
        if (req.session_id) {
          setSessionId(req.session_id);
        }
      } else {
        // Нет нужды в уточнениях - сразу переходим к Step 2
        setYamlText(JSON.stringify(clarificationResult.solver_input, null, 2));
        const objList = Array.isArray(clarificationResult.solver_input?.objectives)
          ? clarificationResult.solver_input.objectives
          : [];
        setGoalVariables(objList.map(extractDescriptions));
        setConstraints((clarificationResult.solver_input?.constraints || []).map(extractDescriptions));
        setStep(2);
      }
      
    } catch (error) {
      console.error('Enhanced processing error:', error);
      addToast(`Ошибка обработки: ${error.message}`, 'error');
      // Fallback to normal processing
      proceedWithParsing(translationData?.translated_text || description);
    }
  };

  const handleStartClarification = async () => {
    try {
      const clarificationResult = await startClarification();
      if (clarificationResult.need_clarification) {
        const req = clarificationResult.clarification_request;
        if (clarificationResult.session_id && !sessionId) {
          setSessionId(clarificationResult.session_id);
        }
        setClarificationRequest(req);
        // Инициализация карты статусов на основе ordered_missing
        if (req?.ordered_missing) {
          const initialStatusMap = {};
          req.ordered_missing.forEach(field => {
            let frontendStatus = field.status;
            if (field.status === 'active') frontendStatus = 'missing';
            if (field.status === 'pending') frontendStatus = 'pending';
            initialStatusMap[field.id] = frontendStatus;
          });
          setStatusMap(initialStatusMap);
        }
        setAttemptsLeft(req?.attempts_left ?? 3);
        setClarificationOpen(true);
        setConversationHistory([]);
      } else if (clarificationResult.solver_input) {
        // На случай если бэкенд вернул итог сразу
        const si = clarificationResult.solver_input;
        setYamlText(JSON.stringify(si, null, 2));
        const objList2 = Array.isArray(si?.objectives)
          ? si.objectives
          : (Array.isArray(si?.objective) ? si.objective : (si?.objective ? [si.objective] : []));
        setGoalVariables(objList2.map(extractDescriptions));
        setConstraints((si?.constraints || []).map(extractDescriptions));
        setPendingClarification(false);
      }
    } catch (err) {
      addToast(`Clarification failed: ${err.message}`, 'error');
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
        conversationHistory,
        sessionId || undefined
      );
      
      // UX toasts
      if (result.auto_default) {
        addToast(`Auto-default used for ${currentFieldId}: ${result.default_value}`, 'warning');
      } else if (result.accepted === false && result.reason) {
        addToast(`Answer rejected: ${result.reason}`, 'warning');
      }

      // Сохраняем session_id если бэкенд его вернёт (на случай будущего расширения)
      if (result.session_id && !sessionId) {
        setSessionId(result.session_id);
      }

      // Обновляем историю диалога с более детальными сообщениями
      let assistantMessage = '';
      if (result.accepted === true) {
        assistantMessage = '✅ Answer accepted. Moving to next field.';
      } else if (result.auto_default) {
        assistantMessage = `❌ Max attempts reached (3/3). Using default: ${result.default_value}. Moving to next field.`;
      } else if (result.clarification_request && typeof result.accepted === 'undefined') {
        assistantMessage = '→ Next field.'; // neutral transition, not a reject
      } else {
        const att = typeof result.attempts === 'number' ? result.attempts : '?';
        const reason = result.reason || 'Please try again.';
        assistantMessage = `❌ Answer rejected (${att}/3): ${reason}`;
      }

      const newHistory = [
        ...conversationHistory,
        { role: 'user', content: userAnswer },
        // добавляем ответ ассистента только если есть явное сообщение
        ...(assistantMessage ? [{ role: 'assistant', content: assistantMessage }] : [])
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
        const objList2 = Array.isArray(result.solver_input?.objectives)
          ? result.solver_input.objectives
          : (Array.isArray(result.solver_input?.objective)
              ? result.solver_input.objective
              : (result.solver_input?.objective ? [result.solver_input.objective] : []));
        setGoalVariables(objList2.map(extractDescriptions));
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

  // Pick field from table for editing
  const handlePickField = (fieldId) => {
    setClarAnswer('');
    setClarificationRequest(prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      updated.current_field = fieldId;
      if (Array.isArray(updated.ordered_missing)) {
        updated.ordered_missing = updated.ordered_missing.map((f) => ({
          ...f,
          status: f.id === fieldId
            ? 'active'
            : (f.status === 'resolved' || f.status === 'default' ? f.status : 'pending')
        }));
      }
      return updated;
    });
  };

  // Edit last answer (one-step undo)
  const handleEditLast = () => {
    const lastUser = [...conversationHistory].reverse().find(m => m.role === 'user');
    if (lastUser) setClarAnswer(lastUser.content);
    setClarificationRequest(prev => {
      if (!prev?.ordered_missing) return prev;
      const currentId = prev.current_field || prev.ordered_missing.find(f => f.status === 'active')?.id;
      const idx = prev.ordered_missing.findIndex(f => f.id === currentId);
      const prevIdx = idx > 0 ? idx - 1 : idx;
      const targetId = prev.ordered_missing[prevIdx]?.id;
      const updated = { ...prev, current_field: targetId };
      updated.ordered_missing = prev.ordered_missing.map((f,i) => ({
        ...f,
        status: i === prevIdx
          ? 'active'
          : (f.status === 'resolved' || f.status === 'default' ? f.status : 'pending')
      }));
      return updated;
    });
  };

  const handleSelectDemo = () => {
    if (!taskKey) return;
    const demo = demoTasks[taskKey];
    setDescription(demo.description);
    setYamlText(`goals\n  - ${demo.goals.join('\n  - ')}\n\nconstraints\n  - ${demo.constraints.join('\n  - ')}`);
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
          <div className="text-sm text-gray-500">Step {step} of 3</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Stepper step={step} steps={["Describe", "Review", "Results"]} />
        
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

        {/* T16: Translation Review Panel */}
        {showTranslationReview && translationData && (
          <div className="mt-6">
            <TranslationReviewPanel
              originalText={translationData.original_text}
              translatedText={translationData.translated_text}
              detectedLanguage={translationData.detected_language}
              confidence={translationData.confidence}
              onConfirm={handleTranslationConfirm}
              onBack={handleTranslationBack}
              onTextChange={handleTranslationTextChange}
              loading={translationLoading}
              // T16 Phase 2.3: Semantic Analysis props
              semanticAnalysis={semanticAnalysis}
              onAnalyzeSemantics={handleAnalyzeSemantics}
              onUseSemanticResults={handleUseSemanticResults}
              semanticLoading={semanticLoading}
              showSemanticAnalysis={true}
            />
          </div>
        )}

        {/* Step 2: Review Configuration */}
        {step === 2 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
            <h2 className="text-lg font-semibold mb-4">Review Generated Configuration</h2>

            {preparser && (
              <div className="mb-6 border rounded-md p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Pre‑parser details</h3>
                  <span className="text-xs text-gray-500">lang: {preparser.language}</span>
                </div>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-semibold mb-1">Goals (candidates)</div>
                    <ul className="bg-white border rounded p-2 max-h-20 overflow-auto">
                      {(preparser.goal_candidates || []).length > 0 ? 
                        preparser.goal_candidates.map((g, i) => <li key={i}>• {g}</li>) :
                        <li className="text-gray-400">No goals detected</li>
                      }
                    </ul>
                  </div>
                  <div>
                    <div className="font-semibold mb-1">Constraints (candidates)</div>
                    <ul className="bg-white border rounded p-2 max-h-20 overflow-auto">
                      {(preparser.constraint_candidates || []).length > 0 ? 
                        preparser.constraint_candidates.map((c, i) => <li key={i}>• {c}</li>) :
                        <li className="text-gray-400">No constraints detected</li>
                      }
                    </ul>
                  </div>
                  <div>
                    <div className="font-semibold mb-1">Ranges</div>
                    <ul className="bg-white border rounded p-2 max-h-20 overflow-auto">
                      {(preparser.range_candidates || []).length > 0 ? 
                        preparser.range_candidates.map((r, i) => <li key={i}>• {r}</li>) :
                        <li className="text-gray-400">No ranges detected</li>
                      }
                    </ul>
                  </div>
                  <div>
                    <div className="font-semibold mb-1">Units</div>
                    <ul className="bg-white border rounded p-2 max-h-20 overflow-auto">
                      {(preparser.unit_mentions || []).length > 0 ? 
                        preparser.unit_mentions.map((u, i) => <li key={i}>• {u}</li>) :
                        <li className="text-gray-400">No units detected</li>
                      }
                    </ul>
                  </div>
                </div>
              </div>
            )}
            
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
              <div className="flex gap-3">
                {pendingClarification && (
                  <button
                    onClick={handleStartClarification}
                    className="bg-orange-600 text-white px-6 py-2 rounded-md hover:bg-orange-700 transition-colors"
                  >
                    Start Clarification
                  </button>
                )}
                <button
                  onClick={runOptimizationStep}
                  disabled={running}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {running ? `Running... ${progress}%` : 'Run Optimization'}
                </button>
              </div>
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
        onPickField={handlePickField}
        editableFieldIds={clarificationRequest?.ordered_missing?.map(f => f.id) || []}
        onEditLast={handleEditLast}
        canEditLast={conversationHistory.some(m => m.role === 'user')}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
    </ErrorBoundary>
  );
} 