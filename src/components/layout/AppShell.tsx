import { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ToastContainer, type ToastData } from '../ui/Toast';
import { AddFactModal } from '../facts/AddFactModal';
import { listFacts, resetToDefaults } from '../../services/memoryApi';

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

  const refreshMetrics = useCallback(async () => {
    try {
      const facts = await listFacts();
      setTotalFacts(facts.length);
      setActiveConflicts(facts.filter(f => f.status === 'conflict').length);
      setResolvedFacts(facts.filter(f => f.status === 'resolved').length);
    } catch (err) {
      console.error('Failed to refresh metrics:', err);
    }
  }, []);

  useEffect(() => {
    refreshMetrics();
  }, [refreshMetrics]);

  const addToast = (toast: Omit<ToastData, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts(prev => [...prev, { ...toast, id }]);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleResetData = async () => {
    resetToDefaults();
    await refreshMetrics();
    addToast({
      type: 'info',
      title: 'Mock Data Reset',
      description: 'Central mock dataset reseeded to default initial state.',
    });
    // Trigger window reload or state refresh
    window.location.reload();
  };

  const handleFactCreated = async () => {
    await refreshMetrics();
    addToast({
      type: 'success',
      title: 'Fact Recorded',
      description: 'New assertion logged to workspace memory layer.',
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
          onResetData={handleResetData}
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

