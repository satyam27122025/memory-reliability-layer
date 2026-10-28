import type { FactHistoryEvent } from '../../types/facts';
import { formatDateTime } from '../../lib/formatting';
import { PlusCircle, FileText, AlertTriangle, CheckCircle2, History } from 'lucide-react';

interface HistoryTimelineProps {
  history: FactHistoryEvent[];
}

const eventIcons = {
  created: <PlusCircle size={15} className="text-accent-600" />,
  assertion_added: <FileText size={15} className="text-surface-600" />,
  conflict_detected: <AlertTriangle size={15} className="text-conflict-600" />,
  resolved: <CheckCircle2 size={15} className="text-resolved-600" />,
};

const eventBadgeColors = {
  created: 'bg-accent-50 text-accent-700 border-accent-200',
  assertion_added: 'bg-surface-100 text-surface-700 border-surface-200',
  conflict_detected: 'bg-conflict-50 text-conflict-700 border-conflict-200',
  resolved: 'bg-resolved-50 text-resolved-700 border-resolved-200',
};

export function HistoryTimeline({ history }: HistoryTimelineProps) {
  if (!history || history.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-surface-500 font-mono">
        No event history logged.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-200">
      {history.map((evt, index) => (
        <div key={evt.id || index} className="relative group">
          {/* Timeline Dot/Icon */}
          <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-white border border-surface-300 flex items-center justify-center shadow-xs">
            {eventIcons[evt.type] || <History size={13} className="text-surface-500" />}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xxs font-mono font-medium border uppercase tracking-wider ${eventBadgeColors[evt.type]}`}>
                {evt.type.replace('_', ' ')}
              </span>

              <span className="text-xxs font-mono text-surface-400">
                {formatDateTime(evt.timestamp)}
              </span>

              {evt.assertionId && (
                <span className="text-xxs font-mono text-surface-400">
                  Target: {evt.assertionId}
                </span>
              )}
            </div>

            <p className="text-xs text-surface-800 font-medium">
              {evt.description}
            </p>

            {evt.reason && (
              <div className="mt-1 text-xs text-surface-600 bg-surface-50 border border-surface-200 p-2 rounded">
                <span className="font-semibold text-surface-700">Audit Reason: </span>
                <span>{evt.reason}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

