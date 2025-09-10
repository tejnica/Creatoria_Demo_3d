import React from 'react';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function ResultViewer({ result }) {
  if (!result) return null;

  const { task_id, status, result: optimizationResult, solver_info, report } = result;
  const { fast_solution, advanced_solution } = optimizationResult || {};

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Task: {task_id}</h3>
            <p className="text-sm text-gray-600">Status: <span className="text-green-600 font-medium">{status}</span></p>
          </div>
          <div className="text-right text-sm text-gray-500">
            <p>Solver: {solver_info?.solver || 'N/A'}</p>
            <p>Total time: {(solver_info?.total_time || 0).toFixed(3)}s</p>
          </div>
        </div>
      </div>

      {/* Solutions Comparison */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Fast Solution */}
        {fast_solution && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
              Fast Solution
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Solve Time:</span>
                <span className="font-mono">{(fast_solution.solve_time || 0).toFixed(3)}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Objective Value:</span>
                <span className="font-mono">{fast_solution.objective_value?.toFixed(4) || 'N/A'}</span>
              </div>
              {fast_solution.variables && Object.keys(fast_solution.variables).length > 0 && (
                <div>
                  <p className="text-gray-600 mb-1">Variables:</p>
                  <div className="bg-gray-50 p-2 rounded text-xs">
                    {Object.entries(fast_solution.variables).map(([name, value]) => (
                      <div key={name} className="flex justify-between">
                        <span>{name}:</span>
                        <span className="font-mono">{typeof value === 'number' ? value.toFixed(4) : value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Advanced Solution */}
        {advanced_solution && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
              Advanced Solution
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Solve Time:</span>
                <span className="font-mono">{(advanced_solution.solve_time || 0).toFixed(3)}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Objective Value:</span>
                <span className="font-mono">{advanced_solution.objective_value?.toFixed(4) || 'N/A'}</span>
              </div>
              {advanced_solution.variables && Object.keys(advanced_solution.variables).length > 0 && (
                <div>
                  <p className="text-gray-600 mb-1">Variables:</p>
                  <div className="bg-gray-50 p-2 rounded text-xs">
                    {Object.entries(advanced_solution.variables).map(([name, value]) => (
                      <div key={name} className="flex justify-between">
                        <span>{name}:</span>
                        <span className="font-mono">{typeof value === 'number' ? value.toFixed(4) : value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Visualization */}
      {fast_solution?.variables && Object.keys(fast_solution.variables).length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Variable Values</h4>
          <div className="h-64">
            <Plot
              data={[
                {
                  x: Object.keys(fast_solution.variables),
                  y: Object.values(fast_solution.variables),
                  type: 'bar',
                  marker: { color: '#3B82F6' },
                  name: 'Fast Solution'
                },
                ...(advanced_solution?.variables ? [{
                  x: Object.keys(advanced_solution.variables),
                  y: Object.values(advanced_solution.variables),
                  type: 'bar',
                  marker: { color: '#8B5CF6' },
                  name: 'Advanced Solution'
                }] : [])
              ]}
              layout={{
                title: 'Optimization Variables',
                xaxis: { title: 'Variables' },
                yaxis: { title: 'Values' },
                showlegend: true,
                margin: { t: 50, r: 50, b: 50, l: 50 }
              }}
              config={{ responsive: true }}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </div>
      )}

      {/* Report */}
      {report && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Analysis Report</h4>
          <div className="prose max-w-none text-sm">
            <pre className="whitespace-pre-wrap bg-gray-50 p-3 rounded text-xs">
              {report}
            </pre>
          </div>
        </div>
      )}

      {/* Raw Data (Debug) */}
      <details className="bg-gray-50 rounded-lg p-4">
        <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
          Raw Response Data (Debug)
        </summary>
        <pre className="mt-2 text-xs overflow-auto bg-white p-3 rounded border">
          {JSON.stringify(result, null, 2)}
        </pre>
      </details>
    </div>
  );
} 