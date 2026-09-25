import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProductWorkspacePage from './ProductWorkspacePage';
const mocks = vi.hoisted(() => ({ useWorkspace: vi.fn() }));
vi.mock('../hooks/useWorkspace', () => ({ useWorkspace: mocks.useWorkspace, workspaceKey: (id: string) => ['workspace', id] }));
const source = { repository_id: 'repo-page', revision: 'a'.repeat(64), path: 'test.yaml', read_only_fields: {} };
const base = { extras: {}, created_at: '', updated_at: '', archived_at: null };
const versioned = <T,>(data: T) => ({ data, source });
const projection = () => ({
  product: versioned({ ...base, id: 'PROD-1', name: 'Reliable workspace', problem_statement: 'Keep outcomes understandable', vision: 'Clear decisions', target_audience: 'Teams', owner: 'Avery', status: 'Active', context: { stack: [], patterns: [], conventions: [], auth: '' }, wip_limits: { draft: 5, ready: 5, in_progress: 5, review: 5, validating: 5 } }),
  intentions: [versioned({ ...base, id: 'INT-1', product_id: 'PROD-1', title: 'Reliable edits', description: 'Preserve human work', status: 'Defined', priority: 'High', roadmap: { bucket: 'now', rank: 1 } })],
  expectations: [versioned({ ...base, id: 'EXP-1', intention_id: 'INT-1', title: 'Preserve drafts', description: 'Draft text survives refresh', status: 'Validated', edge_cases: ['Offline', 'External change'] })],
  specs: [], spec_expectation_ids: {}, intention_dependency_ids: {}, evidence: [], diagnostics: [], active_intention_ids: ['INT-1'], coverage: { covered_ids: [], uncovered_ids: ['EXP-1'], total: 1 }, delivery: { Draft: [], Ready: [], InProgress: [], Review: [], Validating: [], Done: [] }, reported_validated_ids: ['EXP-1'], concerns: [], incomplete: false,
});
function setup(data: unknown = projection(), loading = false) {
  mocks.useWorkspace.mockReturnValue({ data, isPending: loading, isLoading: loading, isError: false, error: null, refetch: vi.fn() });
  const router = createMemoryRouter([{ path: '/products/:id', element: <ProductWorkspacePage /> }], { initialEntries: ['/products/PROD-1'] });
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><RouterProvider router={router} /></QueryClientProvider>);
  return { router, user: userEvent.setup() };
}
beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); });
describe('product Overview supporting records', () => {
  it('shows product identity and opens the editor in two interactions', async () => {
    const { user, router } = setup();
    expect(screen.getByText('Reliable workspace')).toBeVisible();
    expect(screen.getByText('Keep outcomes understandable')).toBeVisible();
    expect(screen.getByText('Avery')).toBeVisible();
    expect(screen.queryByRole('textbox', { name: /measurable outcome/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Expand Reliable edits' }));
    await user.click(screen.getByRole('button', { name: 'Edit EXP-1' }));
    expect(screen.getByRole('textbox', { name: /measurable outcome/i })).toHaveValue('Draft text survives refresh');
    expect(new URLSearchParams(router.state.location.search).get('outcome')).toBe('INT-1');
    expect(new URLSearchParams(router.state.location.search).get('edit')).toBe('EXP-1');
  });
  it('labels reported validation separately from evidence and drills down to source IDs', async () => {
    const { user, router } = setup();
    await user.click(screen.getByRole('button', { name: 'Expand Reliable edits' }));
    expect(screen.getByText('Reported validated · evidence unknown')).toBeVisible();
    const links = [...screen.queryAllByRole('link'), ...screen.queryAllByRole('button')];
    const validation = links.find(el => /validation/i.test(el.textContent ?? '') && !/edit/i.test(el.textContent ?? ''));
    expect(validation).toBeDefined();
    await user.click(validation!);
    expect(new URLSearchParams(router.state.location.search).get('concern')).toBe('validation');
    expect(screen.getAllByText(/EXP-1/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/\d+\s*%\s*(complete|done)/i)).not.toBeInTheDocument();
  });
  it('retains parse warnings and makes summary uncertainty visible', () => {
    const data = projection();
    const warning = { key: 'bad', code: 'invalid-file', message: 'Could not parse broken.yaml', entity: { type: 'expectations', id: 'broken' }, related: [], kind: 'unknown' };
    setup({ ...data, incomplete: true, diagnostics: [warning], concerns: [warning] });
    expect(screen.getAllByText(/Could not parse broken.yaml/).length).toBeGreaterThan(0);
    expect(screen.getByText(/incomplete|uncertain/i)).toBeVisible();
  });
  it('explains a useful next action for an empty product', () => {
    setup({ ...projection(), intentions: [], expectations: [], active_intention_ids: [], reported_validated_ids: [], coverage: { covered_ids: [], uncovered_ids: [], total: 0 } });
    expect(screen.getByText(/(create|add|define).* (outcome|intention)|(outcome|intention).* (create|add|define)/i)).toBeVisible();
  });
  it('does not render unknown loading counts as zero', () => {
    setup(null, true);
    expect(screen.queryByText(/^0$/)).not.toBeInTheDocument();
  });
});
