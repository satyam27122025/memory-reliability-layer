import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { listFacts } from '../services/memoryApi';
import type { Fact } from '../types/facts';
import { FactsTable } from '../components/facts/FactsTable';
import { ResolveConflictModal } from '../components/facts/ResolveConflictModal';
import { SkeletonTable } from '../components/ui/Skeleton';
import { Database, Plus } from 'lucide-react';
import { Button } from '../components/ui/Button';

interface AppContextType {
  refreshMetrics: () => Promise<void>;
  addToast: (toast: { type: 'success' | 'error' | 'warning' | 'info'; title: string; description?: string }) => void;
  openAddFactModal: () => void;
}

export function FactsPage() {
  const { refreshMetrics, addToast, openAddFactModal } = useOutletContext<AppContextType>();
  const [facts, setFacts] = useState<Fact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFact, setSelectedFact] = useState<Fact | null>(null);
  const [isResolveOpen, setIsResolveOpen] = useState(false);

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

  const handleResolveClick = (fact: Fact) => {
    setSelectedFact(fact);
    setIsResolveOpen(true);
  };

  const handleFactResolved = async (updated: Fact) => {
    await loadData();
    await refreshMetrics();
    addToast({
      type: 'success',
      title: 'Fact Conflict Resolved',
      description: `${updated.entity} · ${updated.attribute} marked as resolved.`,
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Database size={20} className="text-accent-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-surface-900 tracking-tight">
              Facts Explorer
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-surface-500 mt-1">
            Browse, search, and verify all immutable business facts across disparate data sources.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={openAddFactModal}
          className="self-start sm:self-auto text-xs"
        >
          <Plus size={14} />
          <span>New Fact Assertion</span>
        </Button>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="card p-6">
          <SkeletonTable rows={6} />
        </div>
      ) : (
        <FactsTable
          facts={facts}
          onResolveClick={handleResolveClick}
          onAddFactClick={openAddFactModal}
        />
      )}

      {/* Resolve Modal */}
      <ResolveConflictModal
        isOpen={isResolveOpen}
        onClose={() => setIsResolveOpen(false)}
        fact={selectedFact}
        onFactResolved={handleFactResolved}
      />
    </div>
  );
}

