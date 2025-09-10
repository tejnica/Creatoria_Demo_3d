import React, { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * T16 Phase 2.3: Semantic Analysis Display Component
 * Отображает результаты семантического анализа инженерной задачи
 */
const SemanticAnalysisDisplay = ({ 
  analysisResult, 
  loading = false, 
  onAnalyze,
  onUseResults,
  showAnalyzeButton = true 
}) => {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-blue-800 font-medium">Выполняется семантический анализ...</span>
        </div>
      </div>
    );
  }

  if (!analysisResult) {
    if (!showAnalyzeButton) return null;
    
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Семантический анализ</h3>
            <p className="text-sm text-gray-600">Извлечь структурированные данные из текста</p>
          </div>
          {onAnalyze && (
            <button
              onClick={onAnalyze}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
            >
              Анализировать
            </button>
          )}
        </div>
      </div>
    );
  }

  const { success, problem, ambiguities, extraction_confidence } = analysisResult;

  if (!success) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <div className="text-red-600">⚠️</div>
          <div>
            <h3 className="text-sm font-medium text-red-900">Ошибка семантического анализа</h3>
            <p className="text-sm text-red-700">{analysisResult.error || 'Не удалось выполнить анализ'}</p>
          </div>
        </div>
        {onAnalyze && (
          <button
            onClick={onAnalyze}
            className="mt-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
          >
            Повторить анализ
          </button>
        )}
      </div>
    );
  }

  const confidenceColor = 
    extraction_confidence >= 0.8 ? 'text-green-600' :
    extraction_confidence >= 0.6 ? 'text-yellow-600' : 'text-red-600';

  const confidenceLabel =
    extraction_confidence >= 0.8 ? 'Высокая' :
    extraction_confidence >= 0.6 ? 'Средняя' : 'Низкая';

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="text-green-600">✅</div>
          <div>
            <h3 className="text-sm font-medium text-green-900">Семантический анализ завершен</h3>
            <p className="text-sm text-green-700">
              Уверенность: <span className={`font-medium ${confidenceColor}`}>
                {confidenceLabel} ({Math.round((extraction_confidence || 0) * 100)}%)
              </span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-green-700 hover:text-green-900 text-sm font-medium"
          >
            {expanded ? 'Свернуть' : 'Подробнее'}
          </button>
          {onUseResults && (
            <button
              onClick={() => onUseResults(analysisResult)}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
            >
              Использовать результаты
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      {problem && (
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="font-medium text-gray-900">{problem.variables?.length || 0}</div>
            <div className="text-gray-600">Переменных</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-900">{problem.objectives?.length || 0}</div>
            <div className="text-gray-600">Целей</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-900">{problem.constraints?.length || 0}</div>
            <div className="text-gray-600">Ограничений</div>
          </div>
        </div>
      )}

      {/* Ambiguities Alert */}
      {ambiguities && ambiguities.total_count > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
          <div className="flex items-center space-x-2">
            <div className="text-yellow-600">⚠️</div>
            <div>
              <span className="text-sm font-medium text-yellow-900">
                Обнаружено {ambiguities.total_count} неопределенност{ambiguities.total_count === 1 ? 'ь' : ambiguities.total_count < 5 ? 'и' : 'ей'}
              </span>
              <p className="text-sm text-yellow-700">Рекомендуется уточнить данные для лучших результатов</p>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Details */}
      {expanded && problem && (
        <div className="border-t border-green-200 pt-4 space-y-4">
          {/* Variables */}
          {problem.variables && problem.variables.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Переменные:</h4>
              <div className="space-y-1">
                {problem.variables.map((variable, idx) => (
                  <div key={idx} className="text-sm text-gray-700 bg-white rounded px-2 py-1">
                    <span className="font-medium">{variable.name}</span>
                    {variable.unit && <span className="text-gray-500"> ({variable.unit})</span>}
                    {(variable.lower_bound !== undefined || variable.upper_bound !== undefined) && (
                      <span className="text-gray-500"> 
                        [{variable.lower_bound ?? '?'} - {variable.upper_bound ?? '?'}]
                      </span>
                    )}
                    {variable.description && <span className="text-gray-500"> - {variable.description}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Objectives */}
          {problem.objectives && problem.objectives.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Цели:</h4>
              <div className="space-y-1">
                {problem.objectives.map((objective, idx) => (
                  <div key={idx} className="text-sm text-gray-700 bg-white rounded px-2 py-1">
                    <span className="font-medium capitalize">{objective.type}</span>: {objective.target}
                    {objective.unit && <span className="text-gray-500"> ({objective.unit})</span>}
                    {objective.description && <span className="text-gray-500"> - {objective.description}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Constraints */}
          {problem.constraints && problem.constraints.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Ограничения:</h4>
              <div className="space-y-1">
                {problem.constraints.map((constraint, idx) => (
                  <div key={idx} className="text-sm text-gray-700 bg-white rounded px-2 py-1">
                    <span className="font-medium">{constraint.variable}</span> {constraint.operator} {constraint.value}
                    {constraint.units && <span> {constraint.units}</span>}
                    {constraint.description && <span className="text-gray-500"> - {constraint.description}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Domain & Materials */}
          {(problem.domain || problem.context?.materials?.length > 0) && (
            <div className="flex space-x-4">
              {problem.domain && (
                <div>
                  <span className="text-sm font-medium text-gray-900">Область:</span>
                  <span className="text-sm text-gray-700 ml-1">{problem.domain}</span>
                </div>
              )}
              {problem.context?.materials && problem.context.materials.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-900">Материалы:</span>
                  <div className="ml-1">
                    {problem.context.materials.map((material, idx) => {
                      const materialName = typeof material === 'string' ? material : material.name;
                      const properties = typeof material === 'object' ? material.properties : null;
                      
                      return (
                        <div key={idx} className="text-sm text-gray-700">
                          <span className="font-medium">{materialName}</span>
                          {properties && Object.keys(properties).length > 0 && (
                            <div className="ml-2 mt-1 text-xs text-gray-600">
                              {Object.entries(properties).slice(0, 3).map(([propName, propData]) => (
                                <div key={propName} className="flex justify-between">
                                  <span>{propName.replace(/_/g, ' ')}:</span>
                                  <span>{propData.value} {propData.unit}</span>
                                </div>
                              ))}
                              {Object.keys(properties).length > 3 && (
                                <div className="text-gray-500">...и {Object.keys(properties).length - 3} других свойств</div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

SemanticAnalysisDisplay.propTypes = {
  analysisResult: PropTypes.object,
  loading: PropTypes.bool,
  onAnalyze: PropTypes.func,
  onUseResults: PropTypes.func,
  showAnalyzeButton: PropTypes.bool
};

export default SemanticAnalysisDisplay;
