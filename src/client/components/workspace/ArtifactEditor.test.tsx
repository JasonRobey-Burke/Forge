import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import ArtifactEditor from './ArtifactEditor';
import type { Expectation } from '@shared/types/expectation.js';
import type { Versioned, ArtifactRef } from '@shared/types/source.js';
const ref: ArtifactRef = { type: 'expectations', id: 'EXP-1' };
const record: Versioned<Expectation> = { data: { id: 'EXP-1', intention_id: 'INT-1', title: 'Reliable save', description: 'Original outcome', status: 'Ready', edge_cases: ['Empty input', 'Offline'], extras: { preserved: true }, created_at: '', updated_at: '', archived_at: null }, source: { repository_id: 'repo-editor', revision: 'a'.repeat(64), path: 'expectations/EXP-1.yaml', read_only_fields: {} } };
function setup(save = vi.fn().mockResolvedValue(record), current = record) {
  const onClose = vi.fn();
  let updateRecord!: (record: Versioned<Expectation>) => void;
  function Host() {
    const [value, setValue] = React.useState(current);
    updateRecord = setValue;
    return <ArtifactEditor ref={ref} record={value} save={save} onClose={onClose} />;
  }
  const router = createMemoryRouter([{ path: '/products/:id', element: <Host /> }, { path: '/away', element: <p>Destination</p> }], { initialEntries: ['/products/PROD-1'] });
  render(<RouterProvider router={router} />);
  return { save, onClose, router, updateRecord: (next: Versioned<Expectation>) => updateRecord(next), user: userEvent.setup() };
}
beforeEach(() => sessionStorage.clear());
afterEach(() => vi.restoreAllMocks());
describe('shared protected artifact editor', () => {
  it('submits only changed data with the original revision', async () => {
    const { save, user } = setup();
    const input = screen.getByRole('textbox', { name: /measurable outcome/i });
    await user.clear(input); await user.type(input, 'Changed outcome');
    await user.click(screen.getByRole('button', { name: /save expectation/i }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0]).toEqual([{ description: 'Changed outcome' }, record.source.revision]);
  });
  it('keeps failed text for retry and prevents duplicate pending saves', async () => {
    let reject!: (error: Error) => void;
    const save = vi.fn().mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; })).mockResolvedValue(record);
    const { user } = setup(save);
    const input = screen.getByRole('textbox', { name: /measurable outcome/i });
    await user.clear(input); await user.type(input, 'Keep this draft');
    const button = screen.getByRole('button', { name: /save expectation/i });
    await user.dblClick(button);
    expect(save).toHaveBeenCalledTimes(1);
    reject(new Error('Save failed'));
    await waitFor(() => expect(button).toBeEnabled());
    expect(input).toHaveValue('Keep this draft');
    await user.click(button);
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  });
  it('protects Cancel with a refusal to discard', async () => {
    const { user, onClose } = setup();
    await user.type(screen.getByRole('textbox', { name: /measurable outcome/i }), ' unsaved');
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(screen.getByRole('dialog', { name: 'Unsaved changes' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: /measurable outcome/i })).toHaveValue('Original outcome unsaved');
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    await user.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
  it('protects SPA navigation until the user confirms discarding', async () => {
    const { user, router } = setup();
    await user.type(screen.getByRole('textbox', { name: /measurable outcome/i }), ' navigation draft');
    await act(async () => { void router.navigate('/away'); });
    expect(screen.getByRole('dialog', { name: 'Unsaved changes' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(router.state.location.pathname).toBe('/products/PROD-1');
    expect(screen.getByRole('textbox', { name: /measurable outcome/i })).toHaveValue('Original outcome navigation draft');
    await act(async () => { void router.navigate('/away'); });
    await user.click(screen.getByRole('button', { name: 'Discard changes' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/away'));
  });
  it('requests native beforeunload protection only while dirty', async () => {
    const { user } = setup();
    const clean = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);
    await user.type(screen.getByRole('textbox', { name: /measurable outcome/i }), ' reload draft');
    const dirty = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
  });
  it('confirms external reload and saves later edits against the newly adopted revision', async () => {
    const { user, updateRecord, save } = setup();
    const input = screen.getByRole('textbox', { name: /measurable outcome/i });
    await user.clear(input); await user.type(input, 'Local draft');
    const latest = { data: { ...record.data, description: 'External outcome' }, source: { ...record.source, revision: 'b'.repeat(64) } };
    act(() => updateRecord(latest));
    expect(screen.getByText('File changed outside Forge')).toBeVisible();
    expect(input).toHaveValue('Local draft');
    await user.click(screen.getByRole('button', { name: /reload/i }));
    expect(screen.getByRole('dialog', { name: 'Unsaved changes' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(input).toHaveValue('Local draft');
    await user.click(screen.getByRole('button', { name: /reload/i }));
    await user.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(input).toHaveValue('External outcome');
    await user.clear(input); await user.type(input, 'Rebased edit');
    await user.click(screen.getByRole('button', { name: /save expectation/i }));
    await waitFor(() => expect(save).toHaveBeenCalledWith({ description: 'Rebased edit' }, latest.source.revision));
  });
  it('shows field-specific read-only reasons', () => {
    setup(undefined, { ...record, source: { ...record.source, read_only_fields: { description: 'Description uses a YAML alias' } } });
    const field = screen.getByRole('textbox', { name: /measurable outcome/i });
    expect(field.hasAttribute('disabled') || field.hasAttribute('readonly')).toBe(true);
    expect(screen.getByText(/Description uses a YAML alias/)).toBeVisible();
  });
  it('visibly explains unavailable recovery while retaining editable text', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage blocked'); });
    const { user } = setup();
    await user.type(screen.getByRole('textbox', { name: /measurable outcome/i }), ' memory');
    expect(screen.getByText(/recovery.*unavailable|unavailable.*recovery/i)).toBeVisible();
    expect(screen.getByRole('textbox', { name: /measurable outcome/i })).toHaveValue('Original outcome memory');
  });
  it('explains that status edits do not create validation evidence', () => {
    setup();
    expect(screen.getByText(/status.*(does not|doesn't|not).*evidence|evidence.*status/i)).toBeVisible();
    expect(screen.getByRole('button', { name: /save expectation/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeVisible();
  });
});
