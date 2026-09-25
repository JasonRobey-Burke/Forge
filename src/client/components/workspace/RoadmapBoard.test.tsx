import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import RoadmapBoard from './RoadmapBoard';
import type { WorkspaceProjection } from '@shared/types/workspace.js';
import type { Intention } from '@shared/types/intention.js';
import type { Versioned } from '@shared/types/source.js';
const base = { extras: {}, created_at: '', updated_at: '', archived_at: null };
function intention(id: string, roadmap?: Intention['roadmap'], extra: Partial<Intention> = {}): Versioned<Intention> {
  return { data: { ...base, id, product_id: 'PROD-1', title: `Outcome ${id}`, description: 'Purpose', rationale: `Rationale ${id}`, owner: 'Avery', status: 'Defined', priority: 'High', roadmap, ...extra }, source: { repository_id: 'board', revision: `"${id === 'INT-1' ? 'a'.repeat(64) : 'b'.repeat(64)}"`, path: `intentions/${id}.yaml`, read_only_fields: {} } };
}
function projection(intentions: Versioned<Intention>[]): WorkspaceProjection {
  return { product: { data: { ...base, id: 'PROD-1', name: 'Roadmap product', problem_statement: '', vision: '', target_audience: '', status: 'Active', context: { stack: [], patterns: [], conventions: [], auth: '' }, wip_limits: { draft: 5, ready: 5, in_progress: 5, review: 5, validating: 5 } }, source: { repository_id: 'board', revision: '"' + 'c'.repeat(64) + '"', path: 'products/PROD-1.yaml', read_only_fields: {} } }, intentions, expectations: [], specs: [], spec_expectation_ids: {}, intention_dependency_ids: {}, evidence: [], diagnostics: [], active_intention_ids: intentions.map(i => i.data.id), coverage: { covered_ids: [], uncovered_ids: [], total: 0 }, delivery: {}, reported_validated_ids: [], concerns: [], incomplete: false };
}
function setup(workspace = projection([intention('INT-1')]), onMove = vi.fn().mockResolvedValue(undefined)) {
  const router = createMemoryRouter([{ path: '/', element: <RoadmapBoard workspace={workspace} onMove={onMove} /> }]);
  render(<QueryClientProvider client={new QueryClient()}><RouterProvider router={router} /></QueryClientProvider>);
  return { user: userEvent.setup(), onMove };
}
async function move(user: ReturnType<typeof userEvent.setup>, id: string, destination: string) {
  const select = screen.queryByRole('combobox', { name: `Move ${id}` });
  if (select) { select.focus(); await user.selectOptions(select, within(select).getByRole('option', { name: destination })); }
  else { screen.getByRole('button', { name: `Move ${id}` }).focus(); await user.keyboard('{Enter}'); const choice = screen.queryByRole('menuitem', { name: destination }) ?? screen.getByRole('button', { name: destination }); choice.focus(); await user.keyboard('{Enter}'); }
}
describe('roadmap controls preserve delivery meaning', () => {
  it('moves an unscheduled intention with keyboard-accessible controls and its displayed revision', async () => {
    const record = intention('INT-1'); const workspace = projection([record]); const original = structuredClone(workspace);
    const { user, onMove } = setup(workspace);
    expect(screen.getByText('Rationale INT-1')).toBeVisible(); expect(screen.getByText('Avery')).toBeVisible(); expect(screen.getByText('High')).toBeVisible();
    await move(user, 'INT-1', 'Next');
    await waitFor(() => expect(onMove).toHaveBeenCalledOnce());
    expect(onMove.mock.calls[0]).toEqual(['INT-1', { bucket: 'next', rank: expect.any(Number) }, record.source.revision]);
    expect(Number.isFinite(onMove.mock.calls[0][1].rank)).toBe(true); expect(workspace).toEqual(original);
  });
  it('reorders only one intention using a fractional rank and retains literal target labels', async () => {
    const records = [intention('INT-1', { bucket: 'now', rank: 1024, target_window: 'After partner review — no date agreed' }), intention('INT-2', { bucket: 'now', rank: 2048 }), intention('INT-3', { bucket: 'now', rank: 3072 })];
    const { user, onMove } = setup(projection(records));
    expect(screen.getByText('After partner review — no date agreed')).toBeVisible();
    screen.getByRole('button', { name: 'Move INT-1 later' }).focus(); await user.keyboard('{Enter}');
    await waitFor(() => expect(onMove).toHaveBeenCalledOnce());
    expect(onMove.mock.calls[0]).toEqual(['INT-1', { rank: 2560 }, records[0].source.revision]);
  });
  it('shows a failed move and retains the intention for retry', async () => {
    const onMove = vi.fn().mockRejectedValue(new Error('The file changed; reload and retry'));
    const { user } = setup(undefined, onMove);
    await move(user, 'INT-1', 'Later');
    expect(await screen.findByText(/The file changed; reload and retry/)).toBeVisible();
    expect(screen.getByText('Outcome INT-1')).toBeVisible();
    expect(screen.queryByRole('combobox', { name: 'Move INT-1' }) ?? screen.getByRole('button', { name: 'Move INT-1' })).toBeEnabled();
  });
  it('makes completed and archived records available through explicit filters without writes', async () => {
    const { user, onMove } = setup(projection([intention('INT-1'), intention('INT-2', undefined, { status: 'Fulfilled' }), intention('INT-3', { bucket: 'later', rank: 1 }, { archived_at: '2026-09-24' })]));
    for (const name of ['Show completed', 'Show archived']) {
      const control = screen.queryByRole('checkbox', { name }) ?? screen.getByRole('button', { name });
      const enabled = control instanceof HTMLInputElement ? control.checked : control.getAttribute('aria-pressed') === 'true';
      if (!enabled) await user.click(control);
    }
    expect(screen.getByText('Outcome INT-2')).toBeVisible(); expect(screen.getByText('Outcome INT-3')).toBeVisible();
    expect(onMove).not.toHaveBeenCalled(); expect(screen.queryByText(/\d+\s*%\s*(complete|done)/i)).not.toBeInTheDocument();
  });
  it('displays unsupported source metadata with an explicit replacement control and no automatic write', () => {
    const { onMove } = setup(projection([intention('INT-1', undefined, { extras: { forge: { roadmap: { bucket: 'someday', custom: 7 } } } })]));
    expect(screen.getAllByText(/unsupported/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /replace/i })).toBeVisible(); expect(onMove).not.toHaveBeenCalled();
  });
  it('shows linked dependency outcome and its reported status without preventing a planning move', async () => {
    const workspace = projection([intention('INT-1'), intention('INT-2', undefined, { status: 'Draft' })]); workspace.intention_dependency_ids = { 'INT-1': ['INT-2'] };
    const { user, onMove } = setup(workspace);
    expect(screen.getAllByText(/Outcome INT-2/).length).toBeGreaterThan(0); expect(screen.getAllByText(/Draft/).length).toBeGreaterThan(0);
    await move(user, 'INT-1', 'Now'); await waitFor(() => expect(onMove).toHaveBeenCalledOnce());
  });
});
