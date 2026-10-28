import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { queryFacts } from '../../services/memoryApi';
import type { QueryResult } from '../../types/facts';
import { SOURCE_TYPE_LABELS } from '../../types/facts';
import { formatDateTime } from '../../lib/formatting';
import { Terminal, Search, AlertTriangle, ShieldCheck, HelpCircle, ArrowRight, CornerDownLeft } from 'lucide-react';
import { Button } from '../ui/Button';
import { getRequestErrorMessage } from '../ui/RequestNotice';

interface QueryPanelProps {
  onResolveConflict?: (factId: string) => void;
}

const exampleQueries = [
  "What is Acme Corporation's delivery date?",
  "Tata Digital budget",
  "Bharat Logistics payment status",
  "Reliance Fresh vendor contact",
];

export function QueryPanel({ onResolveConflict }: QueryPanelProps) {
  const [queryText, setQueryText] = useState("What is Acme Corporation's delivery date?");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState('');
  const controllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const handleQuery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!queryText.trim()) return;

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');
    try {
      const res = await queryFacts(queryText.trim(), { signal: controller.signal });
      if (requestId === requestIdRef.current) setResult(res);
    } catch (err) {
      if (!controller.signal.aborted && requestId === requestIdRef.current) {
        setResult(null);
        setError(getRequestErrorMessage(err));
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setQueryText(example);
  };

  return (
    <div className="card p-4 sm:p-5 border-surface-300 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Terminal size={16} className="text-accent-600" />
            <h3 className="text-sm font-semibold text-surface-900">
              Agent Reliability Query Console
            </h3>
          </div>
          <p className="text-xs text-surface-500 mt-0.5">
            Query the reliability layer to inspect deterministic answer evidence before an agent responds.
          </p>
        </div>
        <span className="text-xxs font-mono px-2 py-0.5 rounded bg-surface-100 text-surface-600 border border-surface-200 self-start sm:self-auto">
          POST /query
        </span>
      </div>

      {/* Input Form */}
      <form onSubmit={handleQuery} className="space-y-2">
        <div className="relative flex items-center">
          <Search size={16} className="absolute left-3 text-surface-400" />
          <input
            type="text"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Type a natural entity or attribute inquiry..."
            className="w-full pl-9 pr-24 py-2.5 text-xs sm:text-sm border border-surface-300 rounded-md bg-white placeholder-surface-400 font-mono focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-accent-400"
          />
          <div className="absolute right-1.5 flex items-center">
            <Button
              type="submit"
              size="sm"
              variant="primary"
              loading={loading}
              className="text-xs px-3 py-1.5"
            >
              <span>Query</span>
              <CornerDownLeft size={12} className="hidden sm:inline" />
            </Button>
          </div>
        </div>

        {/* Examples */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xxs font-mono text-surface-500">
          <span className="text-surface-400">Examples:</span>
          {exampleQueries.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => handleExampleClick(ex)}
              className="px-2 py-0.5 rounded bg-surface-100 hover:bg-surface-200 text-surface-700 transition-colors"
            >
              "{ex}"
            </button>
          ))}
        </div>
      </form>

      {error && (
        <div role="alert" className="p-3 bg-error-50 text-error-700 border border-error-200 rounded-md text-xs">
          {error}
          <button type="button" className="ml-2 underline font-semibold" onClick={() => void handleQuery()}>
            Retry
          </button>
        </div>
      )}

      {/* Result Area */}
      {result && (
        <div className="pt-2 border-t border-surface-100">
          <div className="text-xxs font-mono uppercase tracking-wider text-surface-400 mb-2">
            Structured Execution Result
          </div>

          {/* Conflict Result */}
          {result.status === 'conflict' && (
            <div className="p-4 rounded-lg bg-conflict-50/70 border border-conflict-200 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-conflict-100 text-conflict-800 border border-conflict-300 flex items-center gap-1.5">
                    <AlertTriangle size={13} className="text-conflict-600" />
                    Status: Conflict detected
                  </span>
                  {result.entity && (
                    <span className="text-xs font-mono text-surface-600 hidden sm:inline">
                      {result.entity} · {result.attribute}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {result.factId && onResolveConflict && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onResolveConflict(result.factId!)}
                      className="text-xs text-conflict-800 border-conflict-300 hover:bg-conflict-100"
                    >
                      Resolve Conflict
                    </Button>
                  )}
                  {result.factId && (
                    <Link
                      to={`/facts/${result.factId}`}
                      className="text-xs font-medium text-conflict-800 hover:underline inline-flex items-center gap-1"
                    >
                      <span>View Fact #{result.factId}</span>
                      <ArrowRight size={12} />
                    </Link>
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs text-conflict-900 font-semibold mb-0.5">Answer:</div>
                <div className="text-sm font-mono text-conflict-800 font-medium bg-white/60 p-2.5 rounded border border-conflict-200">
                  No single current value can be confirmed.
                </div>
                <p className="text-xxs text-conflict-700 mt-1 italic">
                  Deterministic reliability rule: Autonomous agents are blocked from guessing when sources disagree.
                </p>
              </div>

              <div>
                <div className="text-xs text-surface-700 font-semibold mb-1">
                  Conflicting Source Evidence ({result.evidence.length} sources):
                </div>
                <div className="space-y-1.5">
                  {result.evidence.map((ev, i) => (
                    <div
                      key={i}
                      className="text-xs font-mono bg-white p-2.5 rounded border border-surface-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-surface-900">{ev.value}</span>
                        <span className="text-xxs px-1.5 py-0.5 rounded bg-surface-100 text-surface-600">
                          {SOURCE_TYPE_LABELS[ev.sourceType]}
                        </span>
                      </div>
                      <div className="text-xxs text-surface-500">
                        <span>Ref: {ev.sourceReference}</span> · <span>{formatDateTime(ev.recordedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Supported Result */}
          {(result.status === 'supported' || result.status === 'resolved') && (
            <div className="p-4 rounded-lg bg-resolved-50/50 border border-resolved-200 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-resolved-100 text-resolved-800 border border-resolved-300 flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-resolved-600" />
                    Status: {result.status === 'resolved' ? 'Resolved' : 'Supported'}
                  </span>
                  {result.entity && (
                    <span className="text-xs font-mono text-surface-600 hidden sm:inline">
                      {result.entity} · {result.attribute}
                    </span>
                  )}
                </div>

                {result.factId && (
                  <Link
                    to={`/facts/${result.factId}`}
                    className="text-xs font-medium text-resolved-800 hover:underline inline-flex items-center gap-1"
                  >
                    <span>View Fact #{result.factId}</span>
                    <ArrowRight size={12} />
                  </Link>
                )}
              </div>

              <div>
                <div className="text-xs text-surface-700 font-semibold mb-0.5">Deterministic Answer:</div>
                <div className="text-sm font-mono text-surface-900 font-semibold bg-white p-2.5 rounded border border-surface-200">
                  {result.answer ?? 'Answer unavailable'}
                </div>
              </div>

              <div>
                <div className="text-xs text-surface-700 font-semibold mb-1">Source Lineage Evidence:</div>
                <div className="space-y-1.5">
                  {result.evidence.map((ev, i) => (
                    <div
                      key={i}
                      className="text-xs font-mono bg-white p-2.5 rounded border border-surface-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-surface-900">{ev.value}</span>
                        <span className="text-xxs px-1.5 py-0.5 rounded bg-surface-100 text-surface-600">
                          {SOURCE_TYPE_LABELS[ev.sourceType]}
                        </span>
                      </div>
                      <div className="text-xxs text-surface-500">
                        <span>Ref: {ev.sourceReference}</span> · <span>{formatDateTime(ev.recordedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Not Found Result */}
          {result.status === 'not_found' && (
            <div className="p-4 rounded-lg bg-surface-100 border border-surface-200 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-surface-700">
                <HelpCircle size={14} className="text-surface-500" />
                <span>Status: No matching fact found</span>
              </div>
              <p className="text-xs text-surface-600">
                No source-backed fact was found for this query in the current workspace. The agent will not invent or hallucinate answers.
              </p>
            </div>
          )}

          {result.status === 'ambiguous' && (
            <div role="status" className="p-4 rounded-lg bg-amber-50 border border-amber-200 space-y-2">
              <div className="text-xs font-mono font-semibold text-amber-900">Status: Ambiguous query</div>
              <p className="text-xs text-amber-800">
                {result.message || 'Multiple facts matched. Please clarify the entity or attribute.'}
              </p>
              {result.evidence.length > 0 && (
                <div className="space-y-1">
                  {result.evidence.map((candidate, index) => (
                    <p key={`${candidate.sourceReference}-${index}`} className="text-xs text-surface-700">
                      {candidate.value} · {candidate.sourceLabel}
                    </p>
                  ))}
                </div>
              )}
              <p className="text-xs font-semibold text-amber-900">No answer was selected.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
