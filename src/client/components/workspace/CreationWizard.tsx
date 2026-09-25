import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { useArtifactDraft } from '@/hooks/useArtifactDraft';
import { apiFetch, apiFetchSourced } from '@/lib/api';
import type { Expectation } from '@shared/types';
import { useCreateArtifact } from '@/hooks/useCreateArtifact';
import { createIntentionDraftSchema, createExpectationDraftSchema } from '@shared/schemas/creation';
import type { ArtifactRef, Versioned } from '@shared/types/source';
import type { Product, Intention } from '@shared/types';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import DraftGuard from './DraftGuard';
interface Values { statement:string; rationale:string; description:string; validation_criteria:string; edge_cases:string[]; owner:string; priority:'critical'|'high'|'medium'|'low'; complexity:'low'|'medium'|'high'; confirmed_edge_cases:boolean }
const blank:Values={statement:'',rationale:'',description:'',validation_criteria:'',edge_cases:['',''],owner:'',priority:'medium',complexity:'medium',confirmed_edge_cases:false};
export default function CreationWizard({type,parent,onCreated,onClose,parentUnavailable=false}:{parentUnavailable?:boolean;type:'intentions'|'expectations';parent:Versioned<Product|Intention>;onCreated:(ref:ArtifactRef)=>void;onClose:()=>void}) {
  const controller=useArtifactDraft({type,id:`new-under-${parent.data.id}`},{source:parent.source,data:blank});
  const {draft}=controller, values=draft.values;
  const form=useForm<Values>({defaultValues:values});
  const mutation=useCreateArtifact(type),qc=useQueryClient();
  const [step,setStep]=useState(0),[pending,setPending]=useState(false),[error,setError]=useState(''),[conflict,setConflict]=useState(false),[closing,setClosing]=useState(false),[uncertain,setUncertain]=useState(false);
  const busy=useRef(false),leaving=useRef(false),[reviewedParent,setReviewedParent]=useState(parent);
  const isIntention=type==='intentions';
  const [sourceReview,setSourceReview]=useState<{parent:Versioned<Product|Intention>;children:(Intention|Expectation)[]}|null>(null);
  const [checking,setChecking]=useState(false);
  async function checkCurrentSource(){
    if(checking||pending)return;setChecking(true);setSourceReview(null);
    try {
      const fresh=await apiFetchSourced<Product|Intention>(`/${isIntention?'products':'intentions'}/${parent.data.id}`);
      const children=await apiFetch<(Intention|Expectation)[]>(`/${type}?${isIntention?'product_id':'intention_id'}=${encodeURIComponent(parent.data.id)}`);
      const {source,...data}=fresh;setSourceReview({parent:{source,data:data as Product|Intention},children});
    }catch(error){setError(error instanceof Error?error.message:'Could not review current source.');}
    finally{setChecking(false);}
  }
  function acceptParent(next:Versioned<Product|Intention>){const retained=values;controller.saved({source:next.source,data:blank});controller.change(retained);setReviewedParent(next);setConflict(false);setUncertain(false);setSourceReview(null);setError('');setStep(1);}

  function change(key:keyof Values,value:unknown) {if(busy.current)return;const next={...values,[key]:value};if(key==='edge_cases')next.confirmed_edge_cases=false;controller.change(next);form.reset(next);}
  function field(key:'statement'|'rationale'|'description'|'validation_criteria'|'owner',label:string) {return <label className="block space-y-2 text-sm font-medium">{label}<textarea {...form.register(key)} aria-label={label} aria-invalid={!!error} aria-describedby={error?'creation-error':undefined} className="block min-h-20 w-full rounded border bg-white p-3 font-normal" value={values[key]} onChange={event=>change(key,event.target.value)}/></label>;}
  function review() {
    const input=isIntention?{product_id:parent.data.id,statement:values.statement,rationale:values.rationale,priority:values.priority,owner:values.owner,confirmed:true}:{intention_id:parent.data.id,description:values.description,validation_criteria:values.validation_criteria,edge_cases:values.edge_cases,complexity:values.complexity,owner:values.owner,confirmed_edge_cases:values.confirmed_edge_cases,confirmed:true};
    return (isIntention?createIntentionDraftSchema:createExpectationDraftSchema).safeParse(input);
  }
  function toReview(){const result=review();if(!result.success){setError(result.error.issues.map(issue=>`${({statement:'Purpose',rationale:'Rationale',description:'Measurable outcome',validation_criteria:'Validation criteria',edge_cases:'Edge cases',owner:'Owner',priority:'Priority',complexity:'Complexity',confirmed_edge_cases:'Edge case confirmation'} as Record<string,string>)[String(issue.path[0])]??'Draft'}: ${issue.message}`).join('; '));return;}setError('');setStep(2);}
  async function create() {
    if(busy.current||conflict||uncertain||draft.external_revision||parentUnavailable)return;
    const result=review();if(!result.success)return;
    busy.current=true;controller.setSaving(true);setPending(true);setError('');
    try {const child=await mutation.mutateAsync({input:result.data,parentRevision:draft.source.revision});controller.saved({source:parent.source,data:blank});leaving.current=true;onCreated({type,id:child.id});}
    catch(error) {setError(error instanceof Error?error.message:'Creation failed; your draft is retained');if((error as {code?:string}).code==='REQUEST_TIMEOUT'){setUncertain(true);void qc.invalidateQueries();}if((error as {code?:string}).code==='REVISION_CONFLICT'){setConflict(true);void qc.invalidateQueries();}}
    finally {busy.current=false;controller.setSaving(false);setPending(false);}
  }
  const close=()=>{if(pending)return;if(draft.dirty)setClosing(true);else onClose();};
  return <><Dialog open onOpenChange={open=>{if(!open)close();}}><DialogContent className="flex max-h-[95dvh] w-[calc(100%-1rem)] max-w-2xl flex-col overflow-hidden p-0" onEscapeKeyDown={event=>{event.preventDefault();close();}} onInteractOutside={event=>event.preventDefault()}>
    <header className="border-b p-5 pr-10"><DialogTitle>New {isIntention?'intention':'expectation'}</DialogTitle><DialogDescription className="mt-2">{isIntention?'Purpose → Details → Review':'Outcome → Edge cases → Review'} · User-authored Draft</DialogDescription></header>
    <div className="min-h-0 overflow-y-auto p-5"><fieldset disabled={pending} className="min-w-0 space-y-5"><section className="rounded bg-stone-50 p-3 text-sm"><p className="font-medium">Selected parent: {reviewedParent.data.id} · {'name' in reviewedParent.data?reviewedParent.data.name:reviewedParent.data.title}</p><MarkdownRenderer content={'problem_statement' in reviewedParent.data?reviewedParent.data.problem_statement:reviewedParent.data.description} variant="inline"/><p>Owner: {reviewedParent.data.owner||'Unassigned'}</p></section>
      {parentUnavailable&&<p role="alert">The selected parent is unavailable. Your draft is retained until its source is restored.</p>}{draft.recovery_unavailable&&<p role="status">Session recovery is unavailable. Your draft remains protected in this editor.</p>}
      {controller.recovery&&<section><p>A saved creation draft is available. Restore it explicitly to review.</p><Button variant="outline" onClick={()=>{const recovered=controller.recovery!;controller.restore(recovered);form.reset(recovered.values);setStep(0);}}>Restore draft</Button><Button variant="ghost" onClick={()=>{controller.discard();form.reset(blank);}}>Discard recovered draft</Button></section>}
      {(draft.external_revision||conflict||uncertain)&&<section className="space-y-2 rounded border border-amber-200 bg-amber-50 p-3"><p>Review the current parent before reviewing your preserved draft again.</p>{uncertain?<><p>The creation outcome is uncertain. Check current source and its child records for an already-created draft before deciding to retry.</p><Button variant="outline" disabled={pending||checking} onClick={()=>void checkCurrentSource()}>{checking?'Checking source…':'Check current source'}</Button>{sourceReview&&<><h3 className="font-semibold">Current parent source</h3><pre className="whitespace-pre-wrap break-words text-xs">{JSON.stringify(sourceReview.parent.data,null,2)}</pre><h3 className="font-semibold">Current child records</h3>{sourceReview.children.length?<ul>{sourceReview.children.map(child=><li key={child.id}>{child.id} · {child.title} · {child.description}</li>)}</ul>:<p>No child records found.</p>}<Button variant="outline" disabled={pending||checking} onClick={()=>acceptParent(sourceReview.parent)}>I reviewed current source; review draft again</Button></>}</>:<Button variant="outline" disabled={pending||parentUnavailable||parent.source.revision===draft.source.revision} onClick={()=>acceptParent(parent)}>Review updated parent</Button>}</section>}

      {step===0&&(isIntention?<>{field('statement','Purpose')}</>:<>{field('description','Measurable outcome')}{field('validation_criteria','Validation criteria')}</>)}
      {step===1&&<>{isIntention?field('rationale','Rationale'):<>{values.edge_cases.map((edge,index)=><label key={index} className="block space-y-2 text-sm font-medium">Edge case {index+1}<textarea aria-label={`Edge case ${index+1}`} aria-invalid={!!error} aria-describedby={error?'creation-error':undefined} className="block min-h-20 w-full rounded border p-3 font-normal" value={edge} onChange={event=>change('edge_cases',values.edge_cases.map((value,i)=>i===index?event.target.value:value))}/></label>)}<Button variant="outline" onClick={()=>change('edge_cases',[...values.edge_cases,''])}>Add edge case</Button><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={values.confirmed_edge_cases} onChange={event=>change('confirmed_edge_cases',event.target.checked)}/>I confirm these edge cases</label></>}{field('owner','Owner')}<label className="block space-y-2 text-sm font-medium">{isIntention?'Priority':'Complexity'}<select aria-label={isIntention?'Priority':'Complexity'} className="block w-full rounded border bg-white p-3" value={isIntention?values.priority:values.complexity} onChange={event=>change(isIntention?'priority':'complexity',event.target.value)}>{(isIntention?['critical','high','medium','low']:['low','medium','high']).map(value=><option key={value} value={value}>{value[0].toUpperCase()+value.slice(1)}</option>)}</select></label></>}
      {step===2&&<section className="space-y-4"><h3 className="font-semibold">Review exact draft content</h3><p>Status: Draft</p><MarkdownRenderer content={isIntention?values.statement.trim():values.description.trim()}/><h4 className="font-medium">{isIntention?'Rationale':'Validation criteria'}</h4><MarkdownRenderer content={(isIntention?values.rationale:values.validation_criteria).trim()}/>{!isIntention&&<><h4 className="font-medium">Confirmed edge cases</h4><ul>{values.edge_cases.map((edge,index)=><li key={index}><MarkdownRenderer content={edge.trim()} variant="inline"/></li>)}</ul></>}<p>Owner: {values.owner.trim()}</p><p>{isIntention?'Priority':'Complexity'}: {(isIntention?values.priority:values.complexity).replace(/^./,value=>value.toUpperCase())}</p><p className="text-sm text-stone-500">Create confirms this content as a Draft. It records no validation result.</p></section>}
      {error&&<p id="creation-error" role="alert" className="break-words text-sm text-red-700">{error}</p>}
    </fieldset></div><footer className="flex shrink-0 flex-wrap justify-between gap-2 border-t bg-white p-4"><Button variant="ghost" disabled={pending} onClick={close}>Cancel</Button><div className="flex gap-2">{step>0&&<Button variant="outline" disabled={pending} onClick={()=>setStep(step-1)}>Back</Button>}{step===0?<Button onClick={()=>setStep(1)}>Next</Button>:step===1?<Button onClick={toReview}>Review draft</Button>:<Button disabled={pending||conflict||uncertain||!!draft.external_revision||parentUnavailable} onClick={create}>{pending?'Creating…':'Create draft'}</Button>}</div></footer>
  </DialogContent></Dialog><DraftGuard saving={pending} dirty={draft.dirty} pending={closing} onDiscard={()=>{controller.discard();leaving.current=true;}} onCancel={()=>setClosing(false)} onProceed={onClose} canLeave={()=>leaving.current}/></>;
}
