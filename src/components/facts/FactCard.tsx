import { Link } from 'react-router-dom';
import type { Fact } from '../../types/facts';
import { FactStatusBadge } from './FactStatusBadge';
import { formatDate } from '../../lib/formatting';
import { ArrowRight, AlertTriangle, Layers, Clock } from 'lucide-react';
import { Button } from '../ui/Button';

interface FactCardProps {
  fact: Fact;
  onResolveClick?: (fact: Fact) => void;
}

export function FactCard({ fact, onResolveClick }: FactCardProps) {
  const currentVal =
    fact.status === 'conflict'
      ? `${fact.assertions.length} conflicting values`
      : fact.status === 'resolved'
      ? fact.assertions.find(a => a.id === fact.selectedAssertionId)?.value || fact.assertions[0]?.value
      : fact.assertions[0]?.value || '—';

  return (
    <div className="card p-4 hover:border-surface-300 transition-all space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-surface-900">{fact.entity}</h3>
          <p className="text-xs font-mono text-surface-500 mt-0.5">{fact.attribute}</p>
        </div>
        <FactStatusBadge status={fact.status} />
      </div>

      <div className="p-2.5 rounded bg-surface-50 border border-surface-200/80 space-y-1">
        <span className="text-xxs font-mono uppercase text-surface-400 block">Current State</span>
        {fact.status === 'conflict' ? (
          <div className="flex items-center gap-1.5 text-conflict-700 font-medium text-xs">
            <AlertTriangle size={13} className="text-conflict-600" />
            <span>Unresolved conflict ({fact.assertions.map(a => a.value).join(' vs ')})</span>
          </div>
        ) : (
          <div className="font-mono text-xs font-semibold text-surface-800 truncate">
            {currentVal}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xxs font-mono text-surface-500 border-t border-surface-100 pt-2.5">
        <div className="flex items-center gap-1">
          <Layers size={12} className="text-surface-400" />
          <span>{fact.assertions.length} assertions ({fact.assertions.length} sources)</span>
        </div>
        <div className="flex items-center gap-1 justify-end">
          <Clock size={12} className="text-surface-400" />
          <span>{formatDate(fact.updatedAt)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1 border-t border-surface-100">
        <Link
          to={`/facts/${fact.id}`}
          className="text-xs font-medium text-accent-600 hover:text-accent-700 inline-flex items-center gap-1"
        >
          <span>Lineage & Detail</span>
          <ArrowRight size={12} />
        </Link>

        {fact.status === 'conflict' && onResolveClick && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onResolveClick(fact)}
            className="text-xs py-1 px-2.5 text-conflict-700 border-conflict-300 hover:bg-conflict-50"
          >
            Resolve
          </Button>
        )}
      </div>
    </div>
  );
}

