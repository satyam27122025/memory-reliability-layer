import { useState, useEffect } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import { getFact } from '../services/memoryApi';
import type { Fact } from '../types/facts';
import { FactStatusBadge } from '../components/facts/FactStatusBadge';
import { AssertionList } from '../components/facts/AssertionList';
import { HistoryTimeline } from '../components/facts/HistoryTimeline';
import { ResolveConflictModal } from '../components/facts/ResolveConflictModal';
import { Button } from '../components/ui/Button';
import { formatDateTime } from '../lib/formatting';
import { ArrowLeft, AlertTriangle, ShieldCheck, Clock, Layers, Hash } from 'lucide-react';

interface AppContextType {
  refreshMetrics: () => Promise<void>;
  addToast: (toast: { type: 'success' | 'error' | 'warning' | 'info'; title: string; description?: string }) => void;
}

export function FactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { refreshMetrics, addToast } = useOutletContext<AppContextType>();
  const [fact, setFact] = useState<Fact | null>(null);
  const [loading, setLoading] = useState(true);
  const [isResolveOpen, setIsResolveOpen] = useState(false);

  const loadFact = async () => {
    if (!id) return;
    try {
      const data = await getFact(id);
      setFact(data);
    } catch (err) {
      console.error('Failed to load fact:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFact();
  }, [id]);

  const handleFactResolved = async (updated: Fact) => {
    setFact(updated);
    await refreshMetrics();
    addToast({
      type: 'success',
      title: 'Fact Reconciled',
      description: `Authoritative assertion established for ${updated.entity}.`,
    });
  };

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-4">
        <div className="h-6 w-32 bg-surface-200 animate-pulse rounded" />
        <div className="h-10 w-96 bg-surface-200 animate-pulse rounded" />
        <div className="h-64 bg-surface-100 animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!fact) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center space-y-4">
        <h2 className="text-base font-semibold text-surface-900">Fact Record Not Found</h2>
        <p className="text-xs text-surface-500">
          No fact record matching ID <span className="font-mono text-surface-700">{id}</span> could be located.
        </p>
        <Link to="/facts">
          <Button variant="secondary" size="sm">Back to Facts Explorer</Button>
        </Link>
      </div>
    );
  }

  const isConflict = fact.status === 'conflict';
  const isResolved = fact.status === 'resolved';
  const selectedAssertion = fact.assertions.find(a => a.id === fact.selectedAssertionId) || fact.assertions[0];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Back breadcrumb */}
      <div>
        <Link
          to="/facts"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-surface-500 hover:text-surface-900 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Facts Explorer</span>
        </Link>
      </div>

      {/* Main Identity Header */}
      <div className="card p-5 sm:p-6 space-y-4 border-surface-200">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono text-surface-500 flex items-center gap-1">
                <Hash size={13} className="text-surface-400" />
                {fact.id}
              </span>
              <span className="text-surface-300">•</span>
              <FactStatusBadge status={fact.status} size="md" />
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-surface-900 tracking-tight">
              {fact.entity}
            </h1>
            <p className="text-sm font-mono text-surface-600">
              Attribute: <span className="font-semibold text-surface-800">{fact.attribute}</span>
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-2 text-xs font-mono text-surface-500">
            <div className="flex items-center gap-1.5">
              <Clock size={13} className="text-surface-400" />
              <span>Last updated: {formatDateTime(fact.updatedAt)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers size={13} className="text-surface-400" />
              <span>{fact.assertions.length} recorded assertions</span>
            </div>

            {isConflict && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsResolveOpen(true)}
                className="mt-2 text-xs font-semibold"
              >
                Resolve Conflict
              </Button>
            )}
          </div>
        </div>

        {/* Status Callout */}
        {isConflict && (
          <div className="p-3.5 bg-conflict-50 border border-conflict-200 rounded-lg flex items-start gap-3">
            <AlertTriangle size={18} className="text-conflict-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-conflict-900 leading-relaxed">
              <span className="font-semibold">Unresolved conflict:</span> Multiple authoritative sources have asserted disagreeing values for this attribute. AI agents querying this fact will refuse to guess until an operator selects an authoritative assertion.
            </div>
          </div>
        )}

        {isResolved && (
          <div className="p-3.5 bg-resolved-50 border border-resolved-200 rounded-lg flex items-start gap-3">
            <ShieldCheck size={18} className="text-resolved-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-resolved-900 leading-relaxed">
              <span className="font-semibold">Authoritative Value Selected:</span>{' '}
              <span className="font-mono font-bold">{selectedAssertion.value}</span>.
              <div className="mt-1 text-surface-700">
                Reason: "{fact.resolutionReason}" — by {fact.resolvedBy} on {formatDateTime(fact.resolvedAt || fact.updatedAt)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Assertions Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-surface-800 uppercase tracking-wider font-mono">
            Recorded Assertions ({fact.assertions.length})
          </h2>
          <span className="text-xxs font-mono text-surface-500">
            Immutable provenance audit
          </span>
        </div>

        <AssertionList
          assertions={fact.assertions}
          selectedAssertionId={fact.selectedAssertionId}
          isResolved={isResolved}
        />
      </div>

      {/* History Timeline */}
      <div className="card p-5 sm:p-6 space-y-4">
        <div className="border-b border-surface-200 pb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-surface-800 uppercase tracking-wider font-mono">
            Fact Lineage Audit Trail
          </h2>
          <span className="text-xxs font-mono text-surface-400">
            Append-only record
          </span>
        </div>

        <HistoryTimeline history={fact.history} />
      </div>

      {/* Resolve Conflict Modal */}
      <ResolveConflictModal
        isOpen={isResolveOpen}
        onClose={() => setIsResolveOpen(false)}
        fact={fact}
        onFactResolved={handleFactResolved}
      />
    </div>
  );
}

