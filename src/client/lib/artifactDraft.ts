import type { ArtifactRef, SourceMeta, Versioned } from '@shared/types/source';
export interface ArtifactDraft<T> {
  ref: ArtifactRef; source: SourceMeta; baseline: T; values: T;
  dirty: boolean; external_revision?: string; recovery_unavailable: boolean;
}
export type DraftEvent<T> = {type:'edit';values:T} | {type:'external';source:SourceMeta}
  | {type:'saved'|'reload';record:Versioned<T>};
export function reduceDraft<T>(draft:ArtifactDraft<T>,event:DraftEvent<T>):ArtifactDraft<T> {
  if(event.type==='edit') return {...draft,values:event.values,dirty:JSON.stringify(event.values)!==JSON.stringify(draft.baseline)};
  if(event.type==='external') return {...draft,external_revision:event.source.revision===draft.source.revision?undefined:event.source.revision};
  return {...draft,source:event.record.source,baseline:event.record.data,values:event.record.data,dirty:false,external_revision:undefined};
}
export function draftPrefix(ref:ArtifactRef,source:SourceMeta):string {
  return `forge:draft:${JSON.stringify([source.repository_id,ref.type,ref.id])}:`;
}
export function draftKey(ref:ArtifactRef,source:SourceMeta):string {return draftPrefix(ref,source)+encodeURIComponent(source.revision);}
export function readRecovery<T>(ref:ArtifactRef,source:SourceMeta,template?:T):ArtifactDraft<T>|null {
  // Probe access even when storage is empty: some browsers prohibit all storage operations.
  sessionStorage.getItem(draftKey(ref,source));
  const prefix=draftPrefix(ref,source);
  for(let i=0;i<sessionStorage.length;i++) {
    const key=sessionStorage.key(i); if(!key?.startsWith(prefix)) continue;
    let value; try {value=JSON.parse(sessionStorage.getItem(key)??'null');} catch {continue;}
    if(value?.version!==1||!validRecovery(value,ref,source,template)||key!==draftKey(ref,value.source)) continue;
    return {...value,dirty:JSON.stringify(value.values)!==JSON.stringify(value.baseline),recovery_unavailable:false};
  }
  return null;
}
export function clearRecovery(ref:ArtifactRef,source:SourceMeta) {
  const prefix=draftPrefix(ref,source);
  const keys=Array.from({length:sessionStorage.length},(_,i)=>sessionStorage.key(i));
  keys.forEach(key=>{if(key?.startsWith(prefix)) sessionStorage.removeItem(key);});
}

function isRecord(value:unknown):value is Record<string,unknown>{return !!value&&typeof value==='object'&&!Array.isArray(value);}
function compatible(value:unknown,template:unknown):boolean {
  if(template===null||template===undefined)return true;
  if(Array.isArray(template))return Array.isArray(value)&&value.every(item=>!template.length||compatible(item,template[0]));
  if(isRecord(template))return isRecord(value)&&Object.keys(template).every(key=>!(key in value)||compatible(value[key],template[key]));
  return typeof value===typeof template;
}
export function validRecovery<T>(value:unknown,ref:ArtifactRef,source:SourceMeta,template?:T):value is ArtifactDraft<T>&{version?:number}{
  if(!isRecord(value)||!isRecord(value.ref)||!isRecord(value.source)||!isRecord(value.baseline)||!isRecord(value.values))return false;
  const meta=value.source;
  if(value.ref.type!==ref.type||value.ref.id!==ref.id||meta.repository_id!==source.repository_id||typeof meta.revision!=='string'||!meta.revision||typeof meta.path!=='string'||!isRecord(meta.read_only_fields)||!Object.values(meta.read_only_fields).every(v=>typeof v==='string'))return false;
  if(value.version!==undefined&&value.version!==1)return false;
  const stringFields=['description','owner','title','name','status','priority','rationale','validation_criteria','complexity','deferred_reason','problem_statement','vision','target_audience'];
  for(const data of [value.baseline,value.values]){
    if(stringFields.some(key=>key in data&&typeof data[key]!=='string'))return false;
    if('edge_cases' in data&&(!Array.isArray(data.edge_cases)||!data.edge_cases.every(item=>typeof item==='string')))return false;
    if(!compatible(data,template))return false;
  }
  return true;
}

// Explicit, in-memory handoff. Reload recovery still requires the user's Restore action.
const transfers = new Map<string, ArtifactDraft<unknown>>();
export function transferDraft<T>(draft: ArtifactDraft<T>): string {
  const token = crypto.randomUUID(); transfers.set(token, draft); return token;
}
export function transferredDraft<T>(token: string | null, ref: ArtifactRef, source: SourceMeta, template: T): ArtifactDraft<T> | undefined {
  if (!token) return undefined;
  const value = transfers.get(token);
  return validRecovery(value, ref, source, template) ? value : undefined;
}
export function clearTransfer(token: string | null) { if (token) transfers.delete(token); }
