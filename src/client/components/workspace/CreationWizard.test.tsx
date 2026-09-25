import React from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CreationWizard from './CreationWizard';
import type { Intention } from '@shared/types/intention.js';
import type { Product } from '@shared/types/product.js';
import type { Versioned } from '@shared/types/source.js';
const mocked = vi.hoisted(() => ({ mutateAsync: vi.fn() }));
vi.mock('../../hooks/useCreateArtifact', () => ({ useCreateArtifact: () => ({ mutateAsync: mocked.mutateAsync, isPending: false, error: null }) }));
const source = { repository_id: 'creation-test', revision: '"' + 'a'.repeat(64) + '"', path: 'intentions/INT-1.yaml', read_only_fields: {} };
const parent: Versioned<Intention> = { data: { id: 'INT-1', product_id: 'PROD-1', title: 'Parent intention', description: 'Parent intention', priority: 'High', status: 'Defined', extras: {}, created_at: '', updated_at: '', archived_at: null }, source };
function setup(type: 'intentions' | 'expectations' = 'expectations') {
  const onCreated = vi.fn(), onClose = vi.fn(); let updateParent!: (value: Versioned<Intention | Product>) => void;
  function Host() { const [value, setValue] = React.useState<Versioned<Intention | Product>>(type === 'expectations' ? parent : { data: { id: 'PROD-1', name: 'Parent product', problem_statement: '', vision: '', target_audience: '', status: 'Active', context: { stack: [], patterns: [], conventions: [], auth: '' }, wip_limits: { draft: 0, ready: 0, in_progress: 0, review: 0, validating: 0 }, extras: {}, created_at: '', updated_at: '', archived_at: null }, source: { ...source, path: 'products/PROD-1.yaml' } }); updateParent = setValue; return <CreationWizard type={type} parent={value} onCreated={onCreated} onClose={onClose} />; }
  const router = createMemoryRouter([{ path: '/', element: <Host /> }, { path: '/away', element: <p>Destination</p> }]);
  const mounted = render(<QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}><RouterProvider router={router} /></QueryClientProvider>);
  return { user: userEvent.setup(), onCreated, onClose, router, updateParent, unmount: mounted.unmount };
}
type User = ReturnType<typeof userEvent.setup>;
async function reach(user: User, label: RegExp) {
  for (let step = 0; step < 6; step++) { const input = screen.queryByRole('textbox', { name: label }); if (input) return input; await user.click(screen.getByRole('button', { name: /^next$/i })); }
  throw new Error(`Missing authored field ${label}`);
}
async function review(user: User) {
  for (let step = 0; step < 6; step++) {
    const action = screen.queryByRole('button', { name: /review draft/i });
    if (action) { await user.click(action); return; }
    await user.click(screen.getByRole('button', { name: /^next$/i }));
  }
  throw new Error('Review draft is unavailable');
}
async function fillFields(user: User, fields: ReadonlyArray<readonly [RegExp, string]>, choiceName: RegExp, choice: string, confirmCases = false) {
  const filled = new Set<number>(); let selected = false, confirmed = !confirmCases;
  for (let step = 0; step < 6; step++) {
    for (const [index, [name, text]] of fields.entries()) {
      const field = screen.queryByRole('textbox', { name });
      if (field && !filled.has(index)) { await user.clear(field); await user.type(field, text); filled.add(index); }
    }
    const select = screen.queryByRole('combobox', { name: choiceName });
    if (select && !selected) {
      if (select.tagName === 'SELECT') await user.selectOptions(select, within(select).getByRole('option', { name: new RegExp(`^${choice}$`, 'i') }));
      else { await user.click(select); await user.click(screen.getByRole('option', { name: new RegExp(`^${choice}$`, 'i') })); }
      selected = true;
    }
    const checkbox = screen.queryByRole('checkbox', { name: /I confirm these edge cases/i });
    if (checkbox && !confirmed) { await user.click(checkbox); confirmed = true; }
    if (filled.size === fields.length && selected && confirmed && screen.queryByRole('button', { name: /review draft/i })) { await review(user); return; }
    await user.click(screen.getByRole('button', { name: /^next$/i }));
  }
  throw new Error('Creation fields or explicit review are unavailable');
}
async function fill(user: User) {
  await fillFields(user, [[/measurable outcome/i, 'A **measurable result**'], [/validation criteria/i, '95 percent within 2 seconds'], [/edge case 1/i, 'Empty input explains next step'], [/edge case 2/i, 'Offline retains local input'], [/^owner$/i, 'Avery']], /complexity/i, 'medium', true);
}

beforeEach(() => { sessionStorage.clear(); mocked.mutateAsync.mockReset().mockResolvedValue({ id: 'EXP-abcd', status: 'Draft', source: { ...source, path: 'expectations/EXP-abcd.yaml' } }); });
afterEach(() => vi.restoreAllMocks());
describe('explicitly reviewed creation wizard', () => {
  it('reviews canonical intention fields and creates only a Draft', async () => {
    mocked.mutateAsync.mockResolvedValue({ id: 'INT-abcd', status: 'Draft', source: { ...source, path: 'intentions/INT-abcd.yaml' } });
    const { user, onCreated } = setup('intentions');
    await fillFields(user, [[/^purpose$/i, 'Users complete **reviewed work**'], [/^rationale$/i, 'Reduce avoidable rework'], [/^owner$/i, 'Avery']], /priority/i, 'high');
    expect(mocked.mutateAsync).not.toHaveBeenCalled(); expect(screen.getByText('reviewed work', { selector: 'strong' })).toBeVisible(); expect(screen.getByText(/Status: Draft/i)).toBeVisible(); expect(screen.getAllByText(/Parent product|PROD-1/).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /create draft/i }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith({ type: 'intentions', id: 'INT-abcd' }));
    expect(mocked.mutateAsync).toHaveBeenCalledWith({ input: { product_id: 'PROD-1', statement: 'Users complete **reviewed work**', rationale: 'Reduce avoidable rework', priority: 'high', owner: 'Avery', confirmed: true }, parentRevision: source.revision });
  });
  it('reviews authored Markdown and Draft status before submitting once', async () => {
    const { user, onCreated } = setup(); await fill(user);
    expect(mocked.mutateAsync).not.toHaveBeenCalled(); expect(screen.getByText('measurable result', { selector: 'strong' })).toBeVisible(); expect(screen.getByText(/Status: Draft/i)).toBeVisible(); expect(screen.getAllByText(/Parent intention|INT-1/).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /create draft/i }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith({ type: 'expectations', id: 'EXP-abcd' }));
    expect(mocked.mutateAsync).toHaveBeenCalledWith({ input: { intention_id: 'INT-1', description: 'A **measurable result**', validation_criteria: '95 percent within 2 seconds', edge_cases: ['Empty input explains next step', 'Offline retains local input'], owner: 'Avery', complexity: 'medium', confirmed_edge_cases: true, confirmed: true }, parentRevision: source.revision });
  });
  it('prevents duplicate submission while retaining failed review content', async () => {
    let reject!: (error: Error) => void; mocked.mutateAsync.mockImplementation(() => new Promise((_resolve, fail) => { reject = fail; }));
    const { user, onCreated } = setup(); await fill(user); await user.dblClick(screen.getByRole('button', { name: /create draft/i })); expect(mocked.mutateAsync).toHaveBeenCalledTimes(1);
    await act(async () => reject(new Error('Write failed'))); expect(onCreated).not.toHaveBeenCalled(); expect(screen.getByText(/write failed/i)).toBeVisible(); expect(screen.getByText('measurable result', { selector: 'strong' })).toBeVisible();
  });
  it('does not adopt a new parent revision or erase authored content after an external update', async () => {
    const { user, updateParent } = setup(); await user.type(await reach(user, /measurable outcome/i), 'Keep my local outcome');
    act(() => updateParent({ data: { ...parent.data, description: 'External parent' }, source: { ...source, revision: '"' + 'b'.repeat(64) + '"' } }));
    expect(screen.getByRole('textbox', { name: /measurable outcome/i })).toHaveValue('Keep my local outcome'); expect(mocked.mutateAsync).not.toHaveBeenCalled();
  });
  it('retains a stale-parent draft and prevents an unreviewed retry', async () => {
    mocked.mutateAsync.mockRejectedValue(Object.assign(new Error('Parent changed outside Forge'), { status: 409, code: 'REVISION_CONFLICT' }));
    const { user, onCreated } = setup(); await fill(user); await user.click(screen.getByRole('button', { name: /create draft/i }));
    await waitFor(() => expect(screen.getByText(/Parent changed outside Forge/i)).toBeVisible());
    expect(onCreated).not.toHaveBeenCalled(); expect(screen.getByText('measurable result', { selector: 'strong' })).toBeVisible();
    const retry = screen.queryByRole('button', { name: /create draft/i });
    if (retry) await user.click(retry);
    expect(mocked.mutateAsync).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText(/refresh|review.*parent|parent.*review/i).length).toBeGreaterThan(0);
  });
  it('retries preserved content only after explicit updated-parent and draft review', async () => {
    mocked.mutateAsync.mockRejectedValueOnce(Object.assign(new Error('Parent changed outside Forge'), { status: 409, code: 'REVISION_CONFLICT' }));
    const { user, updateParent, onCreated } = setup(); await fill(user); await user.click(screen.getByRole('button', { name: /create draft/i }));
    await waitFor(() => expect(screen.getByText(/Parent changed outside Forge/i)).toBeVisible());
    const latest = { data: { ...parent.data, description: 'Reviewed external parent' }, source: { ...source, revision: '"' + 'b'.repeat(64) + '"' } };
    act(() => updateParent(latest));
    expect(mocked.mutateAsync).toHaveBeenCalledTimes(1); expect(onCreated).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Review updated parent' }));
    expect(mocked.mutateAsync).toHaveBeenCalledTimes(1);
    await review(user); expect(screen.getByText('measurable result', { selector: 'strong' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: /create draft/i }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith({ type: 'expectations', id: 'EXP-abcd' }));
    expect(mocked.mutateAsync).toHaveBeenCalledTimes(2);
    expect(mocked.mutateAsync.mock.calls[1][0]).toEqual({ ...mocked.mutateAsync.mock.calls[0][0], parentRevision: latest.source.revision });
  });
  it('offers persisted recovery on remount without replaying it before explicit restore', async () => {
    const first = setup(); await first.user.type(await reach(first.user, /measurable outcome/i), 'Recover my authored outcome');
    await waitFor(() => expect(sessionStorage.length).toBeGreaterThan(0)); first.unmount();
    const second = setup();
    const restore = await screen.findByRole('button', { name: 'Restore draft' });
    expect(screen.getByRole('textbox', { name: /measurable outcome/i })).not.toHaveValue('Recover my authored outcome');
    expect(mocked.mutateAsync).not.toHaveBeenCalled();
    await second.user.click(restore); expect(screen.getByRole('textbox', { name: /measurable outcome/i })).toHaveValue('Recover my authored outcome'); expect(mocked.mutateAsync).not.toHaveBeenCalled();
  });
  it('allows explicit discard of a recovered draft without creating an artifact', async () => {
    const first = setup(); await first.user.type(await reach(first.user, /measurable outcome/i), 'Discard this recovered text');
    await waitFor(() => expect(sessionStorage.length).toBeGreaterThan(0)); first.unmount();
    const second = setup(); await second.user.click(await screen.findByRole('button', { name: 'Discard recovered draft' }));
    expect(screen.queryByRole('button', { name: 'Restore draft' })).not.toBeInTheDocument(); expect(screen.getByRole('textbox', { name: /measurable outcome/i })).not.toHaveValue('Discard this recovered text'); expect(mocked.mutateAsync).not.toHaveBeenCalled();
  });
  it('keeps editable content and explains when session recovery is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage unavailable'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage unavailable'); });
    const { user } = setup(); await user.type(await reach(user, /measurable outcome/i), 'Keep my in-memory draft');
    expect(screen.getByRole('textbox', { name: /measurable outcome/i })).toHaveValue('Keep my in-memory draft'); expect(screen.getByText(/recovery.*unavailable|unavailable.*recovery/i)).toBeVisible();
  });
  it('guards navigation with an unsaved draft', async () => {
    const { user, router } = setup(); await user.type(await reach(user, /measurable outcome/i), 'Unsaved draft');
    await act(async () => { void router.navigate('/away'); }); expect(screen.getByRole('dialog', { name: 'Unsaved changes' })).toBeVisible(); await user.click(screen.getByRole('button', { name: 'Keep editing' })); expect(router.state.location.pathname).toBe('/'); expect(screen.getByRole('textbox', { name: /measurable outcome/i })).toHaveValue('Unsaved draft');
  });
  it('invalidates case confirmation after returning to edit a case', async () => {
    const { user } = setup(); await fill(user); await user.click(screen.getByRole('button', { name: /^back$/i }));
    const edge = await reach(user, /edge case 1/i); await user.type(edge, ' revised'); expect(screen.getByRole('checkbox', { name: /I confirm these edge cases/i })).not.toBeChecked(); expect(mocked.mutateAsync).not.toHaveBeenCalled();
  });
});
