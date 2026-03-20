import { describe, it, expect } from 'vitest';
import { specToMarkdown } from './exportMarkdown';
import type { ExportableSpec } from './exportYaml';
import type { Spec } from '@shared/types';

const baseSpec: Spec = {
  id: 'spec-1',
  product_id: 'prod-1',
  title: 'My Test Spec',
  description: 'A spec for testing Markdown export',
  phase: 'InProgress',
  complexity: 'High',
  context: {
    stack: ['React', 'TypeScript', 'Vite'],
    patterns: ['Repository pattern', 'CQRS'],
    conventions: ['camelCase', 'PascalCase components'],
    auth: 'JWT via Entra ID',
  },
  boundaries: ['Do not modify the database schema directly', 'No raw SQL in application code'],
  deliverables: ['Working component', 'Unit tests', 'Updated docs'],
  validation_automated: ['All unit tests pass', 'TypeScript compiles without errors'],
  validation_human: ['Peer code review completed', 'Product owner sign-off'],
  peer_reviewed: true,
  phase_changed_at: '2026-01-01T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  archived_at: null,
};

const baseExportable: ExportableSpec = {
  spec: baseSpec,
  expectations: [
    {
      title: 'User can log in',
      description: 'The user should be able to authenticate with their credentials',
      edge_cases: ['Invalid credentials show error', 'Expired token redirects to login'],
    },
    {
      title: 'User can log out',
      description: 'The user should be able to end their session',
      edge_cases: ['Logout clears local storage'],
    },
  ],
};

describe('specToMarkdown', () => {
  it('contains all section headers', () => {
    const output = specToMarkdown(baseExportable);
    expect(output).toContain('## Context');
    expect(output).toContain('## Expectations');
    expect(output).toContain('## Boundaries');
    expect(output).toContain('## Deliverables');
    expect(output).toContain('## Validation');
  });

  it('contains preamble section with AI coding agent text', () => {
    const output = specToMarkdown(baseExportable);
    expect(output).toContain('## Preamble');
    expect(output).toContain('AI coding agent');
  });

  it('renders expectations as checklist items', () => {
    const output = specToMarkdown(baseExportable);
    expect(output).toContain('- [ ] The user should be able to authenticate with their credentials');
    expect(output).toContain('- [ ] The user should be able to end their session');
  });

  it('nests edge cases under expectations', () => {
    const output = specToMarkdown(baseExportable);
    expect(output).toContain('  - Edge case: Invalid credentials show error');
    expect(output).toContain('  - Edge case: Expired token redirects to login');
    expect(output).toContain('  - Edge case: Logout clears local storage');
  });

  it('includes spec title in header', () => {
    const output = specToMarkdown(baseExportable);
    expect(output).toContain('# Spec: My Test Spec');
  });

  it('includes spec status (phase) in output', () => {
    const output = specToMarkdown(baseExportable);
    expect(output).toContain('InProgress');
  });

  it('includes boundaries as list items', () => {
    const output = specToMarkdown(baseExportable);
    expect(output).toContain('- Do not modify the database schema directly');
    expect(output).toContain('- No raw SQL in application code');
  });

  it('includes deliverables as list items', () => {
    const output = specToMarkdown(baseExportable);
    expect(output).toContain('- Working component');
    expect(output).toContain('- Unit tests');
  });

  it('includes automated and human validation sections', () => {
    const output = specToMarkdown(baseExportable);
    expect(output).toContain('### Automated');
    expect(output).toContain('### Human Review');
    expect(output).toContain('- All unit tests pass');
    expect(output).toContain('- Peer code review completed');
  });

  it('includes context stack, patterns, and conventions', () => {
    const output = specToMarkdown(baseExportable);
    expect(output).toContain('React');
    expect(output).toContain('Repository pattern');
    expect(output).toContain('camelCase');
    expect(output).toContain('JWT via Entra ID');
  });
});
