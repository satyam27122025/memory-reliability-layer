import type { FactAssertion, SourceType } from '../../types/facts';
import { SOURCE_TYPE_LABELS } from '../../types/facts';
import { formatDateTime } from '../../lib/formatting';
import { Check, FileText, Mail, FileSpreadsheet, FileBox, Database, Edit3 } from 'lucide-react';

interface AssertionListProps {
  assertions: FactAssertion[];
  selectedAssertionId?: string;
  isResolved?: boolean;
}

const sourceIcons: Record<SourceType, React.ReactNode> = {
  customer_email: <Mail size={14} className="text-blue-600" />,
  project_record: <FileSpreadsheet size={14} className="text-emerald-600" />,
  crm_record: <Database size={14} className="text-purple-600" />,
  invoice: <FileBox size={14} className="text-amber-600" />,
  internal_document: <FileText size={14} className="text-cyan-600" />,
  manual_entry: <Edit3 size={14} className="text-stone-600" />,
};

export function AssertionList({
  assertions,
  selectedAssertionId,
  isResolved = false,
}: AssertionListProps) {
  return (
    <div className="space-y-3">
      {assertions.map((assertion, index) => {
        const isAuthoritative = isResolved && assertion.id === selectedAssertionId;
        const isAlternative = isResolved && assertion.id !== selectedAssertionId;

        return (
          <div
            key={assertion.id}
            className={`p-4 rounded-lg border transition-all ${
              isAuthoritative
                ? 'bg-resolved-50/40 border-resolved-300 ring-1 ring-resolved-200'
                : isAlternative
                ? 'bg-surface-50/80 border-surface-200 opacity-80'
                : 'bg-white border-surface-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1">
                {/* Header Tag */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xxs font-mono uppercase tracking-wider text-surface-500 font-semibold">
                    Assertion #{index + 1}
                  </span>
                  <span className="text-xxs font-mono text-surface-400">
                    Revision {assertion.version ?? 1}
                  </span>
                  
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-surface-100 text-surface-700 border border-surface-200">
                    {sourceIcons[assertion.sourceType]}
                    {SOURCE_TYPE_LABELS[assertion.sourceType]}
                  </span>

                  <span className="text-xxs font-mono text-surface-400">
                    ID: {assertion.id}
                  </span>

                  {isAuthoritative && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-resolved-100 text-resolved-800 border border-resolved-300">
                      <Check size={12} className="stroke-[3]" />
                      Authoritative (Selected)
                    </span>
                  )}

                  {isAlternative && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xxs font-mono bg-surface-200 text-surface-600">
                      Preserved in lineage
                    </span>
                  )}
                </div>

                {/* Asserted Value */}
                <div className="pt-1">
                  <span className="text-xs text-surface-500 block">Asserted Value:</span>
                  <span className="text-base font-semibold text-surface-900 tracking-tight font-mono">
                    {assertion.value}
                  </span>
                </div>

                {/* Notes if any */}
                {assertion.notes && (
                  <p className="text-xs text-surface-600 bg-surface-50/80 border border-surface-200/60 p-2 rounded italic">
                    "{assertion.notes}"
                  </p>
                )}
              </div>

              {/* Provenance Metadata Column */}
              <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-surface-200 text-xs font-mono text-surface-500 space-y-1 sm:min-w-[200px]">
                <div>
                  <span className="text-surface-400">Ref: </span>
                  <span className="text-surface-800 font-medium">{assertion.sourceReference}</span>
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
            </div>
          </div>
        );
      })}
    </div>
  );
}
