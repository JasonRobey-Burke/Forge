import fs from 'node:fs/promises';
import path from 'node:path';
import { stringify } from 'yaml';
import { getStore } from '../lib/yamlStore.js';
import { allocateArtifactId, scanArtifactNamespace } from '../lib/artifactIds.js';
import { commitArtifactSet, type FileChange } from '../lib/artifactTransaction.js';
import { ArtifactError, editDocument } from '../lib/artifactDocument.js';
import { sourceRevision, readArtifact, assertArtifactWritable } from '../lib/artifactFiles.js';
import { createIntentionDraftSchema, createExpectationDraftSchema, reparentExpectationSchema, type CreateIntentionDraft, type CreateExpectationDraft } from '../../shared/schemas/creation.js';
import type { Versioned, ArtifactRef } from '../../shared/types/source.js';
import type { Intention } from '../../shared/types/intention.js';
import type { Expectation } from '../../shared/types/expectation.js';
async function parent(type:'products'|'intentions'|'expectations',id:string,revision:string) {
  if(!revision)throw new ArtifactError('PRECONDITION_REQUIRED','Review the current parent first',428);
  const result=(await scanArtifactNamespace(getStore().getDocsRoot(),type)).records.get(id);
  if(!result||sourceRevision(result.text)!==revision)throw new ArtifactError('REVISION_CONFLICT',`Parent ${id} changed or was deleted; review it again`,409);
  if(result.entity.archived_at)throw new ArtifactError('VALIDATION_ERROR','Archived parent cannot receive drafts',422);
  return result;
}
function links(entity:Record<string,any>,key:string):string[] {
  const value=entity[key]??[];
  if(!Array.isArray(value)||value.some(v=>typeof v!=='string')||new Set(value).size!==value.length)throw new ArtifactError('VALIDATION_ERROR',`Repair ambiguous ${key} links before creation`,422);
  return value;
}
/** Only creation may prepare these two canonical namespaces; transaction paths stay untrusted. */
async function prepareNamespace(root:string,type:'intentions'|'expectations',parentPath:string,parentRevision:string):Promise<void> {
  const canonicalRoot=await fs.realpath(root);
  const directory=path.join(canonicalRoot,type);
  if(!['intentions','expectations'].includes(type)||path.dirname(directory)!==canonicalRoot)
    throw new ArtifactError('INVALID_PATH','Invalid creation namespace',422);
  const existing=await fs.lstat(directory).catch((error:NodeJS.ErrnoException)=>{if(error.code==='ENOENT')return null;throw error;});
  if(existing&&(existing.isSymbolicLink()||!existing.isDirectory()))
    throw new ArtifactError('INVALID_PATH',`Creation namespace must be a regular directory: ${type}`,422);
  assertArtifactWritable(root,parentPath);
  if(readArtifact(root,parentPath).revision!==parentRevision)
    throw new ArtifactError('REVISION_CONFLICT','Parent changed before creation; review it again',409);
  if(!existing)await fs.mkdir(directory,{mode:0o755}).catch((error:NodeJS.ErrnoException)=>{if(error.code!=='EEXIST')throw error;});
  const verified=await fs.lstat(directory);
  if(verified.isSymbolicLink()||!verified.isDirectory()||await fs.realpath(directory)!==directory)
    throw new ArtifactError('INVALID_PATH',`Unsafe creation namespace: ${type}`,422);
}
async function commit(changes:FileChange[],refs:ArtifactRef[]) {
  const store=getStore();changes.forEach((change,index)=>store.validateCandidate(refs[index],change.path,change.text));
  await commitArtifactSet(store.getDocsRoot(),changes);store.publishArtifactSet(changes);
}
export async function createIntentionDraft(input:CreateIntentionDraft,parentRevision:string):Promise<Versioned<Intention>> {
  const data=createIntentionDraftSchema.parse(input),store=getStore();
  return store.mutateArtifactSet(async()=>{
    const selected=await parent('products',data.product_id,parentRevision);
    links(selected.entity,'intentions');
    await prepareNamespace(store.getDocsRoot(),'intentions',selected.path,parentRevision);
    for(let attempt=0;attempt<15;attempt++) {
      const id=await allocateArtifactId(store.getDocsRoot(),'intentions'),ref:ArtifactRef={type:'intentions',id};
      const entity={id,product:data.product_id,statement:data.statement,rationale:data.rationale,priority:data.priority,owner:data.owner,status:'draft',dependencies:[],expectations:[],...(typeof selected.entity.exploration==='string'&&selected.entity.exploration.trim()?{exploration:selected.entity.exploration}: {})};
      const changes=[{path:`intentions/${id}.yaml`,expectedRevision:null,text:stringify({intention:entity})},{path:selected.path,expectedRevision:parentRevision,text:editDocument(selected.text,{type:'products',id:data.product_id},{intentions:[...links(selected.entity,'intentions'),id]})}];
      try {await commit(changes,[ref,{type:'products',id:data.product_id}]);return {data:store.getIntention(id)!,source:store.getSource(ref)!};}
      catch(error){if((error as NodeJS.ErrnoException).code==='EEXIST')continue;throw error;}
    }
    throw new ArtifactError('ID_EXHAUSTED','Concurrent ID collisions; retry creation',409);
  });
}
export async function createExpectationDraft(input:CreateExpectationDraft,parentRevision:string):Promise<Versioned<Expectation>> {
  const data=createExpectationDraftSchema.parse(input),store=getStore();
  return store.mutateArtifactSet(async()=>{
    const selected=await parent('intentions',data.intention_id,parentRevision);
    const productId=selected.entity.product_id??selected.entity.product;
    const product=(await scanArtifactNamespace(store.getDocsRoot(),'products')).records.get(productId);
    if(!product||product.entity.archived_at)throw new ArtifactError('VALIDATION_ERROR','Parent must belong to a live product',422);
    links(selected.entity,'expectations');
    await prepareNamespace(store.getDocsRoot(),'expectations',selected.path,parentRevision);
    for(let attempt=0;attempt<15;attempt++) {
      const id=await allocateArtifactId(store.getDocsRoot(),'expectations'),ref:ArtifactRef={type:'expectations',id};
      const entity={id,intention:data.intention_id,description:data.description,validation_criteria:data.validation_criteria,edge_cases:data.edge_cases,complexity:data.complexity,owner:data.owner,status:'draft',...(typeof selected.entity.exploration==='string'&&selected.entity.exploration.trim()?{exploration:selected.entity.exploration}: {})};
      const changes=[{path:`expectations/${id}.yaml`,expectedRevision:null,text:stringify({expectation:entity})},{path:selected.path,expectedRevision:parentRevision,text:editDocument(selected.text,{type:'intentions',id:data.intention_id},{expectations:[...links(selected.entity,'expectations'),id]})}];
      try {await commit(changes,[ref,{type:'intentions',id:data.intention_id}]);return {data:store.getExpectation(id)!,source:store.getSource(ref)!};}
      catch(error){if((error as NodeJS.ErrnoException).code==='EEXIST')continue;throw error;}
    }
    throw new ArtifactError('ID_EXHAUSTED','Concurrent ID collisions; retry creation',409);
  });
}
export async function reparentExpectation(id:string,input:unknown,revision:string):Promise<Versioned<Expectation>> {
  const data=reparentExpectationSchema.parse(input),store=getStore();
  return store.mutateArtifactSet(async()=>{
    const child=await parent('expectations',id,revision),oldId=child.entity.intention_id??child.entity.intention;
    if(oldId===data.intention_id)throw new ArtifactError('VALIDATION_ERROR','Choose a different parent intention',422);
    const old=await parent('intentions',oldId,data.old_parent_revision),next=await parent('intentions',data.intention_id,data.new_parent_revision);
    const product=old.entity.product_id??old.entity.product;
    if(!product||product!==(next.entity.product_id??next.entity.product)||child.entity.product_id&&child.entity.product_id!==product)throw new ArtifactError('VALIDATION_ERROR','Reparenting requires the same product',422);
    const liveProduct=(await scanArtifactNamespace(store.getDocsRoot(),'products')).records.get(product);
    if(!liveProduct||liveProduct.entity.archived_at)throw new ArtifactError('VALIDATION_ERROR','Parent product is missing',422);
    const refs:ArtifactRef[]=[{type:'expectations',id},{type:'intentions',id:oldId},{type:'intentions',id:data.intention_id}];
    const changes=[{path:child.path,expectedRevision:revision,text:editDocument(child.text,refs[0],{intention_id:data.intention_id})},{path:old.path,expectedRevision:data.old_parent_revision,text:editDocument(old.text,refs[1],{expectations:links(old.entity,'expectations').filter(value=>value!==id)})},{path:next.path,expectedRevision:data.new_parent_revision,text:editDocument(next.text,refs[2],{expectations:[...new Set([...links(next.entity,'expectations'),id])]})}];
    await commit(changes,refs);return {data:store.getExpectation(id)!,source:store.getSource(refs[0])!};
  });
}
