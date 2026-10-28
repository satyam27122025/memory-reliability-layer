import type {
  CreateFactInput,
  Fact,
  FactHistoryEvent,
  QueryResult,
  ResolveFactInput,
  SourceType,
} from '../types/facts';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000')
  .trim()
  .replace(/\/+$/, '');

interface ApiAssertion {
  id: string;
  assertionVersion?: number;
  value: string;
  sourceType: SourceType;
  sourceLabel: string;
  sourceReference: string;
  recordedAt: string;
  notes?: string | null;
  createdAt?: string;
}

interface ApiHistoryEvent {
  id: string;
  type: FactHistoryEvent['type'];
  timestamp: string;
  description: string;
  assertionId?: string | null;
  reason?: string | null;
  resolvedBy?: string | null;
}

interface ApiFact {
  id: string;
  entity: string;
  attribute: string;
  status: Fact['status'];
  assertions: ApiAssertion[];
  selectedAssertionId?: string | null;
  resolutionReason?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  history: ApiHistoryEvent[];
  createdAt: string;
  updatedAt: string;
}

export class ApiError extends Error {
  readonly status: number | null;
  readonly detail: unknown;

  constructor(message: string, status: number | null, detail?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

function mapHistory(event: ApiHistoryEvent): FactHistoryEvent {
  return {
    id: event.id,
    type: event.type,
    timestamp: event.timestamp,
    description: event.description,
    assertionId: event.assertionId ?? undefined,
    reason: event.reason ?? undefined,
    resolvedBy: event.resolvedBy ?? undefined,
  };
}

export function mapFactResponse(response: ApiFact): Fact {
  return {
    id: response.id,
    entity: response.entity,
    attribute: response.attribute,
    status: response.status,
    assertions: response.assertions.map(assertion => ({
      id: assertion.id,
      version: assertion.assertionVersion ?? 1,
      value: assertion.value,
      sourceType: assertion.sourceType,
      sourceLabel: assertion.sourceLabel,
      sourceReference: assertion.sourceReference,
      recordedAt: assertion.recordedAt,
      notes: assertion.notes ?? undefined,
    })),
    selectedAssertionId: response.selectedAssertionId ?? undefined,
    resolutionReason: response.resolutionReason ?? undefined,
    resolvedBy: response.resolvedBy ?? undefined,
    resolvedAt: response.resolvedAt ?? undefined,
    history: response.history.map(mapHistory),
    createdAt: response.createdAt,
    updatedAt: response.updatedAt,
  };
}

function backendDetail(payload: unknown): unknown {
  if (typeof payload === 'object' && payload !== null && 'detail' in payload) {
    return (payload as { detail: unknown }).detail;
  }
  return payload;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(
      'Could not reach the Memory Reliability API. Check that the backend is running and retry.',
      null,
      error instanceof Error ? error.message : undefined,
    );
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => undefined)
    : await response.text().catch(() => '');

  if (!response.ok) {
    const detail = backendDetail(payload);
    const message = typeof detail === 'string'
      ? detail
      : detail !== undefined
      ? `${JSON.stringify(detail)} (HTTP ${response.status})`
      : `The API request failed with HTTP ${response.status}.`;
    throw new ApiError(message, response.status, detail);
  }

  return payload as T;
}

function notifyFactsChanged(): void {
  window.dispatchEvent(new CustomEvent('memory:facts-changed'));
}

export async function listFacts(options: { signal?: AbortSignal } = {}): Promise<Fact[]> {
  const response = await request<{ facts: ApiFact[]; total: number }>('/facts', {
    signal: options.signal,
  });
  return response.facts.map(mapFactResponse);
}

export async function getFact(id: string, options: { signal?: AbortSignal } = {}): Promise<Fact> {
  const response = await request<ApiFact>(`/facts/${encodeURIComponent(id)}`, {
    signal: options.signal,
  });
  return mapFactResponse(response);
}

export async function getFactHistory(
  id: string,
  options: { signal?: AbortSignal } = {},
): Promise<FactHistoryEvent[]> {
  const response = await request<{ factId: string; history: ApiHistoryEvent[] }>(
    `/facts/${encodeURIComponent(id)}/history`,
    { signal: options.signal },
  );
  return response.history.map(mapHistory);
}

export async function createFact(input: CreateFactInput): Promise<Fact> {
  const response = await request<ApiFact>('/facts', {
    method: 'POST',
    body: JSON.stringify({
      entity: input.entity,
      attribute: input.attribute,
      value: input.value,
      sourceType: input.sourceType,
      sourceLabel: input.sourceLabel,
      sourceReference: input.sourceReference,
      recordedAt: input.recordedAt,
      notes: input.notes,
    }),
  });
  const fact = mapFactResponse(response);
  notifyFactsChanged();
  return fact;
}

export async function updateFact(
  id: string,
  input: Partial<CreateFactInput> & { assertionId?: string; assertionVersion?: number },
): Promise<Fact> {
  const response = await request<ApiFact>(`/facts/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({
      assertionId: input.assertionId,
      assertionVersion: input.assertionVersion,
      value: input.value,
      sourceType: input.sourceType,
      sourceLabel: input.sourceLabel,
      sourceReference: input.sourceReference,
      recordedAt: input.recordedAt,
      notes: input.notes,
    }),
  });
  const fact = mapFactResponse(response);
  notifyFactsChanged();
  return fact;
}

export async function resolveFact(id: string, resolution: ResolveFactInput): Promise<Fact> {
  const response = await request<ApiFact>(`/facts/${encodeURIComponent(id)}/resolve`, {
    method: 'POST',
    body: JSON.stringify({
      selectedAssertionId: resolution.selectedAssertionId,
      assertionVersion: resolution.assertionVersion,
      resolutionReason: resolution.resolutionReason,
      resolvedBy: resolution.resolvedBy,
    }),
  });
  const fact = mapFactResponse(response);
  notifyFactsChanged();
  return fact;
}

export async function queryFacts(
  query: string,
  options: { signal?: AbortSignal } = {},
): Promise<QueryResult> {
  const response = await request<{
    status: QueryResult['status'];
    answer: string | null;
    entity?: string | null;
    attribute?: string | null;
    factId?: string | null;
    message?: string | null;
    evidence: QueryResult['evidence'];
  }>('/query', {
    method: 'POST',
    body: JSON.stringify({ query }),
    signal: options.signal,
  });
  return {
    status: response.status,
    answer: response.answer,
    entity: response.entity ?? undefined,
    attribute: response.attribute ?? undefined,
    factId: response.factId ?? undefined,
    message: response.message ?? undefined,
    evidence: response.evidence,
  };
}

export async function healthCheck(options: { signal?: AbortSignal } = {}): Promise<{ status: string }> {
  return request<{ status: string }>('/health', { signal: options.signal });
}
