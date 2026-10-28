import { Link } from 'react-router-dom';
import type { Fact } from '../../types/facts';
import { formatRelativeTime } from '../../lib/formatting';
import { History, PlusCircle, AlertTriangle, CheckCircle2, FileText } from 'lucide-react';

interface RecentChangesProps {
  facts: Fact[];
}

export function RecentChanges({ facts }: RecentChangesProps) {
  // Flatten events across all facts with fact metadata
  const events = facts
    .flatMap(fact =>
      fact.history.map(evt => ({
        ...evt,
        factId: fact.id,
        entity: fact.entity,
        attribute: fact.attribute,
      }))
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 7);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'created':
        return <PlusCircle size={14} className="text-accent-500" />;
      case 'assertion_added':
        return <FileText size={14} className="text-surface-500" />;
      case 'conflict_detected':
        return <AlertTriangle size={14} className="text-conflict-500" />;
      case 'resolved':
        return <CheckCircle2 size={14} className="text-resolved-500" />;
      default:
        return <History size={14} className="text-surface-400" />;
    }
  };

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-surface-200 flex items-center justify-between bg-surface-50">
        <div className="flex items-center gap-2">
          <History size={15} className="text-surface-600" />
          <h3 className="text-xs font-semibold text-surface-800 uppercase tracking-wider font-mono">
            Recent Audit Stream
          </h3>
        </div>
        <span className="text-xxs font-mono text-surface-500">Live events</span>
      </div>

      <div className="divide-y divide-surface-100">
        {events.map((evt) => (
          <div
            key={evt.id}
            className="p-3.5 hover:bg-surface-50/50 transition-colors flex items-start gap-3 text-xs"
          >
            <div className="mt-0.5 flex-shrink-0">{getEventIcon(evt.type)}</div>
            
            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="flex items-center justify-between gap-2">
                <Link
                  to={`/facts/${evt.factId}`}
                  className="font-medium text-surface-900 hover:text-accent-600 truncate"
                >
                  {evt.entity} · <span className="font-mono text-surface-600">{evt.attribute}</span>
                </Link>
                <span className="text-xxs font-mono text-surface-400 flex-shrink-0">
                  {formatRelativeTime(evt.timestamp)}
                </span>
              </div>
              
              <p className="text-surface-600 text-xxs leading-relaxed font-mono truncate">
                {evt.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
