import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { createFact } from '../../services/memoryApi';
import type { SourceType, CreateFactInput } from '../../types/facts';

interface AddFactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFactCreated: () => void;
  initialEntity?: string;
  initialAttribute?: string;
}

const sourceOptions: { value: SourceType; label: string }[] = [
  { value: 'customer_email', label: 'Customer Email' },
  { value: 'project_record', label: 'Project Record' },
  { value: 'crm_record', label: 'CRM Record' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'internal_document', label: 'Internal Document' },
  { value: 'manual_entry', label: 'Manual Entry' },
];

export function AddFactModal({
  isOpen,
  onClose,
  onFactCreated,
  initialEntity = '',
  initialAttribute = '',
}: AddFactModalProps) {
  const [entity, setEntity] = useState(initialEntity);
  const [attribute, setAttribute] = useState(initialAttribute);
  const [value, setValue] = useState('');
  const [sourceType, setSourceType] = useState<SourceType>('customer_email');
  const [sourceLabel, setSourceLabel] = useState('');
  const [sourceReference, setSourceReference] = useState('');
  const [recordedAt, setRecordedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Sync props when opened
  React.useEffect(() => {
    if (isOpen) {
      if (initialEntity) setEntity(initialEntity);
      if (initialAttribute) setAttribute(initialAttribute);
      if (!sourceLabel) {
        setSourceLabel('Client correspondence');
        setSourceReference('ref-' + Math.floor(100 + Math.random() * 900));
      }
    }
  }, [isOpen, initialEntity, initialAttribute]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!entity.trim()) errs.entity = 'Entity name is required.';
    if (!attribute.trim()) errs.attribute = 'Attribute name is required.';
    if (!value.trim()) errs.value = 'Asserted fact value is required.';
    if (!sourceType) errs.sourceType = 'Source type must be selected.';
    if (!sourceLabel.trim()) errs.sourceLabel = 'Source label is required.';
    if (!recordedAt) errs.recordedAt = 'Recorded timestamp is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const input: CreateFactInput = {
        entity: entity.trim(),
        attribute: attribute.trim(),
        value: value.trim(),
        sourceType,
        sourceLabel: sourceLabel.trim(),
        sourceReference: sourceReference.trim() || `ref-${Date.now().toString(36)}`,
        recordedAt: new Date(recordedAt).toISOString(),
        notes: notes.trim() || undefined,
      };

      await createFact(input);
      onFactCreated();
      onClose();
      // Reset form
      setEntity('');
      setAttribute('');
      setValue('');
      setNotes('');
      setErrors({});
    } catch (err) {
      console.error('Failed to create fact:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Fact Assertion"
      subtitle="Register an asserted business fact backed by an immutable source record."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Entity"
            placeholder="e.g. Acme Corporation, Tata Digital"
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            error={errors.entity}
            helpText="Organization, project, or domain subject"
            required
          />

          <Input
            label="Attribute"
            placeholder="e.g. Delivery date, Payment status"
            value={attribute}
            onChange={(e) => setAttribute(e.target.value)}
            error={errors.attribute}
            helpText="Business property or field name"
            required
          />
        </div>

        <Input
          label="Asserted Value"
          placeholder="e.g. 15 November 2026, Paid, ₹45,00,000"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          error={errors.value}
          helpText="The exact value asserted by the source document"
          required
        />

        <div className="p-3.5 bg-surface-50 border border-surface-200 rounded-lg space-y-3">
          <div className="text-xs font-semibold text-surface-700 uppercase tracking-wider font-mono">
            Source Provenance
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Source Type"
              options={sourceOptions}
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as SourceType)}
              error={errors.sourceType}
              required
            />

            <Input
              label="Source Label"
              placeholder="e.g. Customer delivery confirmation"
              value={sourceLabel}
              onChange={(e) => setSourceLabel(e.target.value)}
              error={errors.sourceLabel}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Source Reference ID"
              placeholder="e.g. email-demo-001, inv-2026-90"
              value={sourceReference}
              onChange={(e) => setSourceReference(e.target.value)}
              helpText="Deterministic artifact identifier"
            />

            <Input
              label="Recorded Timestamp"
              type="datetime-local"
              value={recordedAt}
              onChange={(e) => setRecordedAt(e.target.value)}
              error={errors.recordedAt}
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-surface-700">
            Audit Notes (Optional)
          </label>
          <textarea
            className="w-full px-3 py-2 text-sm border border-surface-300 rounded-md bg-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-accent-400"
            rows={2}
            placeholder="Context surrounding this assertion, e.g. client requested expedited schedule during meeting"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-200">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Submit Assertion
          </Button>
        </div>
      </form>
    </Modal>
  );
}

