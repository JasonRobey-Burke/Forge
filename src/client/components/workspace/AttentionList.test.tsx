import React from 'react';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import AttentionList from './AttentionList';
import { projectWorkspace } from '@shared/lib/productWorkspace.js';
import type { WorkspaceSnapshot } from '@shared/types/workspace.js';
import type { ArtifactRef, Versioned } from '@shared/types/source.js';
import type { Intention } from '@shared/types/intention.js';
import type { Spec } from '@shared/types/spec.js';
const base = { extras: {}, created_at: '', updated_at: '', archived_at: null };
const context = { stack: [], patterns: [], conventions: [], auth: '' };
function versioned<T extends { id: string }>(type: ArtifactRef['type'], data: T, read_only_fields: Record<string, string> = {}): Versioned<T> {
  return { data, source: { repository_id: 'attention', revision: '"' + 'a'.repeat(64) + '"', path: `${type}/${data.id}.yaml`, read_only_fields } };
}
function snapshot(): WorkspaceSnapshot {
  return { product: versioned('products', { ...base, id: 'PROD-1', name: 'Useful attention', problem_statement: 'Make corrective work clear', vision: 'Understandable outcomes', target_audience: 'Product owners', status: 'Active', context, wip_limits: { draft: 0, ready: 0, in_progress: 0, review: 0, validating: 0 } }), intentions: [], expectations: [], specs: [], spec_expectation_ids: {}, intention_dependency_ids: {}, evidence: [], diagnostics: [] };
}
function intention(reason: string) {
  return versioned('intentions', { ...base, id: 'INT-1', product_id: 'PROD-1', title: 'Reliable delivery', description: 'Reliable delivery. Preserve the complete purpose.', rationale: 'Reduce rework', owner: 'Avery', priority: 'High', status: 'Defined' } satisfies Intention, { title: reason });
}
function show(input: WorkspaceSnapshot) {
  const workspace = projectWorkspace(input);
  const router = createMemoryRouter([{ path: '/', element: <AttentionList workspace={workspace} /> }]);
  render(<QueryClientProvider client={new QueryClient()}><RouterProvider router={router} /></QueryClientProvider>);
}
describe('Needs attention explains actionable product-owner work', () => {
  it('does not turn a routine canonical derived title into an attention blocker', () => {
    const input = snapshot();
    input.intentions = [intention('This title is derived from the full statement. Edit the purpose or add an explicit title in advanced source.')];
    show(input);
    for (const message of screen.queryAllByText(/derived from the full statement|title.*read.only|read.only.*title/i)) expect(message).not.toBeVisible();
    const links = screen.queryAllByRole('link').filter(link => /INT-1|Reliable delivery/.test(link.textContent ?? ''));
    expect(links).toHaveLength(0);
  });
  it('keeps a genuinely ambiguous source field inspectable', () => {
    const input = snapshot();
    input.intentions = [intention('Title uses a YAML alias and cannot be edited safely in the ordinary form.')];
    show(input);
    const messages = screen.getAllByText(/alias|ambiguous|cannot be edited safely/i);
    expect(messages.some(message => { try { expect(message).toBeVisible(); return true; } catch { return false; } })).toBe(true);
    expect(screen.getAllByRole('link').some(link => /\/intentions\/INT-1(?:\?|$)/.test(link.getAttribute('href') ?? ''))).toBe(true);
  });
  it('explains an incomplete Draft checklist with a useful spec action instead of a visible internal code', () => {
    const input = snapshot();
    input.specs = [versioned('specs', { ...base, id: 'SPEC-1', product_id: 'PROD-1', title: 'Incomplete draft', description: '', phase: 'Draft', complexity: 'Medium', context, boundaries: [], deliverables: [], validation_automated: [], validation_human: [], peer_reviewed: false, phase_changed_at: '' } satisfies Spec)];
    show(input);
    for (const code of screen.queryAllByText(/CHECKLIST_INCOMPLETE/)) expect(code).not.toBeVisible();
    const action = screen.getAllByRole('link').find(link => /\/specs\/SPEC-1(?:\?|$)/.test(link.getAttribute('href') ?? '') && /checklist|spec|draft|complete|review|fix|open/i.test(link.textContent ?? ''));
    expect(action).toBeDefined(); expect(action).toBeVisible();
    const causes = screen.getAllByText(/checklist.*(incomplete|missing|complete|required)|(?:incomplete|missing|required).*checklist|(?:add|provide|define|missing).*(?:context|boundaries|deliverables|expectations|validation)/i);
    expect(causes.some(message => { try { expect(message).toBeVisible(); return true; } catch { return false; } })).toBe(true);
  });
});
