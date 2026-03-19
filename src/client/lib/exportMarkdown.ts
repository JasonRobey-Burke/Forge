import type { ExportableSpec } from './exportYaml';

export function specToMarkdown({ spec, expectations }: ExportableSpec): string {
  const lines: string[] = [];

  lines.push(`# Spec: ${spec.title}`);
  lines.push('');
  lines.push(`> **Status:** ${spec.phase} | **Complexity:** ${spec.complexity}`);
  lines.push('');

  // Preamble
  lines.push('## Preamble');
  lines.push('');
  lines.push(
    'You are an AI coding agent. This document is a structured Spec from the Intent-Driven Development (IDD) framework. Follow each section precisely:'
  );
  lines.push('- **Context** defines the technical environment.');
  lines.push('- **Expectations** are the outcomes you must deliver, each with edge cases to handle.');
  lines.push('- **Boundaries** are constraints — things you must NOT do.');
  lines.push('- **Deliverables** are the concrete outputs expected.');
  lines.push('- **Validation** describes how your work will be verified.');
  lines.push('');

  // Context
  lines.push('## Context');
  lines.push('');
  lines.push(`**Stack:** ${spec.context.stack.join(', ')}`);
  lines.push(`**Patterns:** ${spec.context.patterns.join(', ')}`);
  lines.push(`**Conventions:** ${spec.context.conventions.join(', ')}`);
  lines.push(`**Auth:** ${spec.context.auth}`);
  lines.push('');

  // Expectations
  lines.push('## Expectations');
  lines.push('');
  for (const exp of expectations) {
    lines.push(`- [ ] ${exp.description}`);
    for (const ec of exp.edge_cases) {
      lines.push(`  - Edge case: ${ec}`);
    }
  }
  lines.push('');

  // Boundaries
  lines.push('## Boundaries');
  lines.push('');
  for (const b of spec.boundaries) {
    lines.push(`- ${b}`);
  }
  lines.push('');

  // Deliverables
  lines.push('## Deliverables');
  lines.push('');
  for (const d of spec.deliverables) {
    lines.push(`- ${d}`);
  }
  lines.push('');

  // Validation
  lines.push('## Validation');
  lines.push('');
  lines.push('### Automated');
  for (const v of spec.validation_automated) {
    lines.push(`- ${v}`);
  }
  lines.push('');
  lines.push('### Human Review');
  for (const v of spec.validation_human) {
    lines.push(`- ${v}`);
  }
  lines.push('');

  return lines.join('\n');
}

export function downloadMarkdown(data: ExportableSpec): void {
  const content = specToMarkdown(data);
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.spec.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
