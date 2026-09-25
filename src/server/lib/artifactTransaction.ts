import fs from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { ArtifactError } from './artifactDocument.js';
import { sourceRevision, withArtifactLocks, assertArtifactWritable, setRecoveryPaths } from './artifactFiles.js';
import type { WorkspaceConcern } from '../../shared/types/workspace.js';
export interface FileChange { path:string; expectedRevision:string|null; text:string }
interface SavedChange extends FileChange { original:string|null; mode:number; proposedRevision:string }
interface Journal { version:1; changes:SavedChange[]; complete?:boolean }
const inside = (root:string,target:string) => { const rel=path.relative(root,target); return rel!=='' && rel!=='..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel); };
async function safe(root:string,relative:string, directory=false):Promise<string> {
  const target=path.resolve(root,relative), realRoot=await fs.realpath(root);
  if(path.isAbsolute(relative)||!inside(path.resolve(root),target)) throw new ArtifactError('INVALID_PATH',`Unsafe artifact path: ${relative}`,422);
  const parent=await fs.realpath(path.dirname(target));
  if(parent!==realRoot&&!inside(realRoot,parent)) throw new ArtifactError('INVALID_PATH',`Path escapes docs: ${relative}`,422);
  try { const stat=await fs.lstat(target); if(stat.isSymbolicLink() || (directory?!stat.isDirectory():!stat.isFile())) throw new ArtifactError('INVALID_PATH',`Unsafe nonregular path: ${relative}`,422); }
  catch(error) { if((error as NodeJS.ErrnoException).code!=='ENOENT') throw error; }
  return target;
}
async function syncDirectory(directory:string) { const handle=await fs.open(directory,'r'); try {await handle.sync();} finally {await handle.close();} }
async function durable(target:string,text:string,mode:number,onOpened?:()=>void) { const handle=await fs.open(target,'wx',mode); try { onOpened?.(); await handle.chmod(mode); await handle.writeFile(text,'utf8'); await handle.sync(); } finally {await handle.close();} }
async function current(root:string,relative:string):Promise<string|null> { const target=await safe(root,relative); try{return await fs.readFile(target,'utf8');}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;} }
const conflict=()=>new ArtifactError('REVISION_CONFLICT','File changed outside Forge; review the current parent',409);
async function check(root:string,change:FileChange) { const text=await current(root,change.path); if(change.expectedRevision===null&&text!==null)throw new ArtifactError('EEXIST',`Artifact already exists: ${change.path}`,409); if(change.expectedRevision!==null&&(text===null||sourceRevision(text)!==change.expectedRevision))throw conflict(); return text; }
async function replace(root:string,relative:string,text:string,mode:number,expected:string|null) {
  const target=await safe(root,relative), temporary=path.join(path.dirname(target),`.forge-write-${randomUUID()}.tmp`);
  try { await durable(temporary,text,mode); await check(root,{path:relative,text,expectedRevision:expected}); await safe(root,relative); await fs.rename(temporary,target); await syncDirectory(path.dirname(target)); }
  finally { await fs.unlink(temporary).catch((error:NodeJS.ErrnoException)=>{if(error.code!=='ENOENT')throw error;}); }
}
async function validateJournal(root:string,value:unknown):Promise<Journal> {
  if(!value||typeof value!=='object')throw new Error('Invalid recovery journal');
  const record=value as Journal;
  if(record.version!==1||!Array.isArray(record.changes)||!record.changes.length||('complete' in record&&typeof record.complete!=='boolean'))throw new Error('Invalid recovery journal changes or completion');
  const paths=new Set<string>();
  for(const change of record.changes) {
    if(!change||typeof change!=='object'||typeof change.path!=='string'||typeof change.text!=='string'||!(change.original===null||typeof change.original==='string')||!(change.expectedRevision===null||typeof change.expectedRevision==='string')||!Number.isInteger(change.mode)||change.mode<0||change.mode>0o7777||change.proposedRevision!==sourceRevision(change.text)||change.expectedRevision!==(change.original===null?null:sourceRevision(change.original)))throw new Error('Invalid recovery journal change');
    const target=await safe(root,change.path);if(paths.has(target))throw new Error('Duplicate recovery journal path');paths.add(target);
  }
  return record;
}
async function rollback(root:string,record:Journal,touched?:Set<string>):Promise<string[]> {
  const unresolved:string[]=[];
  await validateJournal(root,record);
  for(const change of [...record.changes].reverse()) {
    if(touched&&!touched.has(change.path))continue;
    try {
      const text=await current(root,change.path);
      if(text===change.original) continue;
      if(text===null||sourceRevision(text)!==change.proposedRevision) {unresolved.push(change.path);continue;}
      if(change.original===null) { await fs.unlink(await safe(root,change.path)); await syncDirectory(path.dirname(path.resolve(root,change.path))); }
      else await replace(root,change.path,change.original,change.mode,change.proposedRevision);
    }catch {unresolved.push(change.path);}
  }
  return unresolved;
}
async function journalDirectory(root:string) {
  const directory=await safe(root,'.forge-transactions',true);
  await fs.mkdir(directory,{mode:0o700}).catch((error:NodeJS.ErrnoException)=>{if(error.code!=='EEXIST')throw error;});
  await safe(root,'.forge-transactions',true); await syncDirectory(root); return directory;
}
const unresolvedByRoot=new Map<string,Map<string,string[]>>();
function lock(root:string,journal:string,paths:string[]) {
  const key=realpathSync(root), records=unresolvedByRoot.get(key)??new Map<string,string[]>();
  if(paths.length)records.set(journal,paths);else records.delete(journal);
  unresolvedByRoot.set(key,records);setRecoveryPaths(root,[...records.values()].flat());
}
async function removeJournal(directory:string,file:string) {await fs.unlink(file); await syncDirectory(directory);}
/** Recoverable set persistence, not cross-process atomicity: external readers can observe intermediate files.
 * The final revision-check to rename interval cannot exclude uncooperative external writers. */
export async function commitArtifactSet(root:string,changes:FileChange[]):Promise<void> {
  if(!changes.length||new Set(changes.map(c=>path.resolve(root,c.path))).size!==changes.length)throw new ArtifactError('INVALID_PATH','An artifact set must have distinct paths',422);
  for(const change of changes) {await safe(root,change.path);assertArtifactWritable(root,change.path);}
  return withArtifactLocks(root,changes.map(c=>c.path),async()=>{
    const saved:SavedChange[]=[];
    for(const change of changes) {
      assertArtifactWritable(root,change.path);
      const original=await check(root,change);
      saved.push({...change,original,mode:original===null?0o644:(await fs.stat(await safe(root,change.path))).mode&0o7777,proposedRevision:sourceRevision(change.text)});
    }
    const directory=await journalDirectory(root), file=path.join(directory,`${randomUUID()}.json`);
    const record:Journal={version:1,changes:saved};
    await durable(file,JSON.stringify(record),0o600);await syncDirectory(directory);
    let completionRenamed=false;
    const touched=new Set<string>();
    try {
      for(const change of saved) {
        await check(root,change);
        if(change.original===null) {await durable(await safe(root,change.path),change.text,change.mode,()=>touched.add(change.path));await syncDirectory(path.dirname(path.resolve(root,change.path)));}
        else {touched.add(change.path);await replace(root,change.path,change.text,change.mode,change.expectedRevision);}
      }
      // Durable completion precedes success. Recovery must never undo a reported success.
      const completed=path.join(directory,`.forge-write-${randomUUID()}.tmp`);
      try {await durable(completed,JSON.stringify({...record,complete:true}),0o600);await fs.rename(completed,file);completionRenamed=true;await syncDirectory(directory);} finally {await fs.unlink(completed).catch(()=>{});}
    }catch(error) {
      if(completionRenamed) {
        lock(root,file,saved.map(c=>c.path));
        throw new ArtifactError('RECOVERY_REQUIRED',`Completion durability uncertain; recovery required for ${saved.map(c=>c.path).join(', ')}`,409);
      }
      const unresolved=await rollback(root,record,touched);
      if(unresolved.length) {lock(root,file,saved.map(c=>c.path));throw new ArtifactError('RECOVERY_REQUIRED',`Recovery required for ${unresolved.join(', ')}`,409);}
      await removeJournal(directory,file); throw error;
    }
    try {await removeJournal(directory,file);}catch {
      lock(root,file,saved.map(c=>c.path));throw new ArtifactError('RECOVERY_REQUIRED',`Journal cleanup required for ${saved.map(c=>c.path).join(', ')}`,409);
    }
  });
}
export async function recoverArtifactTransactions(root:string):Promise<WorkspaceConcern[]> {
  const concerns:WorkspaceConcern[]=[];
  const concern=(file:string,message:string)=>concerns.push({key:`recovery:${file}`,code:'RECOVERY_REQUIRED',entity:{type:'products',id:file},message,related:[],kind:'attention'});
  let directory:string;
  try {directory=await safe(root,'.forge-transactions',true);if(!(await fs.stat(directory).catch(()=>null)))return [];}
  catch(error){concern('.forge-transactions',String(error));return concerns;}
  for(const name of (await fs.readdir(directory)).filter(n=>n.endsWith('.json'))) {
    const file=path.join(directory,name);let record:Journal|undefined;
    try {
      await safe(root,`.forge-transactions/${name}`);
      record=JSON.parse(await fs.readFile(file,'utf8'));
      record=await validateJournal(root,record);
      const unresolved=record.complete?[]:await withArtifactLocks(root,record.changes.map(c=>c.path),()=>rollback(root,record!));
      if(unresolved.length) {lock(root,file,record.changes.map(c=>c.path));concern(name,`Recovery required for ${unresolved.join(', ')}`);}
      else {await removeJournal(directory,file);lock(root,file,[]);}
    }catch(error) {if(Array.isArray(record?.changes))lock(root,file,record.changes.filter(c=>c&&typeof c.path==='string').map(c=>c.path));concern(name,`Unsafe or unreadable recovery journal ${name}: ${String(error)}`);}
  }
  return concerns;
}
