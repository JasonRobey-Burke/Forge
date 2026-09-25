import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { listEvidence, readEvidence } from './evidenceFiles.js';
import type { EvidenceRef } from '../../shared/types/workspace.js';
import type { Spec } from '../../shared/types/spec.js';
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => fs.rm(root, { recursive: true, force: true }))); });
async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-evidence-contract-')); roots.push(root);
  await fs.mkdir(path.join(root, 'reviews'));
  const write = async (relative: string, text = '# Report\nResult: passed\n') => { await fs.mkdir(path.dirname(path.join(root, relative)), { recursive: true }); await fs.writeFile(path.join(root, relative), text); };
  return { root, write };
}
function spec(id: string, report?: string): Spec {
  return { id, product_id: 'PROD-1', title: id, description: '', phase: 'Done', complexity: 'Medium', context: { stack: [], patterns: [], conventions: [], auth: '' }, boundaries: [], deliverables: [], validation_automated: [], validation_human: [], peer_reviewed: false, extras: {}, phase_changed_at: '', created_at: '', updated_at: '', archived_at: null, ...(report ? { gap_check: { status: 'passed' as const, blockers: 0, warnings: 0, report } } : {}) };
}
describe('evidence files preserve source truth and containment', () => {
  it('associates only exact known ID prefixes and keeps unsupported results unknown', async () => {
    const { root, write } = await fixture();
    for (const name of ['SPEC-1-review.md', 'SPEC-10-review.md', 'SPEC-1-deep-review.md', 'SPEC-1-gap-check.md', 'SPEC-1-execution.md', 'SPEC-1-pipeline.md', 'SPEC-1-custom.md', 'global-review.md']) await write(`reviews/${name}`);
    const refs: EvidenceRef[] = await listEvidence(root, [spec('SPEC-1')]);
    expect(refs.map(ref => ref.path).sort()).toEqual(['custom', 'deep-review', 'execution', 'gap-check', 'pipeline', 'review'].map(suffix => `reviews/SPEC-1-${suffix}.md`).sort());
    for (const ref of refs) { expect(ref.spec_ids).toEqual(['SPEC-1']); expect(ref.result).toBe('unknown'); expect(ref.availability).toBe('present'); expect(ref.recorded_at).toBeUndefined(); }
    expect(refs.find(ref => ref.path.endsWith('-custom.md'))?.kind).toBe('other');
    expect(refs.find(ref => ref.path.endsWith('-deep-review.md'))?.kind).toBe('review');
    for (const kind of ['execution', 'gap-check', 'pipeline']) expect(refs.find(ref => ref.path.endsWith(`-${kind}.md`))?.kind).toBe(kind);
  });
  it('records only a valid encoded UTC timestamp rather than inventing a date', async () => {
    const { root, write } = await fixture();
    for (const stamp of ['20260924T143015Z', '20260230T143015Z', 'yesterday']) await write(`reviews/SPEC-1-${stamp}-execution.md`);
    const refs: EvidenceRef[] = await listEvidence(root, [spec('SPEC-1')]);
    expect(refs.find(ref => ref.path.includes('20260924'))?.recorded_at).toBe('2026-09-24T14:30:15.000Z');
    for (const ref of refs.filter(ref => !ref.path.includes('20260924'))) expect(ref.recorded_at).toBeUndefined();
  });
  it('keeps explicit missing references and deduplicates an enumerated reference', async () => {
    const { root, write } = await fixture(); await write('reviews/SPEC-1-gap-check.md');
    const refs: EvidenceRef[] = await listEvidence(root, [spec('SPEC-1', 'reviews/SPEC-1-gap-check.md'), spec('SPEC-2', 'reports/missing.md')]);
    expect(refs.filter(ref => ref.path === 'reviews/SPEC-1-gap-check.md')).toHaveLength(1);
    expect(refs.find(ref => ref.path === 'reports/missing.md')).toMatchObject({ spec_ids: ['SPEC-2'], availability: 'missing', result: 'unknown' });
  });
  it('reads source bytes without altering old reports or treating HTML as executable content', async () => {
    const { root, write } = await fixture(); const source = '# Old report\n<script>globalThis.pwned = true</script>\n';
    await write('reports/legacy.md', source); const before = await fs.stat(path.join(root, 'reports/legacy.md'));
    expect(await readEvidence(root, 'reports/legacy.md')).toBe(source);
    await listEvidence(root, [spec('SPEC-1', 'reports/legacy.md')]);
    expect(await fs.readFile(path.join(root, 'reports/legacy.md'), 'utf8')).toBe(source);
    expect((await fs.stat(path.join(root, 'reports/legacy.md'))).mtimeMs).toBe(before.mtimeMs);
  });
  it('rejects lexical and symlink escapes and visibly classifies referenced outside files', async () => {
    const { root } = await fixture(); const outside = await fixture(); await outside.write('secret.md', 'secret');
    await fs.symlink(path.join(outside.root, 'secret.md'), path.join(root, 'reviews/SPEC-1-review.md'));
    for (const relative of ['../outside.md', 'reviews/SPEC-1-review.md']) await expect(readEvidence(root, relative)).rejects.toMatchObject({ code: 'INVALID_PATH' });
    const refs: EvidenceRef[] = await listEvidence(root, [spec('SPEC-1', 'reviews/SPEC-1-review.md')]);
    expect(refs.find(ref => ref.path === 'reviews/SPEC-1-review.md')).toMatchObject({ availability: 'outside-root', result: 'unknown' });
  });
  it('retains an unreadable referenced report without claiming success', async () => {
    const { root, write } = await fixture(); await write('reviews/SPEC-1-review.md');
    await fs.chmod(path.join(root, 'reviews/SPEC-1-review.md'), 0);
    try { expect((await listEvidence(root, [spec('SPEC-1', 'reviews/SPEC-1-review.md')]))[0]).toMatchObject({ availability: 'unreadable', result: 'unknown' }); }
    finally { await fs.chmod(path.join(root, 'reviews/SPEC-1-review.md'), 0o600); }
  });
});
