import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { ArtifactError } from './artifactDocument.js';

export function sourceRevision(text: string): string {
  return `"${createHash('sha256').update(text).digest('hex')}"`;
}

function contained(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function resolveArtifact(root: string, relativePath: string, writing = false): string {
  const base = path.resolve(root);
  const target = path.resolve(base, relativePath);
  if (path.isAbsolute(relativePath) || !contained(base, target))
    throw new ArtifactError('INVALID_PATH', 'Artifact path must be inside the docs root', 422);
  const canonicalRoot = fs.realpathSync(base);
  // Check the parent first, including when the final file has been deleted.
  if (!contained(canonicalRoot, fs.realpathSync(path.dirname(target))) && fs.realpathSync(path.dirname(target)) !== canonicalRoot)
    throw new ArtifactError('INVALID_PATH', 'Artifact directory resolves outside the docs root', 422);
  const stat = fs.lstatSync(target);
  if (writing && stat.isSymbolicLink())
    throw new ArtifactError('INVALID_PATH', 'Artifact symlinks cannot be replaced; edit the source file directly', 422);
  const real = fs.realpathSync(target);
  if (!contained(canonicalRoot, real) || !fs.statSync(real).isFile())
    throw new ArtifactError('INVALID_PATH', 'Artifact must be a regular file inside the docs root', 422);
  return writing ? target : real;
}

export function readArtifact(root: string, relativePath: string): { text: string; revision: string; mode: number } {
  const target = resolveArtifact(root, relativePath);
  const text = fs.readFileSync(target, 'utf8');
  return { text, revision: sourceRevision(text), mode: fs.statSync(target).mode };
}

const fileQueues = new Map<string, Promise<void>>();
const productQueues = new Map<string, Promise<void>>();
async function queued<T>(queues: Map<string, Promise<void>>, key: string, work: () => Promise<T>): Promise<T> {
  const previous = queues.get(key) ?? Promise.resolve();
  let release!: () => void;
  const tail = new Promise<void>(resolve => { release = resolve; });
  queues.set(key, tail);
  await previous;
  try { return await work(); }
  finally {
    release();
    if (queues.get(key) === tail) queues.delete(key);
  }
}

/** Acquire product locks before file locks; callers hold this through index publication. Not reentrant. */
export function withProductMutation<T>(productId: string, work: () => Promise<T>): Promise<T> {
  return queued(productQueues, productId, work);
}

const recoveryLocks = new Map<string, Set<string>>();
function canonicalArtifactKey(root:string, relative:string):string {
  const target=path.resolve(root,relative);
  try{return path.join(fs.realpathSync(path.dirname(target)),path.basename(target));}
  catch{return path.resolve(fs.realpathSync(root),relative);}
}
export function setRecoveryPaths(root: string, paths: string[]): void { recoveryLocks.set(fs.realpathSync(root), new Set(paths.map(p => canonicalArtifactKey(root,p)))); }
export function recoveryPaths(root:string):string[] {return [...(recoveryLocks.get(fs.realpathSync(root))??[])].map(p=>path.relative(fs.realpathSync(root),p));}

export function assertArtifactWritable(root:string, relativePath:string):void {
  if(recoveryLocks.get(fs.realpathSync(root))?.has(canonicalArtifactKey(root,relativePath))) throw new ArtifactError('RECOVERY_REQUIRED', `Recovery required for ${relativePath}`,409);
}
export async function withArtifactLocks<T>(root:string, paths:string[], work:()=>Promise<T>):Promise<T> {
  const keys = [...new Set(paths.map(p => path.join(fs.realpathSync(path.dirname(path.resolve(root,p))),path.basename(p))))].sort();
  const acquire = (index:number):Promise<T> => index===keys.length ? work() : queued(fileQueues,keys[index],()=>acquire(index+1));
  return acquire(0);
}

export async function commitArtifact(input: {
  root: string; relativePath: string; expectedRevision: string; transform: (text: string) => string;
}): Promise<{ text: string; revision: string }> {
  const { root, relativePath, expectedRevision, transform } = input;
  if (!expectedRevision) throw new ArtifactError('PRECONDITION_REQUIRED', 'Reload the artifact to obtain its source revision', 428);
  // Canonical parents ensure different in-root directory aliases share the same queue.
  let target: string;
  try { target = resolveArtifact(root, relativePath, true); }
  catch (error) { throw storageError(error); }
  const queueKey = path.join(fs.realpathSync(path.dirname(target)), path.basename(target));
  const verifyLocation = () => {
    const currentPath = resolveArtifact(root, relativePath, true);
    if (fs.realpathSync(currentPath) !== queueKey)
      throw new ArtifactError('REVISION_CONFLICT', 'Artifact location changed; reload the source', 409);
  };
  target = queueKey;
  return queued(fileQueues, queueKey, async () => {
    let temporary: string | undefined;
    try {
      assertArtifactWritable(root,relativePath);
      verifyLocation();
      const current = readArtifact(root, relativePath);
      if (current.revision !== expectedRevision) throw conflict();
      const text = transform(current.text);
      if (typeof text !== 'string') throw new ArtifactError('INVALID_SOURCE', 'The candidate must be YAML text', 422);
      temporary = path.join(path.dirname(target), `.forge-write-${randomUUID()}.tmp`);
      const fd = fs.openSync(temporary, 'wx', current.mode & 0o7777);
      try {
        fs.fchmodSync(fd, current.mode & 0o7777);
        fs.writeFileSync(fd, text, 'utf8');
        fs.fsyncSync(fd);
      } finally { fs.closeSync(fd); }
      verifyLocation();
      if (readArtifact(root, relativePath).revision !== expectedRevision) throw conflict();
      // An uncooperative external process can still write between this check and rename.
      fs.renameSync(temporary, target);
      temporary = undefined;
      return { text, revision: sourceRevision(text) };
    } catch (error) { throw storageError(error); }
    finally {
      if (temporary && fs.existsSync(temporary)) {
        try { fs.unlinkSync(temporary); }
        catch (error) { throw new ArtifactError('WRITE_FAILED', 'Could not remove the temporary artifact file', 500, { temporary, cause: String(error) }); }
      }
    }
  });
}
function conflict(): ArtifactError {
  return new ArtifactError('REVISION_CONFLICT', 'File changed outside Forge; reload and compare your draft', 409);
}
function storageError(error: unknown): ArtifactError {
  if (error instanceof ArtifactError) return error;
  if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') return conflict();
  return new ArtifactError('WRITE_FAILED', 'Artifact save failed; the original source has been retained', 500, { cause: String(error) });
}
