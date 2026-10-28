export type FactStatus = 'supported' | 'conflict' | 'resolved';

export type SourceType =
  | 'customer_email'
  | 'project_record'
  | 'crm_record'
  | 'invoice'
  | 'internal_document'
  | 'manual_entry';

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  customer_email: 'Customer Email',
  project_record: 'Project Record',
  crm_record: 'CRM Record',
  invoice: 'Invoice',
  internal_document: 'Internal Document',
  manual_entry: 'Manual Entry',
};

export interface FactAssertion {
  id: string;
  version?: number;
  value: string;
  sourceType: SourceType;
  sourceLabel: string;
  sourceReference: string;
  recordedAt: string;
  notes?: string;
}

export interface FactHistoryEvent {
  id: string;
  type: 'created' | 'assertion_added' | 'conflict_detected' | 'resolved';
  timestamp: string;
  description: string;
  assertionId?: string;
  reason?: string;
  resolvedBy?: string;
}

export interface Fact {
  id: string;
  entity: string;
  attribute: string;
  status: FactStatus;
  assertions: FactAssertion[];
  selectedAssertionId?: string;
  resolutionReason?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  history: FactHistoryEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateFactInput {
  entity: string;
  attribute: string;
  value: string;
  sourceType: SourceType;
  sourceLabel: string;
  sourceReference: string;
  recordedAt: string;
  notes?: string;
}

export interface ResolveFactInput {
  selectedAssertionId: string;
  assertionVersion?: number;
  resolutionReason: string;
  resolvedBy: string;
}

export interface QueryResult {
  status: 'supported' | 'conflict' | 'resolved' | 'ambiguous' | 'not_found';
  answer: string | null;
  entity?: string;
  attribute?: string;
  evidence: Array<{
    value: string;
    sourceType: SourceType;
    sourceLabel: string;
    sourceReference: string;
    recordedAt: string;
  }>;
  factId?: string;
  message?: string;
}

export interface DashboardMetrics {
  totalFacts: number;
  activeConflicts: number;
  resolvedFacts: number;
  supportedFacts: number;
  changesThisWeek: number;
  evidenceCoverage: number;
}
