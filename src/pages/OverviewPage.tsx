import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { calculateMetrics } from '../lib/calculations';
import type { Fact } from '../types/facts';
import { useFacts } from '../hooks/useFacts';
import { MetricCard } from '../components/dashboard/MetricCard';
import { QueryPanel } from '../components/dashboard/QueryPanel';
import { AttentionList } from '../components/dashboard/AttentionList';
import { RecentChanges } from '../components/dashboard/RecentChanges';
import { MemoryTopology } from '../components/dashboard/MemoryTopology';
import { ResolveConflictModal } from '../components/facts/ResolveConflictModal';
import { SkeletonCard } from '../components/ui/Skeleton';
import { Database, AlertTriangle, ShieldCheck, FileCheck, Activity } from 'lucide-react';
import { RequestNotice } from '../components/ui/RequestNotice';
import { EmptyState } from '../components/ui/EmptyState';

interface AppContextType {
  refreshMetrics: () => Promise<void>;
  addToast: (toast: { type: 'success' | 'error' | 'warning' | 'info'; title: string; description?: string }) => void;
  openAddFactModal: () => void;
}

export function OverviewPage() {
  const { refreshMetrics, addToast } = useOutletContext<AppContextType>();
  const { facts, loading, error, refresh: loadData } = useFacts();
  const metrics = calculateMetrics(facts);
  const [selectedConflictFact, setSelectedConflictFact] = useState<Fact | null>(null);
  const [isResolveOpen, setIsResolveOpen] = useState(false);

  const handleReviewConflict = (fact: Fact) => {
    setSelectedConflictFact(fact);
    setIsResolveOpen(true);
  };

  const handleFactResolved = async (updatedFact: Fact) => {
    await loadData();
    await refreshMetrics();
    addToast({
      type: 'success',
      title: 'Conflict Resolved',
      description: `${updatedFact.entity} · ${updatedFact.attribute} marked as authoritative.`,
    });
  };

  const conflicts = facts.filter(f => f.status === 'conflict');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-surface-900 tracking-tight">
              Memory Reliability
            </h1>
            <span className="px-2 py-0.5 rounded text-xxs font-mono font-medium bg-surface-200 text-surface-700">
              Live API · SQLite
            </span>
          </div>
          <p className="text-xs sm:text-sm text-surface-500 mt-1">
            Track business facts, source evidence, changes, and unresolved conflicts.
          </p>
        </div>
      </div>

      {error ? (
        <RequestNotice error={error} onRetry={() => void loadData()} />
      ) : null}

      {/* Summary Metrics Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <MetricCard
            label="Facts Tracked"
            value={metrics.totalFacts}
            subtext="Immutable core records"
            icon={<Database size={16} />}
            badge="Live"
            badgeType="default"
          />
          <MetricCard
            label="Active Conflicts"
            value={metrics.activeConflicts}
            subtext="Needs human verification"
            icon={<AlertTriangle size={16} />}
            badge={metrics.activeConflicts > 0 ? 'Action Req' : 'Clear'}
            badgeType={metrics.activeConflicts > 0 ? 'conflict' : 'resolved'}
          />
          <MetricCard
            label="Resolved Facts"
            value={metrics.resolvedFacts}
            subtext="Audit-trail confirmed"
            icon={<ShieldCheck size={16} />}
            badge="Audited"
            badgeType="resolved"
          />
          <MetricCard
            label="Evidence Coverage"
            value={`${metrics.evidenceCoverage}%`}
            subtext="Multi-source assertions"
            icon={<FileCheck size={16} />}
            badge="Lineage"
            badgeType="accent"
          />
          <MetricCard
            label="Changes This Week"
            value={metrics.changesThisWeek}
            subtext="Assertions & audits"
            icon={<Activity size={16} />}
            badge="7 days"
            badgeType="default"
          />
        </div>
      )}

      {/* Query Console */}
      <QueryPanel onResolveConflict={(id) => {
        const fact = facts.find(f => f.id === id);
        if (fact) handleReviewConflict(fact);
      }} />

      {/* Memory Topology Graph */}
      <MemoryTopology
        facts={facts}
        onSelectFact={(fact) => {
          if (fact.status === 'conflict') {
            handleReviewConflict(fact);
          }
        }}
      />

      {!loading && !error && facts.length === 0 && (
        <EmptyState
          title="No backend facts yet"
          description="Add a fact to populate dashboard metrics, evidence, and topology from SQLite."
        />
      )}

      {/* Two Column Grid: Needs Attention vs Recent Changes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7">
          <AttentionList
            conflicts={conflicts}
            onReviewConflict={handleReviewConflict}
          />
        </div>

        <div className="lg:col-span-5">
          <RecentChanges facts={facts} />
        </div>
      </div>

      {/* Conflict Resolution Modal */}
      <ResolveConflictModal
        isOpen={isResolveOpen}
        onClose={() => setIsResolveOpen(false)}
        fact={selectedConflictFact}
        onFactResolved={handleFactResolved}
      />
    </div>
  );
}
