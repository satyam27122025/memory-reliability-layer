import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  createFact,
  getFact,
  getFactHistory,
  listFacts,
  mapFactResponse,
  queryFacts,
  resolveFact,
} from './memoryApi';
import type { CreateFactInput, Fact } from '../types/facts';

const apiFact = {
  id: 'fact-1',
  entity: 'Acme',
  attribute: 'Delivery date',
  status: 'conflict' as const,
  assertions: [{
    id: 'assert-1',
    assertionVersion: 4,
    value: '  15 Nov 2026  ',
    sourceType: 'customer_email' as const,
    sourceLabel: 'Email',
    sourceReference: 'mail-1',
    recordedAt: '2026-10-28T10:00:00Z',
    notes: null,
  }],
  selectedAssertionId: null,
  resolutionReason: null,
  resolvedBy: null,
  resolvedAt: null,
  history: [{
    id: 'event-1',
    type: 'created' as const,
    timestamp: '2026-10-28T10:00:00Z',
    description: 'Created',
    assertionId: 'assert-1',
    reason: null,
    resolvedBy: null,
  }],
  createdAt: '2026-10-28T10:00:00Z',
  updatedAt: '2026-10-28T10:00:00Z',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('memory API adapter', () => {
  it('maps backend response fields and preserves assertion text, revision, and null query answers', async () => {
    const mapped = mapFactResponse(apiFact);
    expect(mapped.assertions[0].value).toBe('  15 Nov 2026  ');
    expect(mapped.assertions[0].version).toBe(4);
    expect(mapped.history[0].assertionId).toBe('assert-1');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      status: 'conflict',
      answer: null,
      evidence: [],
    })));
    await expect(queryFacts('Acme delivery')).resolves.toMatchObject({
      status: 'conflict',
      answer: null,
    });
  });

  it('uses GET /facts, GET /facts/{id}, and GET /facts/{id}/history', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ facts: [apiFact], total: 1 }))
      .mockResolvedValueOnce(jsonResponse(apiFact))
      .mockResolvedValueOnce(jsonResponse({ factId: 'fact-1', history: apiFact.history }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(listFacts()).resolves.toHaveLength(1);
    await expect(getFact('fact-1')).resolves.toMatchObject({ id: 'fact-1' });
    await expect(getFactHistory('fact-1')).resolves.toHaveLength(1);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'http://127.0.0.1:8000/facts',
      'http://127.0.0.1:8000/facts/fact-1',
      'http://127.0.0.1:8000/facts/fact-1/history',
    ]);
  });

  it('posts the fact payload without altering assertion text', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(apiFact, 201));
    vi.stubGlobal('fetch', fetchMock);
    const input: CreateFactInput = {
      entity: 'Acme',
      attribute: 'Delivery date',
      value: '  15 Nov 2026  ',
      sourceType: 'customer_email',
      sourceLabel: 'Email',
      sourceReference: 'mail-1',
      recordedAt: '2026-10-28T10:00:00Z',
    };

    await createFact(input);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/facts',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(input),
      }),
    );
  });

  it('posts assertion version and resolver fields when resolving', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ...apiFact, status: 'resolved' }));
    vi.stubGlobal('fetch', fetchMock);
    const resolvedFact: Fact = {
      ...mapFactResponse(apiFact),
      status: 'resolved',
    };
    await resolveFact(resolvedFact.id, {
      selectedAssertionId: 'assert-1',
      assertionVersion: 4,
      resolutionReason: 'Confirmed',
      resolvedBy: 'Operator',
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({
      selectedAssertionId: 'assert-1',
      assertionVersion: 4,
      resolutionReason: 'Confirmed',
      resolvedBy: 'Operator',
    });
  });

  it('surfaces HTTP status and backend detail for 404 and 409 errors', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ detail: 'Fact not found.' }, 404))
      .mockResolvedValueOnce(jsonResponse({ detail: 'Stale assertion version.' }, 409));
    vi.stubGlobal('fetch', fetchMock);
    await expect(getFact('missing')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      detail: 'Fact not found.',
    } satisfies Partial<ApiError>);
    await expect(resolveFact('fact-1', {
      selectedAssertionId: 'assert-1',
      resolutionReason: 'Confirmed',
      resolvedBy: 'Operator',
    })).rejects.toMatchObject({ status: 409, message: 'Stale assertion version.' });
  });

  it('reports network failures instead of switching to demo data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(listFacts()).rejects.toMatchObject({
      name: 'ApiError',
      status: null,
      message: expect.stringContaining('backend is running'),
    });
  });
});
