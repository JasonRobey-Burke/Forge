import type { EvidenceRef } from '../types/workspace.js';

/** Exact ID separator matching; never infer an association from prose. */
export function evidenceSuffix(name: string, specId: string): string | null {
  return name.startsWith(`${specId}-`) ? name.slice(specId.length + 1).replace(/\.md$/, '') : null;
}
export function classifyEvidenceSuffix(suffix: string): EvidenceRef['kind'] {
  if (suffix === 'review' || suffix === 'deep-review') return 'review';
  if (suffix === 'gap-check' || suffix === 'pipeline') return suffix;
  if (suffix === 'execution' || /^\d{8}T\d{6}Z-execution$/.test(suffix)) return 'execution';
  return 'other';
}
export function evidenceDate(suffix: string): string | undefined {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z-execution$/.exec(suffix);
  if (!match) return undefined;
  const [, year, month, day, hour, minute, second] = match;
  const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
  const date = new Date(iso);
  return Number.isFinite(date.valueOf()) && date.toISOString() === iso ? iso : undefined;
}
