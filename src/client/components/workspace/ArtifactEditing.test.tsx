import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ArtifactEditor from './ArtifactEditor';
import type { Expectation } from '@shared/types/expectation.js';
import type { Intention } from '@shared/types/intention.js';
import type { Product } from '@shared/types/product.js';
import type { ArtifactRef, Versioned } from '@shared/types/source.js';
const base = { extras: {}, created_at: '', updated_at: '', archived_at: null };
const source = { repository_id: 'editing', revision: '"' + 'a'.repeat(64) + '"', path: 'expectations/EXP-1.yaml', read_only_fields: {} };
const expectation: Versioned<Expectation> = { data: { ...base, id: 'EXP-1', intention_id: 'INT-1', title: 'Outcome', description: 'Original measurable outcome', status: 'Ready', owner: 'Avery', edge_cases: ['Normalized structured case'] }, source };
function setup(record: Versioned<Expectation | Intention | Product> = expectation, type: ArtifactRef['type'] = 'expectations') {
  const save = vi.fn().mockResolvedValue(record);
  const router = createMemoryRouter([{ path: '/', element: <ArtifactEditor ref={{ type, id: record.data.id }} record={record} save={save} onClose={vi.fn()} /> }]);
  render(<QueryClientProvider client={new QueryClient()}><RouterProvider router={router} /></QueryClientProvider>);
  return { save, user: userEvent.setup() };
}
beforeEach(() => sessionStorage.clear());
describe('type appropriate unified editing', () => {
  it('renders real Markdown strong preview from the current unsaved description', async () => {
    const { user, save } = setup();
    const input = screen.getByRole('textbox', { name: /measurable outcome/i });
    await user.clear(input); await user.type(input, 'A **measurable improvement**');
    await user.click(screen.getByRole('button', { name: /^preview$/i }));
    expect(screen.getByText('measurable improvement', { selector: 'strong' })).toBeVisible();
    expect(save).not.toHaveBeenCalled();
  });
  it('keeps structured edge cases read-only and omits normalized values from an owner-only save', async () => {
    const record = { ...expectation, source: { ...source, read_only_fields: { edge_cases: 'Structured edge cases require advanced source editing' } } };
    const { user, save } = setup(record);
    expect(screen.getByText(/Structured edge cases require advanced source editing/)).toBeVisible();
    const field = screen.getByLabelText(/edge cases/i);
    expect(field.hasAttribute('readonly') || field.hasAttribute('disabled')).toBe(true);
    const owner = screen.getByRole('textbox', { name: /^owner$/i });
    await user.clear(owner); await user.type(owner, 'Morgan');
    await user.click(screen.getByRole('button', { name: /save expectation/i }));
    await waitFor(() => expect(save).toHaveBeenCalledWith({ owner: 'Morgan' }, source.revision));
  });
  it('edits rationale without rewriting purpose, priority, owner or status', async () => {
    const record: Versioned<Intention> = { data: { ...base, id: 'INT-1', product_id: 'PROD-1', title: 'Purpose', description: 'Complete purpose. Further detail.', rationale: 'Original rationale', priority: 'High', status: 'Defined', owner: 'Avery' }, source: { ...source, path: 'intentions/INT-1.yaml' } };
    const { user, save } = setup(record, 'intentions');
    expect(screen.getByRole('textbox', { name: /^purpose$/i })).toHaveValue('Complete purpose. Further detail.');
    const rationale = screen.getByRole('textbox', { name: /^rationale$/i });
    await user.clear(rationale); await user.type(rationale, 'Reduce avoidable rework');
    await user.click(screen.getByRole('button', { name: /save intention/i }));
    await waitFor(() => expect(save).toHaveBeenCalledWith({ rationale: 'Reduce avoidable rework' }, source.revision));
  });
  it('requires a reason before saving Deferred', async () => {
    const { user, save } = setup();
    const status = screen.queryByRole('combobox', { name: /^status$/i }) ?? screen.getByRole('button', { name: /^status$/i });
    if (status.tagName === 'SELECT') await user.selectOptions(status, 'Deferred');
    else { await user.click(status); await user.click(screen.queryByRole('option', { name: 'Deferred' }) ?? screen.getByRole('menuitem', { name: 'Deferred' })); }
    await user.click(screen.getByRole('button', { name: /save expectation/i }));
    expect(save).not.toHaveBeenCalled();
    expect(screen.getAllByText(/reason/i).length).toBeGreaterThan(0);
  });
});
