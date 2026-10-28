import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { getFact, resolveFact, ApiError } from '../../services/memoryApi';
import { formatDateTime } from '../../lib/formatting';
import { SOURCE_TYPE_LABELS, type Fact, type ResolveFactInput } from '../../types/facts';
import { CheckCircle2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { getRequestErrorMessage } from '../ui/RequestNotice';

interface ResolveConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  fact: Fact | null;
  onFactResolved: (updatedFact: Fact) => void;
}

export function ResolveConflictModal({
  isOpen,
  onClose,
  fact,
  onFactResolved,
}: ResolveConflictModalProps) {
  const [selectedAssertionId, setSelectedAssertionId] = useState<string>('');
  const [resolutionReason, setResolutionReason] = useState<string>('');
  const [resolvedBy, setResolvedBy] = useState<string>('Priya Sharma');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [displayFact, setDisplayFact] = useState<Fact | null>(fact);
  const [latestRevisionNotice, setLatestRevisionNotice] = useState('');

  React.useEffect(() => {
    if (isOpen && fact) {
      setDisplayFact(fact);
      // Don't auto-pick a default to force explicit authority declaration
      setSelectedAssertionId(fact.selectedAssertionId || '');
      setResolutionReason('');
      setResolvedBy('Priya Sharma');
      setError('');
      setLatestRevisionNotice('');
    }
  }, [isOpen, fact?.id]);

  const currentFact = displayFact || fact;
  if (!currentFact) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssertionId) {
      setError('Please explicitly select which assertion is authoritative.');
      return;
    }
    if (!resolutionReason.trim()) {
      setError('A resolution reason is required for audit compliance.');
      return;
    }
    if (!resolvedBy.trim()) {
      setError('Resolver identifier is required.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const resolution: ResolveFactInput = {
        selectedAssertionId,
        assertionVersion: currentFact.assertions.find(assertion => assertion.id === selectedAssertionId)?.version,
        resolutionReason: resolutionReason.trim(),
        resolvedBy: resolvedBy.trim(),
      };

      const updated = await resolveFact(currentFact.id, resolution);
      onFactResolved(updated);
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        try {
          const latest = await getFact(currentFact.id);
          setDisplayFact(latest);
          setSelectedAssertionId('');
          setLatestRevisionNotice('This fact changed after you opened the dialog. Review the latest assertions and select again before resolving.');
          window.dispatchEvent(new CustomEvent('memory:facts-changed'));
        } catch (refreshError) {
          setError(`The fact changed, but the latest version could not be loaded: ${getRequestErrorMessage(refreshError)}`);
        }
      } else {
        setError(getRequestErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Resolve Fact Conflict"
      subtitle={`Establish human authority for ${currentFact.entity} · ${currentFact.attribute}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="p-3 bg-conflict-50 border border-conflict-200 rounded-lg flex items-start gap-2.5">
          <AlertTriangle size={18} className="text-conflict-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-conflict-900 leading-relaxed">
            <span className="font-semibold">Notice:</span> Multiple sources disagree on the value of{' '}
            <span className="font-mono font-medium">{currentFact.attribute}</span>. Selecting an authoritative value
            will mark this fact as <strong>Resolved</strong> while preserving all historical assertions for auditability.
          </div>
        </div>

        {latestRevisionNotice && (
          <div role="status" className="p-3 bg-amber-50 text-amber-900 border border-amber-200 rounded-md text-xs">
            {latestRevisionNotice}
          </div>
        )}

        {/* Assertion Selection */}
        <div className="space-y-2.5">
          <label className="block text-xs font-semibold text-surface-700 uppercase tracking-wider font-mono">
            Select Authoritative Assertion <span className="text-error-500">*</span>
          </label>

          <div className="space-y-2">
            {currentFact.assertions.map((assertion, idx) => {
              const isSelected = selectedAssertionId === assertion.id;
              return (
                <div
                  key={assertion.id}
                  onClick={() => {
                    setSelectedAssertionId(assertion.id);
                    setError('');
                  }}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-accent-500 bg-accent-50/50 ring-1 ring-accent-400'
                      : 'border-surface-200 hover:border-surface-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        id={`assert-${assertion.id}`}
                        name="authoritativeAssertion"
                        checked={isSelected}
                        onChange={() => {
                          setSelectedAssertionId(assertion.id);
                          setError('');
                        }}
                        className="mt-1 text-accent-600 focus:ring-accent-400"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold text-surface-500">
                            Assertion #{idx + 1} · Revision {assertion.version ?? 1}
                          </span>
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-100 text-surface-700 border border-surface-200">
                            {SOURCE_TYPE_LABELS[assertion.sourceType]}
                          </span>
                        </div>
                        <div className="mt-1 text-base font-semibold text-surface-900">
                          {assertion.value}
                        </div>
                        <div className="mt-1 text-xs text-surface-500 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono">
                          <span>Ref: {assertion.sourceReference}</span>
                          <span>•</span>
                          <span>Label: {assertion.sourceLabel}</span>
                          <span>•</span>
                          <span>Recorded: {formatDateTime(assertion.recordedAt)}</span>
                        </div>
                        {assertion.notes && (
                          <div className="mt-2 text-xs italic text-surface-600 bg-surface-50 px-2.5 py-1 rounded">
                            "{assertion.notes}"
                          </div>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <CheckCircle2 size={18} className="text-accent-600 flex-shrink-0 mt-1" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resolution Reason & Author */}
        <div className="space-y-4 pt-2 border-t border-surface-200">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-surface-700">
              Resolution Reason <span className="text-error-500">*</span>
            </label>
            <textarea
              className="w-full px-3 py-2 text-sm border border-surface-300 rounded-md bg-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-accent-400"
              rows={2}
              placeholder="e.g. Confirmed with client delivery manager over phone call; project schedule was outdated."
              value={resolutionReason}
              onChange={(e) => {
                setResolutionReason(e.target.value);
                setError('');
              }}
              required
            />
            <p className="text-xxs text-surface-500">
              State why this assertion was determined to be authoritative.
            </p>
          </div>

          <Input
            label="Resolved By"
            value={resolvedBy}
            onChange={(e) => {
              setResolvedBy(e.target.value);
              setError('');
            }}
            placeholder="Operator name or service identifier"
            helpText="Identity logged to the immutable fact audit trail"
            required
          />
        </div>

        {error && (
          <div role="alert" className="p-2.5 bg-error-50 text-error-700 border border-error-200 rounded-md text-xs">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-200">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading} disabled={currentFact.status !== 'conflict'} className="gap-1.5">
            <ShieldCheck size={16} />
            <span>Confirm Resolution</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
