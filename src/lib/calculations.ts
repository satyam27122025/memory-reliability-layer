import type { Fact, DashboardMetrics } from '../types/facts';

export function calculateMetrics(facts: Fact[]): DashboardMetrics {
  const totalFacts = facts.length;
  const activeConflicts = facts.filter(f => f.status === 'conflict').length;
  const resolvedFacts = facts.filter(f => f.status === 'resolved').length;
  const supportedFacts = facts.filter(f => f.status === 'supported').length;

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const changesThisWeek = facts.filter(
    f => new Date(f.updatedAt) >= oneWeekAgo
  ).length;

  const factsWithMultipleSources = facts.filter(f => f.assertions.length > 1).length;
  const evidenceCoverage = totalFacts > 0
    ? Math.round((factsWithMultipleSources / totalFacts) * 100)
    : 0;

  return {
    totalFacts,
    activeConflicts,
    resolvedFacts,
    supportedFacts,
    changesThisWeek,
    evidenceCoverage,
  };
}
