import fs from 'node:fs/promises';
import path from 'node:path';
import { ArtifactError } from './artifactDocument.js';
import { classifyEvidenceSuffix, evidenceDate, evidenceSuffix } from '../../shared/lib/evidenceNames.js';
import type { EvidenceRef } from '../../shared/types/workspace.js';
import type { Spec } from '../../shared/types/spec.js';

export { classifyEvidenceSuffix } from '../../shared/lib/evidenceNames.js';
const inside = (root: string, file: string) => {
  const relative = path.relative(root, file);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
};
async function containedFile(root: string, relativePath: string): Promise<string> {
  const base = path.resolve(root), lexical = path.resolve(base, relativePath);
  if (!relativePath || relativePath.includes('\0') || path.isAbsolute(relativePath) || !inside(base, lexical))
    throw new ArtifactError('INVALID_PATH', 'The source must be inside this repository’s docs directory.', 400);
  const [realRoot, realFile] = await Promise.all([fs.realpath(base), fs.realpath(lexical)]);
  if (!inside(realRoot, realFile)) throw new ArtifactError('INVALID_PATH', 'The source resolves outside the docs directory.', 400);
  const stat = await fs.stat(realFile);
  if (!stat.isFile() || (stat.mode & 0o444) === 0) throw new ArtifactError('UNREADABLE_SOURCE', 'The source is not a readable regular file.', 403);
  await fs.access(realFile, fs.constants.R_OK);
  return realFile;
}
export async function readEvidence(root: string, relativePath: string): Promise<string> {
  try { return await fs.readFile(await containedFile(root, relativePath), 'utf8'); }
  catch (error) {
    if (error instanceof ArtifactError) throw error;
    const code = (error as NodeJS.ErrnoException).code;
    throw new ArtifactError(code === 'ENOENT' ? 'NOT_FOUND' : 'UNREADABLE_SOURCE', code === 'ENOENT' ? 'The referenced source is missing.' : 'The referenced source could not be read.', code === 'ENOENT' ? 404 : 403);
  }
}
async function availability(root: string, relativePath: string): Promise<EvidenceRef['availability']> {
  try { await containedFile(root, relativePath); return 'present'; }
  catch (error) {
    if ((error as {code?: string}).code === 'INVALID_PATH') return 'outside-root';
    return (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'missing' : 'unreadable';
  }
}
export async function listEvidence(root: string, specs: Spec[]): Promise<EvidenceRef[]> {
  const refs = new Map<string, EvidenceRef>();
  const add = async (relative: string, specId: string, kind: EvidenceRef['kind'], recorded_at?: string) => {
    const previous = refs.get(relative);
    if (previous) { if (!previous.spec_ids.includes(specId)) previous.spec_ids.push(specId); return; }
    refs.set(relative, {path: relative, spec_ids: [specId], expectation_ids: [], kind,
      availability: await availability(root, relative), result: 'unknown', ...(recorded_at ? {recorded_at} : {})});
  };
  let files: import('node:fs').Dirent[] = [];
  try {
    const reviews = path.join(root, 'reviews');
    const [base, actual] = await Promise.all([fs.realpath(root), fs.realpath(reviews)]);
    if (!inside(base, actual)) throw new ArtifactError('EVIDENCE_INVENTORY_UNAVAILABLE', 'The reviews directory resolves outside the docs root. Repair its location to inspect product evidence.', 400);
    const directory = await fs.stat(actual);
    if (!directory.isDirectory() || (directory.mode & 0o444) === 0) throw new ArtifactError('EVIDENCE_INVENTORY_UNAVAILABLE', 'The reviews directory cannot be read. Restore directory access to inspect product evidence.', 403);
    files = await fs.readdir(reviews, {withFileTypes: true});
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error instanceof ArtifactError ? error : new ArtifactError('EVIDENCE_INVENTORY_UNAVAILABLE', 'The reviews inventory could not be read. Restore directory access and reload.', 403);
  }
  const knownIds = new Set(specs.map(spec => spec.id));
  for (const file of files.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!file.isFile() && !file.isSymbolicLink()) continue;
    // Prefer the longest exact known ID when identifiers themselves contain hyphens.
    for (let separator = file.name.lastIndexOf('-'); separator > 0; separator = file.name.lastIndexOf('-', separator - 1)) {
      const specId = file.name.slice(0, separator);
      if (!knownIds.has(specId)) continue;
      const suffix = evidenceSuffix(file.name, specId)!;
      await add(`reviews/${file.name}`, specId, classifyEvidenceSuffix(suffix), evidenceDate(suffix));
      break;
    }
  }
  for (const spec of specs) if (spec.gap_check?.report) await add(spec.gap_check.report, spec.id, 'gap-check');
  return [...refs.values()].sort((a, b) => a.path.localeCompare(b.path));
}
