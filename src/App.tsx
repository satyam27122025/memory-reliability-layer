import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { OverviewPage } from './pages/OverviewPage';
import { FactsPage } from './pages/FactsPage';
import { ConflictsPage } from './pages/ConflictsPage';
import { FactDetailPage } from './pages/FactDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/facts" element={<FactsPage />} />
          <Route path="/facts/:id" element={<FactDetailPage />} />
          <Route path="/conflicts" element={<ConflictsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
