import React, { useLayoutEffect, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

export default function ClarifierDialog({
  open,
  request,
  history,
  statusMap,
  attemptsLeft,
  answer,
  setAnswer,
  onSend,
  loading,
  onPickField,
  editableFieldIds = [],
  onEditLast,
  canEditLast = false,
  onClose
}) {
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // автоскролл вниз до рендера кадра
  useLayoutEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history?.length, request]);

  // автофокус на поле ввода при открытии/смене вопроса
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open, request]);

  if (!open || !request) return null;

  // текущий вопрос
  const currentQ = request.questions?.[0] || 'Please clarify:';
  // текущее активное поле
  const currentField = request.current_field || request.ordered_missing?.find((f) => f.status === 'active')?.id;
  const expected = (request.expected_format && currentField) ? request.expected_format[currentField] : null;
  // Bounds helpers
  const boundsMatch = currentField ? currentField.match(/^bounds_for_(.+)$/) : null;
  const boundsVar = boundsMatch ? boundsMatch[1] : null;
  // Attempts-left derived from ordered_missing for current field (retry-aware)
  const activeItem = request.ordered_missing?.find((f) => f.id === currentField) || request.ordered_missing?.[0];
  const derivedMax = (activeItem && typeof activeItem.max_attempts === 'number') ? activeItem.max_attempts : 3;
  const derivedAttempts = (activeItem && typeof activeItem.attempts === 'number') ? activeItem.attempts : (typeof attemptsLeft === 'number' ? (3 - attemptsLeft) : 0);
  const attemptsLeftEff = Math.max(0, derivedMax - derivedAttempts);
  // Bounds templates dedupe: exclude templates already present in expected examples
  const exampleSet = new Set(Array.isArray(expected?.examples) ? expected.examples : []);
  const rawTemplates = boundsVar ? [`${boundsVar}: 0..10`, 'min=0,max=10'] : [];
  const uniqueTemplates = rawTemplates.filter((tpl) => !exampleSet.has(tpl));

  const setAnswerAndFocus = (val) => {
    setAnswer(val);
    // вернуть фокус в input для продолжения набора
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl flex">
        {/* RIGHT STATUS PANEL */}
        <div className="w-72 border-l border-gray-200 p-4 flex-shrink-0 overflow-y-auto bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Clarification status</h3>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-200 transition-colors"
                title="Exit chat"
                aria-label="Close clarification dialog"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <table className="text-sm w-full" aria-label="Clarification status table">
            <thead>
              <tr className="text-gray-600">
                <th className="text-left">Field</th>
                <th>Status</th>
                <th>A</th>
              </tr>
            </thead>
            <tbody>
              {request.ordered_missing?.map((f) => {
                const editable = editableFieldIds?.includes?.(f.id) && typeof onPickField === 'function';
                return (
                  <tr
                    key={f.id}
                    className={`border-t border-gray-200 text-gray-900 ${editable ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                    onClick={() => editable && onPickField(f.id)}
                    title={editable ? `Edit ${f.id}` : undefined}
                  >
                    <td className="py-1">{f.id}</td>
                    <td>
                      {statusMap[f.id] === 'resolved' && '✅'}
                      {statusMap[f.id] === 'default' && '🅳'}
                      {statusMap[f.id] === 'conflict' && '❌'}
                      {statusMap[f.id] === 'missing' && '⚠️'}
                    </td>
                    <td>{f.attempts ?? 0}/3</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* CHAT WINDOW */}
        <div className="flex-1 flex flex-col bg-white">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {currentField && (
              <div className="text-xs text-gray-600 bg-blue-50 px-3 py-2 rounded-md">
                You are answering: <span className="font-medium text-blue-700">{currentField}</span>
              </div>
            )}
            {history.map((msg) => (
              <div
                key={msg.id ?? msg.timestamp ?? Math.random()}
                className={`p-3 rounded-lg text-sm max-w-xs break-words ${
                  msg.role === 'assistant'
                    ? 'bg-blue-100 text-gray-900 self-start border border-blue-200'
                    : 'bg-green-100 text-gray-900 self-end border border-green-200'
                }`}
              >
                {msg.content}
              </div>
            ))}
            {/* текущий вопрос */}
            <div className="p-3 rounded-lg text-sm max-w-xs bg-blue-100 text-gray-900 self-start border border-blue-200 font-medium">
              {currentQ}
            </div>
          </div>

          {/* COMPOSER */}
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            {/* Attempts counter */}
            <div className="text-xs text-gray-600 mb-1">
              Attempts left: {attemptsLeftEff}
            </div>
            {/* Mini progress for attempts used */}
            <div className="mb-3" aria-label="Attempts progress">
              <div className="bg-gray-200 rounded h-1">
                <div
                  className="bg-blue-500 h-1 rounded"
                  style={{ width: `${Math.min(100, Math.max(0, (derivedAttempts / derivedMax) * 100))}%` }}
                />
              </div>
            </div>
            
            {/* Suggested defaults */}
            {request.suggested_defaults && Object.keys(request.suggested_defaults).length > 0 && (
              <div className="mb-3" aria-label="Suggested defaults">
                <div className="text-xs text-gray-600 mb-1">Suggested</div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(request.suggested_defaults).map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => setAnswerAndFocus(v)}
                      className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded-md text-white transition-colors shadow-sm"
                      title={`Use suggested: ${v}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Expected format/hint & examples */}
            {expected && (
              <div className="mb-3" aria-label="Expected format">
                <div className="text-xs text-gray-600 mb-1">📋 Expected format:</div>
                {expected.hint && (
                  <div className="text-xs text-gray-700 mb-1 bg-yellow-50 p-2 rounded border border-yellow-200">{expected.hint}</div>
                )}
                {Array.isArray(expected.examples) && expected.examples.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {expected.examples.map((ex, idx) => (
                      <button
                        key={idx}
                        onClick={() => setAnswerAndFocus(ex)}
                        className="px-2 py-1 text-xs bg-gray-500 hover:bg-gray-600 rounded-md text-white transition-colors shadow-sm"
                        title={`Insert example`}
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Bounds templates for convenience (deduped) */}
            {boundsVar && uniqueTemplates.length > 0 && (
              <div className="mb-3" aria-label="Templates">
                <div className="text-xs text-gray-600 mb-1">Templates</div>
                <div className="flex flex-wrap gap-1">
                  {uniqueTemplates.map((tpl) => (
                    <button
                      key={tpl}
                      onClick={() => setAnswerAndFocus(tpl)}
                      className="px-2 py-1 text-xs bg-gray-500 hover:bg-gray-600 rounded-md text-white transition-colors shadow-sm"
                      title={tpl.startsWith(`${boundsVar}:`) ? `Insert ${tpl}` : 'Insert template'}
                    >
                      {tpl}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex mt-2">
              <input
                ref={inputRef}
                className="flex-1 bg-white border border-gray-300 p-2 rounded mr-2 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Type your answer…"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
              />
              <div className="flex items-center gap-2">
                {canEditLast && typeof onEditLast === 'function' && (
                  <button
                    onClick={onEditLast}
                    className="px-3 py-2 rounded bg-gray-500 hover:bg-gray-600 text-white transition-colors shadow-sm"
                    title="Edit last answer"
                  >
                    Edit last
                  </button>
                )}
                <button
                  onClick={onSend}
                  disabled={loading || !answer.trim()}
                  className={`px-4 py-2 rounded font-medium transition-colors shadow-sm ${
                    loading || !answer.trim()
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {loading ? 'Sending…' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

ClarifierDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  request: PropTypes.object,
  history: PropTypes.arrayOf(
    PropTypes.shape({
      role: PropTypes.string,
      content: PropTypes.string,
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      timestamp: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    })
  ).isRequired,
  statusMap: PropTypes.object.isRequired,
  attemptsLeft: PropTypes.number,
  answer: PropTypes.string.isRequired,
  setAnswer: PropTypes.func.isRequired,
  onSend: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  onPickField: PropTypes.func,
  editableFieldIds: PropTypes.arrayOf(PropTypes.string),
  onEditLast: PropTypes.func,
  canEditLast: PropTypes.bool,
  onClose: PropTypes.func
}; 