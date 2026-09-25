import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { useArtifactDraft } from './useArtifactDraft';
import type { ArtifactRef, SourceMeta } from '@shared/types/source.js';
const ref: ArtifactRef = { type: 'expectations', id: 'EXP-1' };
const source: SourceMeta = { repository_id: 'repo-one', revision: 'a'.repeat(64), path: 'expectations/EXP-1.yaml', read_only_fields: {} };
const record = { data: { description: 'Original' }, source };
beforeEach(() => sessionStorage.clear());
afterEach(() => vi.restoreAllMocks());
describe('session-scoped protected drafts', () => {
  it('preserves local values and base on a refetched external record', () => {
    const { result, rerender } = renderHook(({ current }) => useArtifactDraft(ref, current), { initialProps: { current: record } });
    act(() => result.current.change({ description: 'Unsaved' }));
    rerender({ current: { data: { description: 'External' }, source: { ...source, revision: 'b'.repeat(64) } } });
    expect(result.current.draft.values.description).toBe('Unsaved');
    expect(result.current.draft.source.revision).toBe(source.revision);
    expect(result.current.draft.external_revision).toBe('b'.repeat(64));
  });
  it('offers recovery on remount without replaying it; explicit restore keeps its stale base', async () => {
    const first = renderHook(() => useArtifactDraft(ref, record));
    act(() => first.result.current.change({ description: 'Recover me' }));
    first.unmount();
    const latest = { data: { description: 'External' }, source: { ...source, revision: 'b'.repeat(64) } };
    const second = renderHook(() => useArtifactDraft(ref, latest));
    await waitFor(() => expect(second.result.current.recovery).not.toBeNull());
    expect(second.result.current.draft.values.description).toBe('External');
    act(() => second.result.current.restore(second.result.current.recovery!));
    expect(second.result.current.draft.values.description).toBe('Recover me');
    expect(second.result.current.draft.source.revision).toBe(source.revision);
    expect(second.result.current.draft.external_revision).toBe(latest.source.revision);
  });
  it.each(['saved', 'discard'] as const)('%s clears persisted recovery', async action => {
    const first = renderHook(() => useArtifactDraft(ref, record));
    act(() => first.result.current.change({ description: 'Unsaved' }));
    act(() => action === 'saved' ? first.result.current.saved({ ...record, data: { description: 'Saved' } }) : first.result.current.discard());
    first.unmount();
    const second = renderHook(() => useArtifactDraft(ref, record));
    await waitFor(() => expect(second.result.current.recovery).toBeNull());
  });
  it('does not recover another repository or entity draft', () => {
    const first = renderHook(() => useArtifactDraft(ref, record));
    act(() => first.result.current.change({ description: 'Private draft' }));
    first.unmount();
    const otherRepo = renderHook(() => useArtifactDraft(ref, { ...record, source: { ...source, repository_id: 'other-repo' } }));
    const otherEntity = renderHook(() => useArtifactDraft({ ...ref, id: 'EXP-2' }, record));
    expect(otherRepo.result.current.recovery).toBeNull();
    expect(otherEntity.result.current.recovery).toBeNull();
  });
  it('keeps dirty memory state when storage reads and writes throw', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage unavailable'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage unavailable'); });
    const { result } = renderHook(() => useArtifactDraft(ref, record));
    act(() => result.current.change({ description: 'Still protected' }));
    expect(result.current.draft.values.description).toBe('Still protected');
    expect(result.current.draft.dirty).toBe(true);
    expect(result.current.draft.recovery_unavailable).toBe(true);
  });
});
