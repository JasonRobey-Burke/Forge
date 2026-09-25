import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import EvidenceList from './EvidenceList';
import { projectWorkspace } from '@shared/lib/productWorkspace.js';
import type { EvidenceRef, WorkspaceSnapshot } from '@shared/types/workspace.js';
import type { Product, Spec, ArtifactRef, Versioned } from '@shared/types/index.js';
const dates = { created_at: '', updated_at: '', archived_at: null, extras: {} };
const context = { stack: [], patterns: [], conventions: [], auth: '' };
function versioned<T extends { id: string }>(type: ArtifactRef['type'], data: T): Versioned<T> {
  return { data, source: { repository_id: 'repo', revision: '"' + 'a'.repeat(64) + '"', path: `${type}/${data.id}.yaml`, read_only_fields: {} } };
}
function spec(id = 'SPEC-1', overrides: Partial<Spec> = {}) {
  return versioned('specs', { ...dates, id, product_id: 'PROD-1', title: id, description: '', phase: 'Draft', complexity: 'Medium', context, boundaries: [], deliverables: [], validation_automated: [], validation_human: [], peer_reviewed: false, phase_changed_at: '', ...overrides } satisfies Spec);
}
function snapshot(overrides: Partial<WorkspaceSnapshot> = {}): WorkspaceSnapshot {
  const product: Product = { ...dates, id: 'PROD-1', name: 'Demo', problem_statement: '', vision: '', target_audience: '', status: 'Active', context, wip_limits: { draft: 0, ready: 0, in_progress: 0, review: 0, validating: 0 } };
  return { product: versioned('products', product), intentions: [], expectations: [], specs: [], spec_expectation_ids: {}, intention_dependency_ids: {}, evidence: [], diagnostics: [], ...overrides };
}


function show(evidence: EvidenceRef[]) {
  const onOpen = vi.fn(); const workspace = projectWorkspace(snapshot({ evidence, specs: [spec('SPEC-1', { phase: 'Done' })] }));
  const router = createMemoryRouter([{ path: '/', element: <EvidenceList workspace={workspace} onOpen={onOpen} /> }]);
  render(<QueryClientProvider client={new QueryClient()}><RouterProvider router={router} /></QueryClientProvider>);
  return { user: userEvent.setup(), onOpen };
}
function evidence(extra: Partial<EvidenceRef> = {}): EvidenceRef { return { path: 'reviews/SPEC-1-review.md', spec_ids: ['SPEC-1'], expectation_ids: ['EXP-1'], kind: 'review', availability: 'present', result: 'unknown', ...extra }; }
describe('evidence is source material, not inferred validation', () => {
  it('shows source, associations, explicit recorded date and unknown result', () => {
    show([evidence({ recorded_at: '2026-09-24T14:30:15.000Z' })]);
    expect(screen.getByText(/reviews\/SPEC-1-review.md/)).toBeVisible();
    expect(screen.getAllByText(/SPEC-1/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/EXP-1/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/unknown/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2026|Sep/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/passed|validated successfully/i)).not.toBeInTheDocument();
  });
  it('visibly distinguishes missing and unreadable sources', () => {
    show([evidence({ path: 'reports/missing.md', availability: 'missing' }), evidence({ path: 'reports/unreadable.md', availability: 'unreadable', kind: 'other' })]);
    expect(screen.getAllByText(/missing/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/unreadable|cannot read|unable to read/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/passed|validated successfully/i)).not.toBeInTheDocument();
  });
  it('opens the source through a keyboard accessible control', async () => {
    const ref = evidence(); const { user, onOpen } = show([ref]);
    const control = screen.queryByRole('button', { name: /SPEC-1-review|open.*source|view.*source/i }) ?? screen.getByRole('link', { name: /SPEC-1-review|open.*source|view.*source/i });
    control.focus(); await user.keyboard('{Enter}'); expect(onOpen).toHaveBeenCalledWith(ref);
  });
});
