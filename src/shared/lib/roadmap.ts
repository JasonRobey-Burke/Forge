import type { Intention, RoadmapMetadata } from '../types/intention.js';
import type { Versioned } from '../types/source.js';
export function readRoadmap(value: unknown): { metadata: RoadmapMetadata | null; unsupported: boolean } {
  if (value == null) return { metadata: null, unsupported: false };
  if (typeof value !== 'object' || Array.isArray(value)) return { metadata: null, unsupported: true };
  const v = value as Record<string, unknown>;
  if (Object.keys(v).some(k => !['bucket', 'rank', 'target_window'].includes(k)) ||
    ('bucket' in v && !['now', 'next', 'later'].includes(v.bucket as string)) ||
    ('rank' in v && (typeof v.rank !== 'number' || !Number.isFinite(v.rank))) ||
    ('target_window' in v && typeof v.target_window !== 'string')) return { metadata: null, unsupported: true };
  return { metadata: { ...v } as RoadmapMetadata, unsupported: false };
}
export function rankBetween(before: number | null, after: number | null): number {
  const rank = before === null ? (after === null ? 1024 : after - 1024) : after === null ? before + 1024 : before / 2 + after / 2;
  if ((before !== null && !Number.isFinite(before)) || (after !== null && !Number.isFinite(after)) || !Number.isFinite(rank) ||
    (before !== null && rank <= before) || (after !== null && rank >= after)) {
    throw Object.assign(new Error('Roadmap rank precision exhausted; choose a different position.'), { code: 'ROADMAP_RANK_EXHAUSTED' });
  }
  return rank;
}
export function sortIntentions(records: Versioned<Intention>[]): Versioned<Intention>[] {
  const bucket = (i: Intention) => ['now', 'next', 'later', undefined].indexOf(readRoadmap(i.roadmap).metadata?.bucket);
  const priority = (i: Intention) => { const n = ['Critical','High','Medium','Low'].indexOf(i.priority); return n < 0 ? 4 : n; };
  return [...records].sort((a,b) => {
    const placement = bucket(a.data) - bucket(b.data); if (placement) return placement;
    const ar = readRoadmap(a.data.roadmap).metadata?.rank, br = readRoadmap(b.data.roadmap).metadata?.rank;
    if (ar !== undefined && br !== undefined) return ar - br || a.data.id.localeCompare(b.data.id);
    if (ar !== undefined || br !== undefined) return ar !== undefined ? -1 : 1;
    return priority(a.data) - priority(b.data) || a.data.id.localeCompare(b.data.id);
  });
}
