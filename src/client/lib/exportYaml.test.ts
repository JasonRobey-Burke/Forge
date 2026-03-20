import { describe, it, expect } from 'vitest';
import yaml from 'js-yaml';
import { specToYaml } from './exportYaml';
import type { ExportableSpec } from './exportYaml';
import type { Spec } from '@shared/types';

const baseSpec: Spec = {
  id: 'spec-1',
  product_id: 'prod-1',
  title: 'My Test Spec',
  description: 'A spec for testing YAML export',
  phase: 'Draft',
  complexity: 'Medium',
  context: {
    stack: ['React', 'TypeScript'],
    patterns: ['Repository pattern'],
    conventions: ['camelCase', 'PascalCase components'],
    auth: 'JWT via Entra ID',
  },
  boundaries: ['Do not modify the database schema directly'],
  deliverables: ['Working component', 'Unit tests'],
  validation_automated: ['All unit tests pass', 'TypeScript compiles'],
  validation_human: ['Peer code review completed'],
  peer_reviewed: false,
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
  ],
};

describe('specToYaml', () => {
  it('produces YAML that parses without errors (roundtrip)', () => {
    const output = specToYaml(baseExportable);
    expect(() => yaml.load(output)).not.toThrow();
  });

  it('includes all spec fields in parsed output', () => {
    const output = specToYaml(baseExportable);
    const parsed = yaml.load(output) as { spec: Record<string, unknown> };
    expect(parsed.spec.id).toBe('spec-1');
    expect(parsed.spec.title).toBe('My Test Spec');
    expect(parsed.spec.description).toBe('A spec for testing YAML export');
    expect(parsed.spec.complexity).toBe('Medium');
  });

  it('maps phase to status field', () => {
    const output = specToYaml(baseExportable);
    const parsed = yaml.load(output) as { spec: Record<string, unknown> };
    expect(parsed.spec.status).toBe('Draft');
    expect(parsed.spec).not.toHaveProperty('phase');
  });

  it('includes expectations with edge cases', () => {
    const output = specToYaml(baseExportable);
    const parsed = yaml.load(output) as {
      spec: { expectations: Array<{ description: string; edge_cases: string[] }> };
    };
    expect(parsed.spec.expectations).toHaveLength(1);
    expect(parsed.spec.expectations[0].description).toBe(
      'The user should be able to authenticate with their credentials'
    );
    expect(parsed.spec.expectations[0].edge_cases).toHaveLength(2);
  });

  it('handles special characters without parse error', () => {
    const specialSpec: ExportableSpec = {
      ...baseExportable,
      spec: {
        ...baseSpec,
        title: 'Spec with "quotes" & <special> chars: colon: value',
        description: 'Multi-line\ndescription with: colons and {braces} and [brackets]',
      },
    };
    const output = specToYaml(specialSpec);
    expect(() => yaml.load(output)).not.toThrow();
  });

  it('includes boundaries and deliverables', () => {
    const output = specToYaml(baseExportable);
    const parsed = yaml.load(output) as {
      spec: { boundaries: string[]; deliverables: string[] };
    };
    expect(parsed.spec.boundaries).toContain('Do not modify the database schema directly');
    expect(parsed.spec.deliverables).toContain('Working component');
  });

  it('includes validation block with automated, human, and peer_reviewed', () => {
    const output = specToYaml(baseExportable);
    const parsed = yaml.load(output) as {
      spec: { validation: { automated: string[]; human: string[]; peer_reviewed: boolean } };
    };
    expect(parsed.spec.validation.automated).toContain('All unit tests pass');
    expect(parsed.spec.validation.human).toContain('Peer code review completed');
    expect(parsed.spec.validation.peer_reviewed).toBe(false);
  });
});
