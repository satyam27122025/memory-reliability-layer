import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as memoryApi from '../services/memoryApi';
import { AddFactModal } from './facts/AddFactModal';
import { ResolveConflictModal } from './facts/ResolveConflictModal';
import { QueryPanel } from './dashboard/QueryPanel';
import { OverviewPage } from '../pages/OverviewPage';
import { FactsPage } from '../pages/FactsPage';
import { FactDetailPage } from '../pages/FactDetailPage';
import type { Fact } from '../types/facts';

vi.mock('../components/dashboard/MemoryTopology', () => ({ MemoryTopology: () => null }));

const fact: Fact = {
  id: 'fact-ui',
  entity: 'Acme',
  attribute: 'Delivery date',
  status: 'conflict',
  assertions: [
    {
      id: 'assert-1',
      version: 1,
      value: '15 Nov 2026',
      sourceType: 'customer_email',
      sourceLabel: 'Customer email',
      sourceReference: 'mail-1',
      recordedAt: '2026-10-28T10:00:00Z',
    },
    {
      id: 'assert-2',
      version: 2,
      value: '20 Nov 2026',
      sourceType: 'project_record',
      sourceLabel: 'Project record',
      sourceReference: 'project-1',
      recordedAt: '2026-10-28T11:00:00Z',
    },
  ],
  history: [],
  createdAt: '2026-10-28T10:00:00Z',
  updatedAt: '2026-10-28T11:00:00Z',
};

const context = {
  refreshMetrics: vi.fn().mockResolvedValue(undefined),
  addToast: vi.fn(),
  openAddFactModal: vi.fn(),
};

function renderWithOutlet(element: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<Outlet context={context} />}>
          <Route path="/" element={element} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Stage 3 UI integration', () => {
  it('renders dashboard metrics from backend facts', async () => {
    vi.spyOn(memoryApi, 'listFacts').mockResolvedValue([fact]);
    renderWithOutlet(<OverviewPage />);
    expect(await screen.findByText('Facts Tracked')).toBeInTheDocument();
    expect(screen.getByText('Facts Tracked').parentElement?.parentElement).toHaveTextContent('1');
    expect(screen.getByText('Active Conflicts').parentElement?.parentElement).toHaveTextContent('1');
  });

  it('renders Facts Explorer records from the backend response', async () => {
    vi.spyOn(memoryApi, 'listFacts').mockResolvedValue([fact]);
    renderWithOutlet(<FactsPage />);
    expect((await screen.findAllByText('Acme')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Delivery date').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Conflict').length).toBeGreaterThan(0);
  });

  it('shows no arbitrary answer for a conflict query', async () => {
    vi.spyOn(memoryApi, 'queryFacts').mockResolvedValue({
      status: 'conflict',
      answer: null,
      entity: 'Acme',
      attribute: 'Delivery date',
      factId: fact.id,
      evidence: fact.assertions.map(assertion => ({
        value: assertion.value,
        sourceType: assertion.sourceType,
        sourceLabel: assertion.sourceLabel,
        sourceReference: assertion.sourceReference,
        recordedAt: assertion.recordedAt,
      })),
    });
    render(<MemoryRouter><QueryPanel /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: /^query$/i }));
    expect(await screen.findByText('No single current value can be confirmed.')).toBeInTheDocument();
    expect(screen.getByText('15 Nov 2026')).toBeInTheDocument();
    expect(screen.getByText('20 Nov 2026')).toBeInTheDocument();
    expect(screen.queryByText('Answer: null')).not.toBeInTheDocument();
  });

  it('displays an ambiguous query without producing an answer', async () => {
    vi.spyOn(memoryApi, 'queryFacts').mockResolvedValue({
      status: 'ambiguous',
      answer: null,
      message: 'Please clarify the entity.',
      evidence: [],
    });
    render(<MemoryRouter><QueryPanel /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: /^query$/i }));
    expect(await screen.findByText('Status: Ambiguous query')).toBeInTheDocument();
    expect(screen.getByText('No answer was selected.')).toBeInTheDocument();
  });

  it('shows the empty backend state in Facts Explorer', async () => {
    vi.spyOn(memoryApi, 'listFacts').mockResolvedValue([]);
    renderWithOutlet(<FactsPage />);
    expect(await screen.findByText('No facts found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add first fact/i })).toBeInTheDocument();
  });

  it('preserves Add Fact form values after an API failure', async () => {
    vi.spyOn(memoryApi, 'createFact').mockRejectedValue(new memoryApi.ApiError('Server unavailable', 503));
    render(<AddFactModal isOpen onClose={vi.fn()} onFactCreated={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/^Entity/), 'Northwind');
    await userEvent.type(screen.getByLabelText(/^Attribute/), 'Status');
    await userEvent.type(screen.getByLabelText(/^Asserted Value/), '  Active  ');
    await userEvent.type(screen.getByLabelText(/^Source Label/), 'CRM');
    await userEvent.click(screen.getByRole('button', { name: /submit assertion/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Server unavailable');
    expect(screen.getByLabelText(/^Entity/)).toHaveValue('Northwind');
    expect(screen.getByLabelText(/^Asserted Value/)).toHaveValue('  Active  ');
  });

  it('closes Add Fact and calls the refresh callback only after backend success', async () => {
    vi.spyOn(memoryApi, 'createFact').mockResolvedValue(fact);
    const onClose = vi.fn();
    const onFactCreated = vi.fn();
    render(<AddFactModal isOpen onClose={onClose} onFactCreated={onFactCreated} />);
    await userEvent.type(screen.getByLabelText(/^Entity/), 'Northwind');
    await userEvent.type(screen.getByLabelText(/^Attribute/), 'Status');
    await userEvent.type(screen.getByLabelText(/^Asserted Value/), 'Active');
    await userEvent.type(screen.getByLabelText(/^Source Label/), 'CRM');
    await userEvent.click(screen.getByRole('button', { name: /submit assertion/i }));

    await waitFor(() => expect(onFactCreated).toHaveBeenCalledWith(fact));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('keeps resolution evidence visible when submission fails', async () => {
    vi.spyOn(memoryApi, 'resolveFact').mockRejectedValue(new memoryApi.ApiError('Resolution failed', 500));
    render(
      <ResolveConflictModal
        isOpen
        onClose={vi.fn()}
        fact={fact}
        onFactResolved={vi.fn()}
      />,
    );
    await userEvent.click(screen.getAllByRole('radio')[0]);
    await userEvent.type(screen.getByPlaceholderText(/confirmed with client delivery manager/i), 'Verified');
    await userEvent.clear(screen.getByLabelText(/^Resolved By/));
    await userEvent.type(screen.getByLabelText(/^Resolved By/), 'Operator');
    await userEvent.click(screen.getByRole('button', { name: /confirm resolution/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Resolution failed');
    expect(screen.getByText('15 Nov 2026')).toBeInTheDocument();
    expect(screen.getByText('20 Nov 2026')).toBeInTheDocument();
  });

  it('reloads current assertions and requires review after a stale-resolution 409', async () => {
    const latestFact = {
      ...fact,
      assertions: [...fact.assertions, {
        id: 'assert-3',
        version: 3,
        value: '25 Nov 2026',
        sourceType: 'crm_record' as const,
        sourceLabel: 'CRM',
        sourceReference: 'crm-3',
        recordedAt: '2026-10-28T12:00:00Z',
      }],
    };
    vi.spyOn(memoryApi, 'resolveFact').mockRejectedValue(new memoryApi.ApiError('Stale assertion version.', 409));
    vi.spyOn(memoryApi, 'getFact').mockResolvedValue(latestFact);
    const { rerender } = render(
      <ResolveConflictModal
        isOpen
        onClose={vi.fn()}
        fact={fact}
        onFactResolved={vi.fn()}
      />,
    );
    await userEvent.click(screen.getAllByRole('radio')[0]);
    await userEvent.type(screen.getByPlaceholderText(/confirmed with client delivery manager/i), 'Verified');
    await userEvent.click(screen.getByRole('button', { name: /confirm resolution/i }));

    expect(await screen.findByRole('status')).toHaveTextContent('fact changed');
    expect(screen.getByText('25 Nov 2026')).toBeInTheDocument();
    rerender(
      <ResolveConflictModal
        isOpen
        onClose={vi.fn()}
        fact={{ ...latestFact, updatedAt: '2026-10-28T13:00:00Z' }}
        onFactResolved={vi.fn()}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('fact changed');
    expect(screen.getByRole('button', { name: /confirm resolution/i })).toBeEnabled();
  });

  it('keeps the detail and resolution dialog mounted while refreshing fact changes', async () => {
    vi.spyOn(memoryApi, 'getFact').mockResolvedValue(fact);
    vi.spyOn(memoryApi, 'getFactHistory').mockResolvedValue([]);
    render(
      <MemoryRouter initialEntries={[`/facts/${fact.id}`]}>
        <Routes>
          <Route element={<Outlet context={context} />}>
            <Route path="/facts/:id" element={<FactDetailPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /resolve conflict/i }));
    window.dispatchEvent(new CustomEvent('memory:facts-changed'));

    await waitFor(() => expect(memoryApi.getFact).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getAllByText('15 Nov 2026').length).toBeGreaterThan(0);
  });
});
