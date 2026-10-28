import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Fact } from '../../types/facts';
import { SOURCE_TYPE_LABELS } from '../../types/facts';
import { FactStatusBadge } from './FactStatusBadge';
import { FactCard } from './FactCard';
import { formatDate } from '../../lib/formatting';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { ArrowRight, Search, X, ArrowUpDown } from 'lucide-react';

interface FactsTableProps {
  facts: Fact[];
  onResolveClick: (fact: Fact) => void;
  onAddFactClick?: () => void;
}

export function FactsTable({ facts, onResolveClick, onAddFactClick }: FactsTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest');

  const filteredFacts = useMemo(() => {
    return facts
      .filter((fact) => {
        const query = search.toLowerCase().trim();
        const matchesSearch =
          !query ||
          fact.entity.toLowerCase().includes(query) ||
          fact.attribute.toLowerCase().includes(query) ||
          fact.assertions.some(a => a.value.toLowerCase().includes(query));

        const matchesStatus =
          statusFilter === 'all' || fact.status === statusFilter;

        const matchesSource =
          sourceFilter === 'all' ||
          fact.assertions.some(a => a.sourceType === sourceFilter);

        return matchesSearch && matchesStatus && matchesSource;
      })
      .sort((a, b) => {
        const timeA = new Date(a.updatedAt).getTime();
        const timeB = new Date(b.updatedAt).getTime();
        return sortOrder === 'latest' ? timeB - timeA : timeA - timeB;
      });
  }, [facts, search, statusFilter, sourceFilter, sortOrder]);

  const hasActiveFilters = search || statusFilter !== 'all' || sourceFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setSourceFilter('all');
    setSortOrder('latest');
  };

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'conflict', label: 'Conflicts Only' },
    { value: 'supported', label: 'Supported Only' },
    { value: 'resolved', label: 'Resolved Only' },
  ];

  const sourceOptions = [
    { value: 'all', label: 'All Source Types' },
    ...Object.entries(SOURCE_TYPE_LABELS).map(([k, v]) => ({
      value: k,
      label: v,
    })),
  ];

  return (
    <div className="space-y-4">
      {/* Controls / Filter Bar */}
      <div className="card p-3 sm:p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="lg:col-span-5 relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400"
            />
            <input
              type="text"
              placeholder="Search entity, attribute, or value..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm border border-surface-300 rounded-md bg-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-accent-400"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs sm:text-sm border border-surface-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-accent-400"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Source Type Filter */}
          <div className="lg:col-span-3">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs sm:text-sm border border-surface-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-accent-400"
            >
              {sourceOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Sort Toggle */}
          <div className="lg:col-span-1 flex justify-end">
            <button
              onClick={() => setSortOrder(prev => prev === 'latest' ? 'oldest' : 'latest')}
              title={`Sorted by ${sortOrder === 'latest' ? 'newest first' : 'oldest first'}`}
              className="p-2 border border-surface-300 rounded-md hover:bg-surface-100 text-surface-600 text-xs flex items-center justify-center w-full"
            >
              <ArrowUpDown size={14} />
            </button>
          </div>
        </div>

        {/* Filter Summary & Reset */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-surface-100 text-xs text-surface-500">
            <span>
              Showing {filteredFacts.length} of {facts.length} facts
            </span>
            <button
              onClick={clearFilters}
              className="text-accent-600 hover:text-accent-800 font-medium inline-flex items-center gap-1"
            >
              <X size={12} />
              <span>Clear filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Empty State */}
      {filteredFacts.length === 0 && (
        <EmptyState
          title="No facts found"
          description={
            hasActiveFilters
              ? 'No facts match the selected filter criteria. Try adjusting your search query or filters.'
              : 'No business facts have been recorded in the reliability layer yet.'
          }
          action={
            hasActiveFilters
              ? { label: 'Clear filters', onClick: clearFilters }
              : onAddFactClick
              ? { label: 'Add First Fact', onClick: onAddFactClick }
              : undefined
          }
        />
      )}

      {/* Mobile Stacked Card View (hidden on desktop) */}
      <div className="md:hidden space-y-3">
        {filteredFacts.map((fact) => (
          <FactCard
            key={fact.id}
            fact={fact}
            onResolveClick={onResolveClick}
          />
        ))}
      </div>

      {/* Desktop / Tablet Data Table */}
      {filteredFacts.length > 0 && (
        <div className="hidden md:block card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-50 border-b border-surface-200 text-surface-600 font-mono uppercase text-xxs tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-semibold">Entity</th>
                  <th className="py-3 px-4 font-semibold">Attribute</th>
                  <th className="py-3 px-4 font-semibold">Current State</th>
                  <th className="py-3 px-3 font-semibold text-center">Assertions</th>
                  <th className="py-3 px-3 font-semibold text-center">Sources</th>
                  <th className="py-3 px-4 font-semibold">Last Recorded</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filteredFacts.map((fact) => {
                  const isConflict = fact.status === 'conflict';
                  const isResolved = fact.status === 'resolved';
                  const activeValue = isResolved
                    ? fact.assertions.find(a => a.id === fact.selectedAssertionId)?.value || fact.assertions[0]?.value
                    : isConflict
                    ? `${fact.assertions.length} conflicting values`
                    : fact.assertions[0]?.value;

                  const uniqueSources = new Set(fact.assertions.map(a => a.sourceType)).size;

                  return (
                    <tr
                      key={fact.id}
                      className="hover:bg-surface-50/80 transition-colors group"
                    >
                      <td className="py-3 px-4 font-medium text-surface-900">
                        <Link
                          to={`/facts/${fact.id}`}
                          className="hover:text-accent-600 font-semibold"
                        >
                          {fact.entity}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-surface-600 font-mono">
                        {fact.attribute}
                      </td>
                      <td className="py-3 px-4 font-mono max-w-[200px] truncate">
                        {isConflict ? (
                          <span className="text-conflict-700 font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-conflict-500 animate-pulse" />
                            Conflict ({fact.assertions.map(a => a.value).join(' vs ')})
                          </span>
                        ) : (
                          <span className="text-surface-800">{activeValue}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-surface-600">
                        {fact.assertions.length}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-surface-600">
                        {uniqueSources}
                      </td>
                      <td className="py-3 px-4 font-mono text-surface-500">
                        {formatDate(fact.updatedAt)}
                      </td>
                      <td className="py-3 px-4">
                        <FactStatusBadge status={fact.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isConflict && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => onResolveClick(fact)}
                              className="text-xxs py-1 px-2 text-conflict-700 border-conflict-300 hover:bg-conflict-50"
                            >
                              Resolve
                            </Button>
                          )}
                          <Link
                            to={`/facts/${fact.id}`}
                            className="p-1.5 text-surface-400 hover:text-accent-600 hover:bg-surface-100 rounded inline-flex items-center"
                            title="Inspect fact lineage"
                          >
                            <ArrowRight size={14} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
