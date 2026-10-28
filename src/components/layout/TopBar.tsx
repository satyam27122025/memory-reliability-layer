import { Menu, Plus, AlertTriangle, Terminal } from 'lucide-react';
import { Button } from '../ui/Button';

interface TopBarProps {
  onMenuClick: () => void;
  onOpenAddFact: () => void;
  activeConflicts: number;
}

export function TopBar({ onMenuClick, onOpenAddFact, activeConflicts }: TopBarProps) {
  return (
    <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-surface-200">
      <div className="flex items-center justify-between h-14 px-4 sm:px-6">
        {/* Left: Mobile Toggle & Page Context */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="md:hidden p-1.5 text-surface-600 hover:text-surface-900 hover:bg-surface-100 rounded-md transition-colors"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>
          
          <div className="flex items-center gap-2 text-xs font-mono text-surface-500">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-100 border border-surface-200 text-surface-700">
              <Terminal size={12} className="text-accent-600" />
              memory-api://sqlite
            </span>
            <span className="hidden lg:inline text-surface-400">/</span>
            <span className="hidden lg:inline text-surface-600">backend-authoritative</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {activeConflicts > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded-md bg-conflict-50 text-conflict-700 border border-conflict-200">
              <AlertTriangle size={13} className="text-conflict-600 animate-pulse" />
              <span>{activeConflicts} {activeConflicts === 1 ? 'conflict' : 'conflicts'} unresolved</span>
            </div>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={onOpenAddFact}
            className="text-xs font-semibold"
          >
            <Plus size={14} />
            <span>Add Fact</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
