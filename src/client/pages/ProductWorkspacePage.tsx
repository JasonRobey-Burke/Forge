import type { Product, Intention } from '@shared/types';
import CreationWizard from '@/components/workspace/CreationWizard';
import ProductTree from '@/components/workspace/ProductTree';
import { useState, useRef } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useWorkspace, workspaceKey } from '@/hooks/useWorkspace';
import { apiFetchEnvelope } from '@/lib/api';
import type { SourceMeta, Versioned } from '@shared/types/source';
import type { WorkspaceProjection } from '@shared/types/workspace';
import ArtifactEditor, {type EditableArtifact} from '@/components/workspace/ArtifactEditor';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import ProgressSummary from '@/components/workspace/ProgressSummary';
import OutcomeList from '@/components/workspace/OutcomeList';
import AttentionList from '@/components/workspace/AttentionList';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { Button } from '@/components/ui/button';
export default function ProductWorkspacePage({view='overview'}:{view?:'overview'|'map'}){
  const {id=''}=useParams(); const query=useWorkspace(id);const qc=useQueryClient();
  useDocumentTitle(`${query.data?.product.data.name??'Product'} — ${view==='map'?'Product map':'Overview'}`);
  const [params,setParams]=useSearchParams();
  const [expanded,setExpanded]=useState<Set<string>>(()=>new Set(params.get('outcome')?[params.get('outcome')!]:[]));
  const creationParent=useRef<Versioned<Product|Intention>|null>(null);
  const [creation,setCreation]=useState<{type:'intentions'|'expectations';parentId:string}|null>(null);
  const [dismissed,setDismissed]=useState<string|null>(null);
  const captured=useRef<{id:string;record:Versioned<EditableArtifact>;type:'products'|'intentions'|'expectations'}|null>(null);
  if((query.isPending||query.isLoading)&&!query.data)return <p role="status">Loading product workspace…</p>;
  if(!query.data)return <p role="alert">Could not load product workspace. {query.error?.message}</p>;
  const w=query.data, p=w.product.data;
  const selection=params.get('edit');
  const latestEdited=selection===p.id?w.product:w.expectations.find(e=>e.data.id===selection)??w.intentions.find(i=>i.data.id===selection);
  if(selection&&latestEdited)captured.current={id:selection,record:latestEdited,type:selection===p.id?'products':w.intentions.some(i=>i.data.id===selection)?'intentions':'expectations'};
  const retained=captured.current?.id===selection?captured.current:null;
  const edited=latestEdited??retained?.record;
  const type=retained?.type??'expectations';
  const concern=params.get('concern');
  const outcome=params.get('outcome');
  const phase=params.get('phase')??'';
  const activeIds=new Set([...w.coverage.covered_ids,...w.coverage.uncovered_ids]);
  const relevantExpectations=Array.from(new Map(w.expectations.map(e=>[e.data.id,e])).values()).filter(e=>activeIds.has(e.data.id)&&(!outcome||e.data.intention_id===outcome));
  const supporting=concern==='validation'?relevantExpectations.filter(e=>w.reported_validated_ids.includes(e.data.id)):concern==='coverage'?relevantExpectations:[];
  const relevantIds=new Set(relevantExpectations.map(e=>e.data.id));
  const deliveryIds=new Set(Object.values(w.delivery).flat());
  const supportingSpecs=Array.from(new Map(w.specs.map(s=>[s.data.id,s])).values()).filter(s=>deliveryIds.has(s.data.id)&&(!outcome||w.spec_expectation_ids[s.data.id]?.some(e=>relevantIds.has(e))||s.data.intentions?.includes(outcome))&&(!phase||concern!=='delivery'||w.delivery[phase]?.includes(s.data.id))&&(concern!=='review'||['Review','Validating'].includes(s.data.phase)));
  const causes=w.concerns.filter(c=>params.get('cause')?c.key===params.get('cause'):concern==='blocked'?c.code==='BLOCKED_NEXT_PHASE':concern==='attention');
  function close(){setDismissed(selection);const next=new URLSearchParams(params);next.delete('edit');setParams(next,{replace:true,preventScrollReset:true});}
  return <WorkspaceShell><header className="flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 text-xs uppercase tracking-widest text-stone-500">{p.id} / {view==='map'?'Product map':'Product workspace'}</p><h1 className="text-3xl font-semibold tracking-tight">{view==='map'?'How intent connects':p.name}</h1>{view==='map'&&<p className="mt-2 text-sm text-stone-500">{p.name}</p>}<div className="mt-3 max-w-3xl text-stone-600"><MarkdownRenderer content={p.problem_statement} variant="inline"/></div><div className="mt-3 flex gap-3 text-sm text-stone-500"><span>{p.owner||'Owner unassigned'}</span><span className="rounded bg-emerald-50 px-2 text-emerald-800">{p.status}</span></div></div><Button variant="outline" onClick={()=>{setDismissed(null);setParams(prev=>{const next=new URLSearchParams(prev);next.set('edit',p.id);return next;},{preventScrollReset:true});}}>Edit product</Button></header>
    {query.isError&&<div role="alert" className="rounded border border-amber-200 bg-amber-50 p-3 text-sm">Refresh failed. Displayed workspace data may be stale. {query.error.message} <Button variant="outline" onClick={()=>void query.refetch()}>Retry</Button></div>}
    {w.incomplete&&<p role="alert" className="rounded border border-amber-200 bg-amber-50 p-3 text-sm">Summary completeness is uncertain because some files or relationships could not be read.</p>}
    {w.diagnostics.map(d=><p role="alert" key={d.key} className="text-sm text-amber-800">{d.message}</p>)}
    {view==='overview'&&<ProgressSummary workspace={w}/>}
    {concern&&<section aria-label="Supporting records" className="rounded-lg border border-emerald-200 bg-white p-5"><div className="flex justify-between"><h2 className="font-semibold">Supporting records · {concern}</h2><Link to={outcome?`?outcome=${outcome}`:'?'}>Close</Link></div><p className="mt-2 text-xs text-stone-500">Coverage describes links. Done describes delivery. Reported validation does not establish a supporting result.</p><>{concern==='delivery'&&<label className="mt-3 block text-sm">Filter by phase<select aria-label="Filter by phase" className="ml-3 rounded border bg-white p-2" value={phase} onChange={event=>{const next=new URLSearchParams(params);if(event.target.value)next.set('phase',event.target.value);else next.delete('phase');setParams(next,{preventScrollReset:true});}}><option value="">All phases</option>{Object.keys(w.delivery).map(value=><option key={value} value={value}>{value}</option>)}</select></label>}</><ul className="mt-3 space-y-2">{supporting.map(e=><li key={e.data.id}><Link className="text-sm text-emerald-800" to={`/expectations/${e.data.id}`}>{e.data.id} · {e.data.description} · {concern==='coverage'?(w.coverage.covered_ids.includes(e.data.id)?'Linked spec':'No linked spec'):'Reported validated · evidence unknown'}</Link>{concern==='coverage'&&supportingSpecs.filter(s=>w.spec_expectation_ids[s.data.id]?.includes(e.data.id)).map(s=><Link key={s.data.id} className="ml-3 text-xs text-emerald-800" to={`/specs/${s.data.id}`}>{s.data.id} · {s.data.phase}</Link>)}{concern==='validation'&&<ul className="ml-3 text-xs text-stone-500">{w.evidence.filter(r=>r.expectation_ids.includes(e.data.id)).map(r=><li key={r.path}>{r.path} · {r.availability} · result unknown</li>)}</ul>}</li>)}{['delivery','review'].includes(concern)&&supportingSpecs.map(s=><li key={s.data.id}><Link to={`/specs/${s.data.id}`} className="text-sm text-emerald-800">{s.data.id} · {s.data.title} · {s.data.phase}</Link></li>)}{causes.map(c=><li key={c.key}><Link to={`/${c.entity.type}/${c.entity.id}`}>{c.entity.id} · {c.message}</Link></li>)}</ul></section>}
    {view==='overview'&&<div className="grid items-start gap-8 lg:grid-cols-[minmax(0,2.2fr)_minmax(240px,1fr)]"><section><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Active outcomes</h2><Button onClick={()=>setCreation({type:'intentions',parentId:p.id})}>New intention</Button></div><OutcomeList onCreate={parentId=>setCreation({type:'expectations',parentId})} workspace={w} expanded={expanded} onToggle={id=>setExpanded(prev=>{const next=new Set(prev);if(next.has(id))next.delete(id);else next.add(id);return next;})} onEdit={(id,parent)=>{setDismissed(null);setParams(prev=>{const next=new URLSearchParams(prev);next.set('outcome',parent);next.set('edit',id);return next;},{preventScrollReset:true});}}/></section><AttentionList workspace={w}/></div>}
    {view==='map'&&<section className="space-y-5"><label className="block text-sm font-medium">Filter product map<input className="mt-2 block w-full rounded-md border bg-white px-3 py-2" value={params.get('filter')??''} onChange={event=>{const next=new URLSearchParams(params);if(event.target.value)next.set('filter',event.target.value);else next.delete('filter');setParams(next,{replace:true,preventScrollReset:true});}} placeholder="Find an outcome, expectation, spec or ID"/></label><ProductTree workspace={w} filter={params.get('filter')??''} onEdit={ref=>{setDismissed(null);const next=new URLSearchParams(params);next.set('edit',ref.id);setParams(next,{preventScrollReset:true});}}/></section>}
    <p className="text-xs text-stone-500">Planning is independent of delivery. Coverage is independent of validation.</p>
    {creation&&(()=>{const latestParent=creation.type==='intentions'?w.product:w.intentions.find(i=>i.data.id===creation.parentId);if(latestParent)creationParent.current=latestParent;const parent=latestParent??(creationParent.current?.data.id===creation.parentId?creationParent.current:null);return parent?<CreationWizard key={`${creation.type}:${creation.parentId}`} type={creation.type} parent={parent} parentUnavailable={!latestParent} onClose={()=>setCreation(null)} onCreated={ref=>{const next=new URLSearchParams(params);next.set('outcome',creation.type==='intentions'?ref.id:creation.parentId);next.set('created',ref.id);setExpanded(prev=>new Set([...prev,creation.type==='intentions'?ref.id:creation.parentId]));setParams(next,{preventScrollReset:true});setCreation(null);void query.refetch();}}/>:null;})()}
    {edited&&selection!==dismissed&&<ArtifactEditor key={`${type}:${edited.data.id}`} ref={{type,id:edited.data.id}} record={type==='intentions'?{...edited,data:{...edited.data,dependencies:w.intention_dependency_ids[edited.data.id]??[]} as EditableArtifact}:edited} refreshError={query.isError?query.error.message:undefined} sourceUnavailable={!latestEdited||query.isError} onConflict={async()=>{await query.refetch();}} onClose={close} save={async(changes,revision)=>{
      const response=await apiFetchEnvelope<EditableArtifact>(`/${type}/${edited.data.id}`,{method:'PUT',headers:{'If-Match':revision},body:JSON.stringify(changes)});
      if(!response.meta?.source||!response.data)throw new Error('Source revision is missing; reload before editing.');
      const saved={data:response.data,source:response.meta.source as SourceMeta};
      qc.setQueryData<WorkspaceProjection>(workspaceKey(id),current=>current?{...current,...(type==='products'?{product:saved}:{[type]:(current[type] as typeof w.expectations).map(r=>r.data.id===saved.data.id?saved:r)})} as WorkspaceProjection:current);
      void qc.invalidateQueries();return saved;
    }}/>}
  </WorkspaceShell>;
}
