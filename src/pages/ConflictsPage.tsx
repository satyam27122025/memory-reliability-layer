import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { listFacts } from '../services/memoryApi';
import type { Fact } from '../types/facts';
import { SOURCE_TYPE_LABELS } from '../types/facts';
import { formatDateTime } from '../lib/formatting';
import { ResolveConflictModal } from '../components/facts/ResolveConflictModal';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonTable } from '../components/ui/Skeleton';
import { AlertTriangle, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';

interface AppContextType {
  refreshMetrics: () => Promise<void>;
  addToast: (toast: { type: 'success' | 'error' | 'warning' | 'info'; title: string; description?: string }) => void;
}

export function ConflictsPage() {
  const { refreshMetrics, addToast } = useOutletContext<AppContextType>();
  const [facts, setFacts] = useState<Fact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFact, setSelectedFact] = useState<Fact | null>(null);
  const [isResolveOpen, setIsResolveOpen] = useState(false);
  const [tab, setTab] = useState<'active' | 'resolved'>('active');

  const loadData = async () => {
    try {
      const data = await listFacts();
      setFacts(data);
    } catch (err) {
      console.error('Failed to load facts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeConflicts = facts.filter(f => f.status === 'conflict');
  const resolvedConflicts = facts.filter(f => f.status === 'resolved');

  const handleResolve = (fact: Fact) => {
    setSelectedFact(fact);
    setIsResolveOpen(true);
  };

  const handleFactResolved = async (updated: Fact) => {
    await loadData();
    await refreshMetrics();
    addToast({
      type: 'success',
      title: 'Resolution Recorded',
      description: `Authoritative value selected for ${updated.entity}.`,
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <AlertTriangle size={20} className="text-conflict-600" />
          <h1 className="text-xl sm:text-2xl font-bold text-surface-900 tracking-tight">
            Conflict Resolution Center
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-surface-500 mt-1">
          Detect and explicitly reconcile contradictory assertions recorded across multiple operational systems.
        </p>
      </div>

      {/* Metric Counters & Warning banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-4 flex items-center justify-between border-l-4 border-l-conflict-500">
          <div>
            <span className="text-xxs font-mono uppercase text-surface-500 font-semibold">
              Active Unresolved Conflicts
            </span>
            <div className="text-2xl font-bold font-mono text-conflict-700 mt-1">
              {activeConflicts.length}
            </div>
            <p className="text-xxs text-surface-500 mt-0.5">
              Agents block answers for these facts until confirmed
            </p>
          </div>
          <AlertTriangle size={32} className="text-conflict-400 opacity-60" />
        </div>

        <div className="card p-4 flex items-center justify-between border-l-4 border-l-resolved-500">
          <div>
            <span className="text-xxs font-mono uppercase text-surface-500 font-semibold">
              Explicitly Resolved in Workspace
            </span>
            <div className="text-2xl font-bold font-mono text-resolved-700 mt-1">
              {resolvedConflicts.length}
            </div>
            <p className="text-xxs text-surface-500 mt-0.5">
              Audit reason recorded; alternatives preserved
            </p>
          </div>
          <ShieldCheck size={32} className="text-resolved-400 opacity-60" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-surface-200">
        <button
          onClick={() => setTab('active')}
          className={`pb-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${
            tab === 'active'
              ? 'border-conflict-500 text-conflict-800 font-semibold'
              : 'border-transparent text-surface-500 hover:text-surface-800'
          }`}
        >
          <span>Requires Attention</span>
          <span className="px-1.5 py-0.5 rounded-full text-xxs font-mono bg-conflict-100 text-conflict-800">
            {activeConflicts.length}
          </span>
        </button>

        <button
          onClick={() => setTab('resolved')}
          className={`pb-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${
            tab === 'resolved'
              ? 'border-resolved-500 text-resolved-800 font-semibold'
              : 'border-transparent text-surface-500 hover:text-surface-800'
          }`}
        >
          <span>Resolved Audit History</span>
          <span className="px-1.5 py-0.5 rounded-full text-xxs font-mono bg-resolved-100 text-resolved-800">
            {resolvedConflicts.length}
          </span>
        </button>
      </div>

      {/* Tab Content: Active Conflicts */}
      {loading ? (
        <div className="card p-6">
          <SkeletonTable rows={4} />
        </div>
      ) : (
        <>
          {tab === 'active' && (
            <div className="space-y-4">
              {activeConflicts.length === 0 ? (
                <EmptyState
                  icon={<ShieldCheck size={28} className="text-resolved-500" />}
                  title="All conflicts resolved"
                  description="There are currently no contradictory assertions in this workspace. All queries return verified single sources."
                />
              ) : (
                activeConflicts.map((fact) => (
                  <div
                    key={fact.id}
                    className="card p-5 border-conflict-200/80 hover:border-conflict-300 transition-all space-y-4"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-xxs font-mono uppercase bg-conflict-100 text-conflict-800 font-semibold border border-conflict-300">
                            Unresolved Conflict
                          </span>
                          <span className="text-xs font-mono text-surface-400">
                            Fact ID: {fact.id}
                          </span>
                        </div>
                        <div className="mt-1 flex items-baseline gap-2">
                          <h3 className="text-base font-bold text-surface-900">{fact.entity}</h3>
                          <span className="text-surface-400">•</span>
                          <span className="text-sm font-mono text-surface-600">{fact.attribute}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          to={`/facts/${fact.id}`}
                          className="text-xs text-surface-500 hover:text-surface-900 px-3 py-1.5 rounded border border-surface-200 hover:bg-surface-100 inline-flex items-center gap-1"
                        >
                          <span>Lineage</span>
                          <ArrowRight size={12} />
                        </Link>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleResolve(fact)}
                          className="text-xs font-semibold"
                        >
                          Review & Resolve
                        </Button>
                      </div>
                    </div>

                    {/* Explicit Authority Notice */}
                    <p className="text-xxs text-surface-500 italic bg-surface-50 p-2 rounded border border-surface-200">
                      <span className="font-semibold text-surface-700">Reliability Rule:</span> Authority has not been established. Neither assertion is automatically favored over the other, regardless of recency or source type.
                    </p>

                    {/* Assertions Comparison Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {fact.assertions.map((assertion, idx) => (
                        <div
                          key={assertion.id}
                          className="p-3.5 rounded-lg border border-surface-200 bg-white space-y-2 relative"
                        >
                          <div className="flex items-center justify-between text-xxs font-mono text-surface-500">
                            <span className="font-semibold text-surface-600">
                              Assertion #{idx + 1}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-surface-100 text-surface-700">
                              {SOURCE_TYPE_LABELS[assertion.sourceType]}
                            </span>
                          </div>

                          <div className="text-base font-mono font-bold text-surface-900">
                            {assertion.value}
                          </div>

                          <div className="text-xxs font-mono text-surface-500 space-y-0.5 border-t border-surface-100 pt-2">
                            <div>
                              <span className="text-surface-400">Ref: </span>
                              <span className="text-surface-700">{assertion.sourceReference}</span>
                            </div>
                            <div>
                              <span className="text-surface-400">Label: </span>
                              <span className="text-surface-700">{assertion.sourceLabel}</span>
                            </div>
                            <div>
                              <span className="text-surface-400">Recorded: </span>
                              <span className="text-surface-700">{formatDateTime(assertion.recordedAt)}</span>
                            </div>
                          </div>

                          {assertion.notes && (
                            <p className="text-xxs text-surface-600 italic bg-surface-50 p-1.5 rounded">
                              "{assertion.notes}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab Content: Resolved History */}
          {tab === 'resolved' && (
            <div className="space-y-4">
              {resolvedConflicts.length === 0 ? (
                <EmptyState
                  title="No resolved facts yet"
                  description="Conflicts that have been explicitly reconciled by an operator will appear here with full audit reasons."
                />
              ) : (
                resolvedConflicts.map((fact) => {
                  const selectedAssertion = fact.assertions.find(a => a.id === fact.selectedAssertionId) || fact.assertions[0];
                  return (
                    <div key={fact.id} className="card p-5 border-surface-200 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-xxs font-mono uppercase bg-resolved-50 text-resolved-800 font-semibold border border-resolved-300 flex items-center gap-1">
                              <CheckCircle2 size={12} className="text-resolved-600" />
                              Explicitly Resolved
                            </span>
                            <span className="text-xs font-mono text-surface-400">
                              Fact ID: {fact.id}
                            </span>
                          </div>
                          <div className="mt-1 flex items-baseline gap-2">
                            <h3 className="text-base font-bold text-surface-900">{fact.entity}</h3>
                            <span className="text-surface-400">•</span>
                            <span className="text-sm font-mono text-surface-600">{fact.attribute}</span>
                          </div>
                        </div>

                        <Link
                          to={`/facts/${fact.id}`}
                          className="text-xs text-accent-600 hover:text-accent-700 inline-flex items-center gap-1 font-medium"
                        >
                          <span>Full Fact Lineage</span>
                          <ArrowRight size={12} />
                        </Link>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                        <div className="p-3 rounded bg-resolved-50/50 border border-resolved-200 space-y-1">
                          <span className="text-xxs uppercase text-resolved-700 font-semibold block">Authoritative Value</span>
                          <div className="text-sm font-bold text-surface-900">{selectedAssertion?.value}</div>
                          <div className="text-xxs text-surface-500">
                            Source: {SOURCE_TYPE_LABELS[selectedAssertion.sourceType]} ({selectedAssertion.sourceReference})
                          </div>
                        </div>

                        <div className="p-3 rounded bg-surface-50 border border-surface-200 space-y-1">
                          <span className="text-xxs uppercase text-surface-500 font-semibold block">Audit Trail</span>
                          <div className="text-surface-800 font-sans">{fact.resolutionReason}</div>
                          <div className="text-xxs text-surface-400">
                            Resolved by {fact.resolvedBy} on {formatDateTime(fact.resolvedAt || fact.updatedAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}

      {/* Resolve Conflict Modal */}
      <ResolveConflictModal
        isOpen={isResolveOpen}
        onClose={() => setIsResolveOpen(false)}
        fact={selectedFact}
        onFactResolved={handleFactResolved}
      />
    </div>
  );
}
