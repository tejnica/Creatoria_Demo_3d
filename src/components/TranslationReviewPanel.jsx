import React, { useState } from 'react';
import SemanticAnalysisDisplay from './semantic/SemanticAnalysisDisplay';
import AmbiguityList from './semantic/AmbiguityList';

/**
 * T16 Phase 1: Translation Review Panel
 * T16 Phase 2.3: Enhanced with semantic analysis integration
 * Компонент для проверки и редактирования перевода текста перед семантическим анализом
 */
const TranslationReviewPanel = ({ 
  originalText, 
  translatedText, 
  detectedLanguage, 
  confidence,
  onConfirm, 
  onBack, 
  onTextChange,
  loading = false,
  // T16 Phase 2.3: Semantic Analysis props
  semanticAnalysis = null,
  onAnalyzeSemantics,
  onUseSemanticResults,
  semanticLoading = false,
  showSemanticAnalysis = true
}) => {
  const [editedText, setEditedText] = useState(translatedText || '');

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setEditedText(newText);
    if (onTextChange) {
      onTextChange(newText);
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm(editedText);
    }
  };

  // Функция для подсветки потенциальных переменных, чисел, единиц и операторов
  const highlightKeyEntities = (text) => {
    if (!text) return text;
    
    // Регулярные выражения для выделения ключевых сущностей
    const patterns = [
      // Числа с единицами измерения
      { regex: /(\d+(?:\.\d+)?)\s*(mm|cm|m|kg|g|MPa|GPa|USD|\$|%|°C|°F)/gi, className: 'bg-blue-100 text-blue-800 px-1 rounded' },
      // Переменные (слова, начинающиеся с буквы, содержащие цифры или подчеркивания)
      { regex: /\b([a-zA-Z]\w*(?:_\w+)*)\b/g, className: 'bg-green-100 text-green-800 px-1 rounded' },
      // Операторы сравнения
      { regex: /(<=|>=|==|<|>|≤|≥|=)/g, className: 'bg-red-100 text-red-800 px-1 rounded font-bold' },
      // Диапазоны (числа через дефис)
      { regex: /(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)/g, className: 'bg-yellow-100 text-yellow-800 px-1 rounded' }
    ];

    let highlightedText = text;
    let offset = 0;

    // Применяем подсветку для каждого паттерна
    patterns.forEach(({ regex, className }) => {
      const matches = [...text.matchAll(regex)];
      matches.reverse().forEach(match => {
        const start = match.index;
        const end = start + match[0].length;
        const highlighted = `<span class="${className}">${match[0]}</span>`;
        highlightedText = highlightedText.slice(0, start + offset) + highlighted + highlightedText.slice(end + offset);
        offset += highlighted.length - match[0].length;
      });
    });

    return highlightedText;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Translation Review
        </h3>
        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
          <span className="flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
            Detected: {detectedLanguage?.toUpperCase() || 'Unknown'}
          </span>
          <span className="flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Confidence: {Math.round((confidence || 0) * 100)}%
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Original Text */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Original Text ({detectedLanguage?.toUpperCase() || 'Source'})
          </label>
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3 h-32 overflow-auto text-sm">
            {originalText}
          </div>
        </div>

        {/* Translated Text (Editable) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            English Translation (Editable)
          </label>
          <textarea
            value={editedText}
            onChange={handleTextChange}
            className="w-full h-32 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Edit the translation if needed..."
            disabled={loading}
          />
        </div>
      </div>

      {/* Key Entities Highlighting Preview */}
      {editedText && (
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Key Entities Preview
            <span className="text-xs text-gray-500 ml-2">
              (Numbers, variables, operators, and ranges are highlighted)
            </span>
          </label>
          <div 
            className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm min-h-20"
            dangerouslySetInnerHTML={{ __html: highlightKeyEntities(editedText) }}
          />
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 p-3 bg-gray-50 rounded-md">
        <div className="text-xs font-medium text-gray-700 mb-2">Legend:</div>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="flex items-center">
            <span className="bg-blue-100 text-blue-800 px-1 rounded mr-1">123 mm</span>
            Numbers + Units
          </span>
          <span className="flex items-center">
            <span className="bg-green-100 text-green-800 px-1 rounded mr-1">variable</span>
            Variables
          </span>
          <span className="flex items-center">
            <span className="bg-red-100 text-red-800 px-1 rounded mr-1">≤</span>
            Operators
          </span>
          <span className="flex items-center">
            <span className="bg-yellow-100 text-yellow-800 px-1 rounded mr-1">1-10</span>
            Ranges
          </span>
        </div>
      </div>

      {/* T16 Phase 2.3: Semantic Analysis Section */}
      {showSemanticAnalysis && (
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Семантический анализ</h3>
          
          <SemanticAnalysisDisplay
            analysisResult={semanticAnalysis}
            loading={semanticLoading}
            onAnalyze={() => onAnalyzeSemantics && onAnalyzeSemantics(editedText)}
            onUseResults={onUseSemanticResults}
            showAnalyzeButton={!semanticAnalysis && !semanticLoading}
          />
          
          {/* Ambiguities Display */}
          {semanticAnalysis?.ambiguities && semanticAnalysis.ambiguities.total_count > 0 && (
            <AmbiguityList
              ambiguities={semanticAnalysis.ambiguities}
              compact={true}
              onStartClarification={() => {
                // Переходим к clarification с засеянной сессией
                if (onUseSemanticResults) {
                  onUseSemanticResults(semanticAnalysis);
                }
              }}
            />
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between mt-6">
        <button
          onClick={onBack}
          disabled={loading}
          className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          ← Back
        </button>
        
        <div className="flex space-x-3">
          {/* T16 Phase 2.3: Skip semantic analysis option */}
          <button
            onClick={handleConfirm}
            disabled={loading || !editedText.trim()}
            className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processing...' : 'Skip Analysis →'}
          </button>
          
          {/* Enhanced continue button */}
          <button
            onClick={() => {
              if (semanticAnalysis?.success && onUseSemanticResults) {
                onUseSemanticResults(semanticAnalysis);
              } else {
                handleConfirm();
              }
            }}
            disabled={loading || !editedText.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {semanticAnalysis?.success 
              ? 'Continue with Semantic Results →' 
              : 'Continue to Manual Entry →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TranslationReviewPanel;
