import { Link } from 'react-router-dom';
import type { Fact } from '../../types/facts';
import { formatDate } from '../../lib/formatting';
import { AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';

interface AttentionListProps {
  conflicts: Fact[];
  onReviewConflict: (fact: Fact) => void;
}

export function AttentionList({ conflicts, onReviewConflict }: AttentionListProps) {
  if (conflicts.length === 0) {
    return (
      <div className="card p-6 text-center space-y-2">
        <div className="w-10 h-10 rounded-full bg-resolved-50 border border-resolved-200 text-resolved-600 flex items-center justify-center mx-auto">
          <ShieldCheck size={20} />
        </div>
        <h4 className="text-sm font-semibold text-surface-900">Zero Unresolved Conflicts</h4>
        <p className="text-xs text-surface-500 max-w-sm mx-auto">
          All asserted facts have single sources or have been explicitly resolved by human operators.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-surface-200 flex items-center justify-between bg-surface-50">
        <div className="flex items-center gap-2">
          <AlertTriangle size={15} className="text-conflict-600" />
          <h3 className="text-xs font-semibold text-surface-800 uppercase tracking-wider font-mono">
            Needs Attention ({conflicts.length})
          </h3>
        </div>
        <Link
          to="/conflicts"
          className="text-xs font-medium text-accent-600 hover:text-accent-700 inline-flex items-center gap-1 font-mono"
        >
          <span>View all</span>
          <ArrowRight size={12} />
        </Link>
      </div>

      <div className="divide-y divide-surface-100">
        {conflicts.map((fact) => {
          const conflictingValues = fact.assertions.map(a => a.value).join(' vs ');
          return (
            <div
              key={fact.id}
              className="p-4 hover:bg-surface-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/facts/${fact.id}`}
                    className="text-sm font-semibold text-surface-900 hover:text-accent-600 truncate"
                  >
                    {fact.entity}
                  </Link>
                  <span className="text-xs font-mono text-surface-500">•</span>
                  <span className="text-xs font-mono text-surface-600">{fact.attribute}</span>
                </div>

                <div className="text-xs font-mono text-conflict-700 flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-conflict-500 flex-shrink-0" />
                  <span className="truncate">{conflictingValues}</span>
                </div>

                <div className="text-xxs font-mono text-surface-400 flex items-center gap-3">
                  <span>{fact.assertions.length} sources</span>
                  <span>•</span>
                  <span>Recorded {formatDate(fact.updatedAt)}</span>
                  <span>•</span>
                  <span className="text-conflict-600 font-semibold">Conflict detected</span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onReviewConflict(fact)}
                  className="text-xs text-conflict-700 border-conflict-300 hover:bg-conflict-50"
                >
                  Review
                </Button>
                <Link
                  to={`/facts/${fact.id}`}
                  className="p-1.5 text-surface-400 hover:text-surface-700 hover:bg-surface-100 rounded"
                  title="View fact"
                >
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

