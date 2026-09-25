import type { Request, Response, NextFunction } from 'express';
import { ArtifactError } from '../lib/artifactDocument.js';
import { getStore } from '../lib/yamlStore.js';
import type { ArtifactType } from '../../shared/types/source.js';
export function requireRevision(req: Request): string {
  const revision = req.get('If-Match');
  if (!revision) throw new ArtifactError('PRECONDITION_REQUIRED', 'Reload the artifact to obtain its source revision', 428);
  if (!/^"[a-f0-9]{64}"$/.test(revision)) throw new ArtifactError('INVALID_PRECONDITION', 'If-Match must contain one exact source revision', 400);
  return revision;
}
export function precondition(req: Request, _res: Response, next: NextFunction): void {
  if (['PUT','POST','DELETE','PATCH'].includes(req.method)) requireRevision(req);
  next();
}
export function sourceMeta(res: Response, type: ArtifactType, id: string) {
  const source = getStore().getSource({type,id});
  if (source) res.set('ETag',source.revision);
  return {source};
}
export function listSources(type: ArtifactType, records: {id:string}[]) {
  return Object.fromEntries(records.map(({id}) => [id,getStore().getSource({type,id})]));
}
