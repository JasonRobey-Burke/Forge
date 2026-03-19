import yaml from 'js-yaml';
import type { Spec } from '@shared/types';

export interface ExportableSpec {
  spec: Spec;
  expectations: Array<{ title: string; description: string; edge_cases: string[] }>;
}

export function specToYaml({ spec, expectations }: ExportableSpec): string {
  const doc = {
    spec: {
      id: spec.id,
      title: spec.title,
      description: spec.description,
      status: spec.phase,
      complexity: spec.complexity,
      context: spec.context,
      expectations: expectations.map((e) => ({
        description: e.description,
        edge_cases: e.edge_cases,
      })),
      boundaries: spec.boundaries,
      deliverables: spec.deliverables,
      validation: {
        automated: spec.validation_automated,
        human: spec.validation_human,
        peer_reviewed: spec.peer_reviewed,
      },
    },
  };
  return yaml.dump(doc, { lineWidth: -1, noRefs: true });
}

export function downloadYaml(data: ExportableSpec): void {
  const content = specToYaml(data);
  const blob = new Blob([content], { type: 'text/yaml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.spec.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.yaml`;
  a.click();
  URL.revokeObjectURL(url);
}
