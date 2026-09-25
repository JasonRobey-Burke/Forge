import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import ProductTree from './ProductTree';
import { projectWorkspace } from '@shared/lib/productWorkspace.js';
import type { WorkspaceSnapshot } from '@shared/types/workspace.js';
import type { Product, Intention, Expectation, Spec, ArtifactRef, Versioned } from '@shared/types/index.js';
const dates = { created_at: '', updated_at: '', archived_at: null, extras: {} };
const context = { stack: [], patterns: [], conventions: [], auth: '' };
function versioned<T extends { id: string }>(type: ArtifactRef['type'], data: T): Versioned<T> {
  return { data, source: { repository_id: 'repo', revision: '"' + 'a'.repeat(64) + '"', path: `${type}/${data.id}.yaml`, read_only_fields: {} } };
}
function intention(id = 'INT-1', overrides: Partial<Intention> = {}) {
  return versioned('intentions', { ...dates, id, product_id: 'PROD-1', title: id, description: '', priority: 'Medium', status: 'Draft', ...overrides } satisfies Intention);
}
function expectation(id = 'EXP-1', overrides: Partial<Expectation> = {}) {
  return versioned('expectations', { ...dates, id, intention_id: 'INT-1', title: id, description: '', status: 'Draft', edge_cases: ['a', 'b'], ...overrides } satisfies Expectation);
}
function spec(id = 'SPEC-1', overrides: Partial<Spec> = {}) {
  return versioned('specs', { ...dates, id, product_id: 'PROD-1', title: id, description: '', phase: 'Draft', complexity: 'Medium', context, boundaries: [], deliverables: [], validation_automated: [], validation_human: [], peer_reviewed: false, phase_changed_at: '', ...overrides } satisfies Spec);
}
function snapshot(overrides: Partial<WorkspaceSnapshot> = {}): WorkspaceSnapshot {
  const product: Product = { ...dates, id: 'PROD-1', name: 'Demo', problem_statement: '', vision: '', target_audience: '', status: 'Active', context, wip_limits: { draft: 0, ready: 0, in_progress: 0, review: 0, validating: 0 } };
  return { product: versioned('products', product), intentions: [], expectations: [], specs: [], spec_expectation_ids: {}, intention_dependency_ids: {}, evidence: [], diagnostics: [], ...overrides };
}

function show(input: WorkspaceSnapshot, filter = '') {
  const workspace = projectWorkspace(input); const onEdit = vi.fn();
  const router = createMemoryRouter([{ path: '/', element: <ProductTree workspace={workspace} filter={filter} onEdit={onEdit} /> }]);
  render(<QueryClientProvider client={new QueryClient()}><RouterProvider router={router} /></QueryClientProvider>);
  return { user: userEvent.setup(), workspace, onEdit };
}
function disclosure(title: string) {
  return screen.getByRole('button', { name: new RegExp(`^(?:Expand |Collapse )?${title}$`) });
}
async function expand(user: ReturnType<typeof userEvent.setup>, title: string) {
  const button = disclosure(title); expect(button).toHaveAttribute('aria-expanded');
  if (button.getAttribute('aria-expanded') !== 'true') { button.focus(); await user.keyboard('{Enter}'); }
  expect(disclosure(title)).toHaveAttribute('aria-expanded', 'true');
}
describe('product relationship map contract', () => {
  it('nests a shared spec beneath each expectation but counts delivery once', async () => {
    const { user, workspace } = show(snapshot({ intentions: [intention()], expectations: [expectation(), expectation('EXP-2')], specs: [spec()], spec_expectation_ids: { 'SPEC-1': ['EXP-1', 'EXP-2'] } }));
    expect(screen.getByRole('list', { name: 'Product relationships' })).toBeVisible();
    await expand(user, 'INT-1');
    for (const title of ['EXP-1', 'EXP-2']) {
      await expand(user, title);
      const branch = disclosure(title).closest('li'); expect(branch).not.toBeNull();
      expect(within(branch!).getByRole('link', { name: /SPEC-1/ })).toHaveAttribute('href', expect.stringContaining('/specs/SPEC-1'));
    }
    expect(workspace.delivery.Draft).toEqual(['SPEC-1']);
  });
  it('retains matching descendants with expanded ancestors', () => {
    show(snapshot({ intentions: [intention()], expectations: [expectation()], specs: [spec('SPEC-1', { title: 'Needle implementation' })], spec_expectation_ids: { 'SPEC-1': ['EXP-1'] } }), 'Needle');
    expect(disclosure('INT-1')).toHaveAttribute('aria-expanded', 'true');
    expect(disclosure('EXP-1')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: /Needle implementation/ })).toBeVisible();
  });
  it('labels direct links without claiming expectation coverage and preserves missing links', async () => {
    const { user, workspace } = show(snapshot({ intentions: [intention()], expectations: [expectation()], specs: [spec('SPEC-1', { intentions: ['INT-1'] })] }));
    await expand(user, 'INT-1'); await expand(user, 'EXP-1');
    expect(screen.getByText('No linked spec')).toBeVisible();
    expect(screen.getByText(/direct.*(?:intention|spec|link)/i)).toBeVisible();
    expect(screen.getByRole('link', { name: /SPEC-1/ })).toBeVisible();
    expect(workspace.coverage.covered_ids).toEqual([]);
  });
  it('keeps literal broken IDs inspectable under filtering', () => {
    show(snapshot({ intentions: [intention()], specs: [spec()], spec_expectation_ids: { 'SPEC-1': ['EXP-MISSING'] }, intention_dependency_ids: { 'INT-1': ['INT-MISSING'] } }), 'MISSING');
    expect(screen.getAllByText(/EXP-MISSING/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/INT-MISSING/).length).toBeGreaterThan(0);
  });
  it('allows inspection of archived branches without reporting Done as validation', async () => {
    const { user, workspace, onEdit } = show(snapshot({ intentions: [intention('INT-OLD', { archived_at: '2026-01-01' })], expectations: [expectation('EXP-OLD', { intention_id: 'INT-OLD', status: 'Done' })], specs: [spec('SPEC-OLD', { phase: 'Done' })], spec_expectation_ids: { 'SPEC-OLD': ['EXP-OLD'] } }), 'INT-OLD');
    await expand(user, 'INT-OLD'); await expand(user, 'EXP-OLD');
    expect(screen.getByRole('link', { name: /SPEC-OLD/ })).toBeVisible();
    expect(workspace.reported_validated_ids).toEqual([]); expect(onEdit).not.toHaveBeenCalled();
  });
  it('collapses large branches and makes the 51st child reachable using keyboard pagination', async () => {
    const { user } = show(snapshot({ intentions: [intention()], expectations: Array.from({ length: 51 }, (_, i) => expectation(`EXP-${String(i + 1).padStart(3, '0')}`)) }));
    expect(disclosure('INT-1')).toHaveAttribute('aria-expanded', 'false');
    await expand(user, 'INT-1');
    expect(screen.queryByRole('button', { name: /^(?:Expand )?EXP-051$/ })).not.toBeInTheDocument();
    const more = screen.getByRole('button', { name: /show more/i }); more.focus(); await user.keyboard('{Enter}');
    expect(disclosure('EXP-051')).toBeVisible(); await expand(user, 'EXP-051');
    expect(within(disclosure('EXP-051').closest('li')!).getByText('No linked spec')).toBeVisible();
  });
});
