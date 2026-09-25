import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { parseDocument } from 'yaml';
import { ArtifactError, validateRawDocument } from './artifactDocument.js';
import { readArtifact } from './artifactFiles.js';

export async function scanArtifactNamespace(root:string, type:'products'|'intentions'|'expectations') {
  const records = new Map<string,{path:string;text:string;entity:Record<string,any>}>();
  const reserved = new Set<string>();
  const directory = path.join(root,type);
  const names = await fs.readdir(directory).catch((error:NodeJS.ErrnoException) => { if(error.code==='ENOENT') return []; throw error; });
  for (const name of names.filter(name => /\.ya?ml$/i.test(name) && !name.startsWith('.'))) {
    const relative = `${type}/${name}`;
    try {
      const {text} = readArtifact(root,relative);
      const doc = parseDocument(text); if(doc.errors.length) throw new Error('Malformed YAML');
      const raw = doc.toJS(); const entity = raw?.[type.slice(0,-1)] ?? raw;
      const prefix = {products:'PROD',intentions:'INT',expectations:'EXP'}[type];
      if (!entity || typeof entity.id !== 'string' || !new RegExp(`^${prefix}-[a-zA-Z0-9]+$`).test(entity.id)) throw new Error('Invalid artifact identity');
      validateRawDocument(text,{type,id:entity.id});
      if(records.has(entity.id)) throw new Error(`Duplicate artifact ID ${entity.id}`);
      records.set(entity.id,{path:relative,text,entity}); reserved.add(entity.id);
      const filenameId = name.match(new RegExp(`^(${prefix}-[a-zA-Z0-9]+)(?:-|\\.ya?ml$)`))?.[1];
      if(filenameId) reserved.add(filenameId);
    } catch(error) { throw new ArtifactError('INVALID_NAMESPACE',`Invalid or ambiguous ${relative}: ${String(error)}`,422); }
  }
  return {records,reserved};
}
export async function allocateArtifactId(root:string,type:'intentions'|'expectations'):Promise<string> {
  const {reserved} = await scanArtifactNamespace(root,type);
  for(const bytes of [2,3,4]) for(let attempt=0;attempt<5;attempt++) {
    const id = `${type==='intentions'?'INT':'EXP'}-${randomBytes(bytes).toString('hex')}`;
    if(!reserved.has(id)) return id;
  }
  throw new ArtifactError('ID_EXHAUSTED','Artifact identity collisions; retry creation',409);
}
