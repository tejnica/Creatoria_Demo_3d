import React from 'react';
import PropTypes from 'prop-types';

/**
 * T16 Phase 3: Smart Analysis Display Component
 * Отображает результаты семантического анализа в виде понятных чек-листов
 * Заменяет техническую "Pre-parser details" на user-friendly интерфейс
 */
const SmartAnalysisDisplay = ({ 
  semanticAnalysis, 
  preparser, 
  onStartClarification,
  hasAmbiguities = false 
}) => {
  // Если есть семантический анализ, используем его данные
  const problem = semanticAnalysis?.problem;
  const ambiguities = semanticAnalysis?.ambiguities;
  const confidence = semanticAnalysis?.extraction_confidence;

  // Определяем что удалось распознать
  const recognized = [];
  const missing = [];

  if (problem) {
    // Проверяем что есть в семантическом анализе
    if (problem.objectives?.length > 0) {
      recognized.push({
        icon: '🎯',
        title: 'Цели оптимизации',
        count: problem.objectives.length,
        details: problem.objectives.map(obj => `${obj.type}: ${obj.target}${obj.unit ? ` (${obj.unit})` : ''}`).slice(0, 2)
      });
    }

    if (problem.variables?.length > 0) {
      recognized.push({
        icon: '🔧',
        title: 'Переменные',
        count: problem.variables.length,
        details: problem.variables.map(v => `${v.name}${v.unit ? ` (${v.unit})` : ''}`).slice(0, 3)
      });
    }

    if (problem.constraints?.length > 0) {
      recognized.push({
        icon: '⚖️',
        title: 'Ограничения',
        count: problem.constraints.length,
        details: problem.constraints.map(c => c.description || `${c.variable} ${c.operator} ${c.value}`).slice(0, 2)
      });
    }

    if (problem.context?.materials?.length > 0) {
      recognized.push({
        icon: '🧱',
        title: 'Материалы',
        count: problem.context.materials.length,
        details: problem.context.materials.map(m => typeof m === 'string' ? m : m.name).slice(0, 2)
      });
    }
  } else if (preparser) {
    // Fallback к legacy preparser данным
    if (preparser.goal_candidates?.length > 0) {
      recognized.push({
        icon: '🎯',
        title: 'Цели (найденные)',
        count: preparser.goal_candidates.length,
        details: preparser.goal_candidates.slice(0, 2)
      });
    }

    if (preparser.constraint_candidates?.length > 0) {
      recognized.push({
        icon: '⚖️',
        title: 'Ограничения (найденные)',
        count: preparser.constraint_candidates.length,
        details: preparser.constraint_candidates.slice(0, 2)
      });
    }

    if (preparser.unit_mentions?.length > 0) {
      recognized.push({
        icon: '📏',
        title: 'Единицы измерения',
        count: preparser.unit_mentions.length,
        details: preparser.unit_mentions.slice(0, 3)
      });
    }
  }

  // Определяем что нужно уточнить из ambiguities
  if (ambiguities) {
    const highPriorityItems = ambiguities.high_priority || [];
    const mediumPriorityItems = ambiguities.medium_priority || [];
    
    [...highPriorityItems, ...mediumPriorityItems].slice(0, 4).forEach(item => {
      missing.push({
        icon: '❌',
        title: item.category?.replace('_', ' ') || 'Неизвестная проблема',
        description: item.description,
        priority: item.priority || 'medium'
      });
    });
  }

  const confidenceColor = 
    confidence >= 0.8 ? 'text-green-600' :
    confidence >= 0.6 ? 'text-yellow-600' : 'text-red-600';

  const confidenceLabel =
    confidence >= 0.8 ? 'Высокая' :
    confidence >= 0.6 ? 'Средняя' : 'Низкая';

  // Don't render if no data at all
  if (!semanticAnalysis && !preparser) {
    return null;
  }

  return (
    <div className="border rounded-md p-4 bg-gradient-to-r from-green-50 to-blue-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-900">Результаты анализа</h3>
        {confidence && (
          <div className="text-sm">
            <span className="text-gray-600">Точность: </span>
            <span className={`font-medium ${confidenceColor}`}>
              {confidenceLabel} ({Math.round(confidence * 100)}%)
            </span>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Что удалось распознать */}
        <div>
          <div className="flex items-center mb-3">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <h4 className="font-medium text-green-800">Что удалось распознать</h4>
          </div>
          
          {recognized.length > 0 ? (
            <div className="space-y-2">
              {recognized.map((item, idx) => (
                <div key={idx} className="bg-white rounded-lg p-3 border border-green-200">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center">
                      <span className="text-lg mr-2">{item.icon}</span>
                      <span className="font-medium text-gray-900">{item.title}</span>
                    </div>
                    <span className="text-sm font-medium text-green-600">{item.count}</span>
                  </div>
                  {item.details && item.details.length > 0 && (
                    <div className="text-xs text-gray-600 ml-6">
                      {item.details.map((detail, i) => (
                        <div key={i}>• {detail}</div>
                      ))}
                      {item.count > item.details.length && (
                        <div className="text-gray-400">...и ещё {item.count - item.details.length}</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-sm italic">
              Основные компоненты не распознаны
            </div>
          )}
        </div>

        {/* Что нужно уточнить */}
        <div>
          <div className="flex items-center mb-3">
            <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
            <h4 className="font-medium text-orange-800">Что нужно уточнить</h4>
          </div>
          
          {missing.length > 0 ? (
            <div className="space-y-2">
              {missing.map((item, idx) => (
                <div key={idx} className="bg-white rounded-lg p-3 border border-orange-200">
                  <div className="flex items-center mb-1">
                    <span className="text-lg mr-2">{item.icon}</span>
                    <span className="font-medium text-gray-900 capitalize">{item.title}</span>
                    {item.priority === 'high' && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
                        Важно
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 ml-6">
                    {item.description}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-green-600 text-sm font-medium">
              ✅ Все данные распознаны корректно
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {missing.length > 0 && (
        <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-orange-800 text-sm">
                Рекомендуется уточнить данные
              </div>
              <div className="text-xs text-orange-600">
                Для получения качественных результатов оптимизации
              </div>
            </div>
            {onStartClarification && (
              <button
                onClick={onStartClarification}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Начать уточнение
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

SmartAnalysisDisplay.propTypes = {
  semanticAnalysis: PropTypes.object,
  preparser: PropTypes.object,
  onStartClarification: PropTypes.func,
  hasAmbiguities: PropTypes.bool
};

export default SmartAnalysisDisplay;
