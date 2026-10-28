import { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ToastContainer, type ToastData } from '../ui/Toast';
import { AddFactModal } from '../facts/AddFactModal';
import { listFacts } from '../../services/memoryApi';
import type { Fact } from '../../types/facts';

export interface AppShellContext {
  refreshMetrics: () => Promise<void>;
  addToast: (toast: Omit<ToastData, 'id'>) => void;
  openAddFactModal: () => void;
}

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [totalFacts, setTotalFacts] = useState(0);
  const [activeConflicts, setActiveConflicts] = useState(0);
  const [resolvedFacts, setResolvedFacts] = useState(0);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [isAddFactOpen, setIsAddFactOpen] = useState(false);
  const metricsController = useRef<AbortController | null>(null);

  const refreshMetrics = useCallback(async () => {
    metricsController.current?.abort();
    const controller = new AbortController();
    metricsController.current = controller;
    try {
      const facts = await listFacts({ signal: controller.signal });
      if (controller.signal.aborted) return;
      setTotalFacts(facts.length);
      setActiveConflicts(facts.filter(f => f.status === 'conflict').length);
      setResolvedFacts(facts.filter(f => f.status === 'resolved').length);
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error('Failed to refresh metrics:', err);
      setTotalFacts(0);
      setActiveConflicts(0);
      setResolvedFacts(0);
    }
  }, []);

  useEffect(() => {
    refreshMetrics();
    return () => metricsController.current?.abort();
  }, [refreshMetrics]);

  useEffect(() => {
    const refresh = () => { void refreshMetrics(); };
    window.addEventListener('memory:facts-changed', refresh);
    return () => window.removeEventListener('memory:facts-changed', refresh);
  }, [refreshMetrics]);

  const addToast = (toast: Omit<ToastData, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts(prev => [...prev, { ...toast, id }]);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleFactCreated = async (fact: Fact) => {
    await refreshMetrics();
    addToast({
      type: 'success',
      title: fact.status === 'conflict' ? 'Assertion Added — Conflict Detected' : 'Fact Recorded',
      description: `${fact.entity} · ${fact.attribute} is ${fact.status}.`,
    });
  };

  return (
    <div className="flex min-h-screen bg-surface-50">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeConflicts={activeConflicts}
        totalFacts={totalFacts}
        resolvedFacts={resolvedFacts}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          onOpenAddFact={() => setIsAddFactOpen(true)}
          activeConflicts={activeConflicts}
        />

        <main className="flex-1 pb-16">
          <Outlet
            context={{
              refreshMetrics,
              addToast,
              openAddFactModal: () => setIsAddFactOpen(true),
            } satisfies AppShellContext}
          />
        </main>
      </div>

      {/* Global Add Fact Modal */}
      <AddFactModal
        isOpen={isAddFactOpen}
        onClose={() => setIsAddFactOpen(false)}
        onFactCreated={handleFactCreated}
      />

      {/* Global Notification Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
