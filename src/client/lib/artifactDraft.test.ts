import { describe, it, expect } from 'vitest';
import { reduceDraft, draftKey, type ArtifactDraft } from './artifactDraft';
import type { SourceMeta, ArtifactRef } from '@shared/types/source.js';
const ref: ArtifactRef = { type: 'expectations', id: 'EXP-1' };
const source: SourceMeta = { repository_id: 'repo-one', revision: 'a'.repeat(64), path: 'expectations/EXP-1.yaml', read_only_fields: {} };
const initial = (): ArtifactDraft<{ description: string }> => ({ ref, source, baseline: { description: 'Original' }, values: { description: 'Original' }, dirty: false, recovery_unavailable: false });
describe('artifact draft contract', () => {
  it('tracks edits and returning to the baseline', () => {
    const changed = reduceDraft(initial(), { type: 'edit', values: { description: 'Draft' } });
    expect(changed.dirty).toBe(true);
    expect(changed.baseline.description).toBe('Original');
    expect(reduceDraft(changed, { type: 'edit', values: { description: 'Original' } }).dirty).toBe(false);
  });
  it('retains text and base revision when the source changes externally', () => {
    const changed = reduceDraft(initial(), { type: 'edit', values: { description: 'Draft' } });
    const result = reduceDraft(changed, { type: 'external', source: { ...source, revision: 'b'.repeat(64) } });
    expect(result.values.description).toBe('Draft');
    expect(result.source.revision).toBe(source.revision);
    expect(result.external_revision).toBe('b'.repeat(64));
    expect(result.dirty).toBe(true);
  });
  it.each(['saved', 'reload'] as const)('%s adopts the returned source and clean baseline', type => {
    const changed = reduceDraft(initial(), { type: 'edit', values: { description: 'Draft' } });
    const record = { data: { description: 'Server version' }, source: { ...source, revision: 'b'.repeat(64) } };
    const result = reduceDraft(changed, { type, record });
    expect(result.values).toEqual(record.data);
    expect(result.baseline).toEqual(record.data);
    expect(result.source).toEqual(record.source);
    expect(result.dirty).toBe(false);
    expect(result.external_revision).toBeUndefined();
  });
  it('isolates recovery by repository, entity type, ID and base revision', () => {
    const keys = [draftKey(ref, source), draftKey(ref, { ...source, repository_id: 'repo-two' }), draftKey({ ...ref, type: 'intentions' }, source), draftKey({ ...ref, id: 'EXP-2' }, source), draftKey(ref, { ...source, revision: 'b'.repeat(64) })];
    expect(new Set(keys).size).toBe(keys.length);
    expect(draftKey(ref, source)).toBe(keys[0]);
  });
});
