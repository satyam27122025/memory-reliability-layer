import type { Fact, CreateFactInput, ResolveFactInput, QueryResult } from '../types/facts';
import { DEMO_FACTS } from '../data/demoFacts';
import { generateId, generateAssertionId, generateEventId } from '../lib/formatting';

const STORAGE_KEY = 'memory-reliability-facts';

function loadFacts(): Fact[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Fall through to defaults
  }
  const defaults = structuredClone(DEMO_FACTS);
  saveFacts(defaults);
  return defaults;
}

function saveFacts(facts: Fact[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(facts));
}

// Simulated network delay for realistic UX
function delay(ms: number = 150): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function listFacts(): Promise<Fact[]> {
  await delay();
  return loadFacts();
}

export async function getFact(id: string): Promise<Fact | null> {
  await delay();
  const facts = loadFacts();
  return facts.find(f => f.id === id) || null;
}

export async function createFact(input: CreateFactInput): Promise<Fact> {
  await delay(200);
  const facts = loadFacts();
  const now = new Date().toISOString();
  const assertionId = generateAssertionId();

  // Check if a fact with the same entity+attribute already exists
  const existing = facts.find(
    f => f.entity.toLowerCase() === input.entity.toLowerCase() &&
         f.attribute.toLowerCase() === input.attribute.toLowerCase()
  );

  if (existing) {
    // Add as new assertion
    const newAssertion = {
      id: assertionId,
      value: input.value,
      sourceType: input.sourceType,
      sourceLabel: input.sourceLabel,
      sourceReference: input.sourceReference,
      recordedAt: input.recordedAt,
      notes: input.notes,
    };
    existing.assertions.push(newAssertion);
    
    // Check for conflict
    const uniqueValues = new Set(existing.assertions.map(a => a.value.toLowerCase()));
    if (uniqueValues.size > 1 && existing.status !== 'resolved') {
      existing.status = 'conflict';
      existing.history.push({
        id: generateEventId(),
        type: 'conflict_detected',
        timestamp: now,
        description: `Conflict detected: values differ across ${existing.assertions.length} sources`,
      });
    }
    
    existing.history.push({
      id: generateEventId(),
      type: 'assertion_added',
      timestamp: now,
      description: `New assertion added from ${input.sourceLabel}`,
      assertionId,
    });
    existing.updatedAt = now;
    
    saveFacts(facts);
    return existing;
  }

  const factId = generateId();
  const newFact: Fact = {
    id: factId,
    entity: input.entity,
    attribute: input.attribute,
    status: 'supported',
    assertions: [
      {
        id: assertionId,
        value: input.value,
        sourceType: input.sourceType,
        sourceLabel: input.sourceLabel,
        sourceReference: input.sourceReference,
        recordedAt: input.recordedAt,
        notes: input.notes,
      },
    ],
    history: [
      {
        id: generateEventId(),
        type: 'created',
        timestamp: now,
        description: `Fact created from ${input.sourceLabel}`,
        assertionId,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  facts.unshift(newFact);
  saveFacts(facts);
  return newFact;
}

export async function resolveFact(id: string, resolution: ResolveFactInput): Promise<Fact | null> {
  await delay(200);
  const facts = loadFacts();
  const fact = facts.find(f => f.id === id);
  if (!fact) return null;

  const now = new Date().toISOString();
  const selectedAssertion = fact.assertions.find(a => a.id === resolution.selectedAssertionId);

  fact.status = 'resolved';
  fact.selectedAssertionId = resolution.selectedAssertionId;
  fact.resolutionReason = resolution.resolutionReason;
  fact.resolvedBy = resolution.resolvedBy;
  fact.resolvedAt = now;
  fact.updatedAt = now;

  fact.history.push({
    id: generateEventId(),
    type: 'resolved',
    timestamp: now,
    description: `Resolved: ${selectedAssertion?.value || 'unknown'} selected by ${resolution.resolvedBy}`,
    reason: resolution.resolutionReason,
  });

  saveFacts(facts);
  return fact;
}

export async function getFactHistory(id: string): Promise<Fact['history']> {
  await delay();
  const fact = await getFact(id);
  return fact?.history || [];
}

export async function queryFacts(query: string): Promise<QueryResult> {
  await delay(300);
  const facts = loadFacts();
  const q = query.toLowerCase();

  // Simple keyword matching for demo
  const matched = facts.find(f => {
    const entityMatch = f.entity.toLowerCase().includes(q) || q.includes(f.entity.toLowerCase());
    const attrMatch = f.attribute.toLowerCase().includes(q) || q.includes(f.attribute.toLowerCase());
    return entityMatch || (entityMatch && attrMatch);
  });

  if (!matched) {
    return {
      status: 'not_found',
      answer: null,
      evidence: [],
    };
  }

  if (matched.status === 'conflict') {
    return {
      status: 'conflict',
      answer: null,
      entity: matched.entity,
      attribute: matched.attribute,
      factId: matched.id,
      evidence: matched.assertions.map(a => ({
        value: a.value,
        sourceType: a.sourceType,
        sourceLabel: a.sourceLabel,
        sourceReference: a.sourceReference,
        recordedAt: a.recordedAt,
      })),
    };
  }

  const selectedAssertion = matched.status === 'resolved'
    ? matched.assertions.find(a => a.id === matched.selectedAssertionId) || matched.assertions[0]
    : matched.assertions[0];

  return {
    status: 'supported',
    answer: `${matched.attribute} is ${selectedAssertion.value}.`,
    entity: matched.entity,
    attribute: matched.attribute,
    factId: matched.id,
    evidence: matched.assertions.map(a => ({
      value: a.value,
      sourceType: a.sourceType,
      sourceLabel: a.sourceLabel,
      sourceReference: a.sourceReference,
      recordedAt: a.recordedAt,
    })),
  };
}

export function resetToDefaults(): void {
  localStorage.removeItem(STORAGE_KEY);
}
