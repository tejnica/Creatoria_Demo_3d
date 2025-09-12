import React from 'react';
import PropTypes from 'prop-types';

/**
 * T16 Phase 2.3: Ambiguity List Component
 * Отображает список неопределенностей с приоритетами и предложениями
 */
const AmbiguityList = ({ 
  ambiguities, 
  onResolve,
  onStartClarification,
  compact = false 
}) => {
  if (!ambiguities || ambiguities.total_count === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <div className="flex items-center space-x-2">
          <div className="text-green-600">✅</div>
          <span className="text-sm text-green-800">No ambiguities detected</span>
        </div>
      </div>
    );
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high_priority':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'medium_priority':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'low_priority':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high_priority':
        return '🔴';
      case 'medium_priority':
        return '🟡';
      case 'low_priority':
        return '🔵';
      default:
        return '⚪';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'high_priority':
        return 'High';
      case 'medium_priority':
        return 'Medium';
      case 'low_priority':
        return 'Low';
      default:
        return 'Unknown';
    }
  };

  const allAmbiguities = [
    ...(ambiguities.high_priority || []).map(a => ({ ...a, priorityLevel: 'high_priority' })),
    ...(ambiguities.medium_priority || []).map(a => ({ ...a, priorityLevel: 'medium_priority' })),
    ...(ambiguities.low_priority || []).map(a => ({ ...a, priorityLevel: 'low_priority' }))
  ];

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">
            Ambiguities ({ambiguities.total_count})
          </h4>
          {onStartClarification && (
            <button
              onClick={onStartClarification}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
            >
              Clarify
            </button>
          )}
        </div>
        
        <div className="space-y-1">
          {allAmbiguities.slice(0, 3).map((ambiguity, idx) => (
            <div key={idx} className={`text-xs p-2 rounded border ${getPriorityColor(ambiguity.priorityLevel)}`}>
              <div className="flex items-center space-x-1">
                <span>{getPriorityIcon(ambiguity.priorityLevel)}</span>
                <span className="font-medium">{ambiguity.message}</span>
              </div>
            </div>
          ))}
          
          {allAmbiguities.length > 3 && (
            <div className="text-xs text-gray-500 text-center py-1">
              +{allAmbiguities.length - 3} more...
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Detected Ambiguities</h3>
          <p className="text-sm text-gray-600">
            Found {ambiguities.total_count} ambiguit{ambiguities.total_count === 1 ? 'y' : 'ies'}
          </p>
        </div>
        
        {onStartClarification && (
          <button
            onClick={onStartClarification}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors"
          >
            Start Clarification
          </button>
        )}
      </div>

      {/* Summary */}
      {ambiguities.summary && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">{ambiguities.summary}</p>
        </div>
      )}

      {/* Priority Groups */}
      <div className="space-y-4">
        {['high_priority', 'medium_priority', 'low_priority'].map(priorityLevel => {
          const items = ambiguities[priorityLevel] || [];
          if (items.length === 0) return null;

          return (
            <div key={priorityLevel} className="space-y-2">
              <div className="flex items-center space-x-2">
                <span>{getPriorityIcon(priorityLevel)}</span>
                <h4 className="text-sm font-medium text-gray-900">
                  {getPriorityLabel(priorityLevel)} priority ({items.length})
                </h4>
              </div>
              
              <div className="space-y-2 pl-6">
                {items.map((ambiguity, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border ${getPriorityColor(priorityLevel)}`}>
                    <div className="space-y-2">
                      {/* Message */}
                      <p className="text-sm font-medium">{ambiguity.message}</p>
                      
                      {/* Type */}
                      <div className="text-xs text-gray-600">
                        Type: <span className="font-mono">{ambiguity.type}</span>
                        {ambiguity.field_id && (
                          <span> • Field: <span className="font-mono">{ambiguity.field_id}</span></span>
                        )}
                      </div>
                      
                      {/* Suggestions */}
                      {ambiguity.suggestions && ambiguity.suggestions.length > 0 && (
                        <div className="text-xs">
                          <span className="text-gray-600">Suggestions:</span>
                          <ul className="list-disc list-inside text-gray-700 ml-2">
                            {ambiguity.suggestions.map((suggestion, suggIdx) => (
                              <li key={suggIdx}>{suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Resolve Button */}
                      {onResolve && (
                        <button
                          onClick={() => onResolve(ambiguity)}
                          className="text-xs bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 px-2 py-1 rounded transition-colors"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

AmbiguityList.propTypes = {
  ambiguities: PropTypes.object,
  onResolve: PropTypes.func,
  onStartClarification: PropTypes.func,
  compact: PropTypes.bool
};

export default AmbiguityList;
