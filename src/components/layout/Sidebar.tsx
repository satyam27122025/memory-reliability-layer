import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Database, AlertTriangle, Layers, X, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeConflicts: number;
  totalFacts: number;
  resolvedFacts: number;
}

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Overview', end: true },
  { to: '/facts', icon: Database, label: 'Facts Explorer' },
  { to: '/conflicts', icon: AlertTriangle, label: 'Conflicts' },
];

export function Sidebar({ isOpen, onClose, activeConflicts, totalFacts, resolvedFacts }: SidebarProps) {
  const sidebarContent = (
    <div className="flex flex-col h-full bg-surface-950 text-surface-400 w-64 border-r border-surface-900 select-none">
      {/* Brand Header */}
      <div className="px-5 py-5 border-b border-surface-900">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-500/15 border border-accent-500/30 flex items-center justify-center text-accent-400">
            <Layers size={18} />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-surface-100 tracking-tight flex items-center gap-1.5">
              Memory Reliability
            </h1>
            <p className="text-xxs font-mono text-surface-500 tracking-wider uppercase mt-0.5">
              Kernel v0.1.0 · Stage 1
            </p>
          </div>
        </div>

        {/* Workspace Pill */}
        <div className="mt-3.5 px-2.5 py-1.5 rounded bg-surface-900/80 border border-surface-800/80 flex items-center justify-between">
          <span className="text-xs text-surface-300 font-medium truncate">Demo workspace</span>
          <span className="text-xxs font-mono text-accent-400 bg-accent-500/10 px-1.5 py-0.5 rounded border border-accent-400/20">
            Synthetic
          </span>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Main Navigation">
        <div className="px-2 pb-2 text-xxs font-mono uppercase tracking-wider text-surface-600">
          Operations
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition-all ${
                isActive
                  ? 'text-accent-400 bg-accent-500/10 border-l-2 border-accent-400 font-semibold'
                  : 'text-surface-400 hover:text-surface-200 hover:bg-surface-900/60'
              }`
            }
          >
            <item.icon size={16} />
            <span className="flex-1">{item.label}</span>
            {item.label === 'Conflicts' && activeConflicts > 0 && (
              <span className="text-xxs font-mono px-1.5 py-0.5 rounded-full bg-conflict-500/20 text-conflict-400 border border-conflict-500/30">
                {activeConflicts}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Status Lineage Health */}
      <div className="p-4 mx-3 mb-3 rounded-lg bg-surface-900/40 border border-surface-900 space-y-2 text-xs">
        <div className="flex items-center justify-between text-surface-400">
          <span className="flex items-center gap-1.5 text-xxs font-mono uppercase tracking-wider text-surface-500">
            <Sparkles size={12} className="text-accent-400" />
            Reliability Guard
          </span>
          <span className="w-2 h-2 rounded-full bg-resolved-400 animate-pulse" />
        </div>
        <div className="text-xxs text-surface-400 leading-relaxed">
          Deterministic conflict detection active across all fact assertions.
        </div>
      </div>

      {/* Footer Metrics */}
      <div className="px-4 py-3.5 border-t border-surface-900 bg-surface-950/60 space-y-1.5 text-xs font-mono">
        <div className="flex items-center justify-between text-surface-400">
          <span className="text-surface-500">Facts Tracked</span>
          <span className="text-surface-200 font-semibold">{totalFacts}</span>
        </div>
        <div className="flex items-center justify-between text-surface-400">
          <span className="text-surface-500">Conflicts</span>
          <span className={`font-semibold ${activeConflicts > 0 ? 'text-conflict-400' : 'text-surface-400'}`}>
            {activeConflicts}
          </span>
        </div>
        <div className="flex items-center justify-between text-surface-400">
          <span className="text-surface-500">Explicitly Resolved</span>
          <span className="text-resolved-400 font-semibold">{resolvedFacts}</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex h-screen sticky top-0 flex-shrink-0 z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <motion.div
              className="fixed inset-0 bg-surface-950/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.div
              className="relative flex flex-col w-64 max-w-[80vw] h-full z-10 shadow-2xl"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.2 }}
            >
              {sidebarContent}
              <button
                onClick={onClose}
                className="absolute top-4 right-3 p-1.5 text-surface-400 hover:text-white rounded-md bg-surface-900/60"
                aria-label="Close sidebar"
              >
                <X size={16} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
