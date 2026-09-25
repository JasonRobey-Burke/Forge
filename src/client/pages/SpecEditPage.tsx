import { useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSpec, useUpdateSpec, useSpecExpectations } from '@/hooks/useSpecs';
import { useProduct } from '@/hooks/useProducts';
import { useArtifactDraft } from '@/hooks/useArtifactDraft';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { changedFields, ApiError } from '@/lib/api';
import SpecForm from '@/components/SpecForm';
import DraftGuard from '@/components/workspace/DraftGuard';
import DraftControls from '@/components/workspace/DraftControls';
import { updateSpecSchema } from '@shared/schemas/spec';
import type { Spec, CreateSpecInput, UpdateSpecInput } from '@shared/types';
import type { Sourced } from '@shared/types/source';
export default function SpecEditPage(){
  const {id=''}=useParams(),query=useSpec(id),retained=useRef(query.data);if(retained.current?.id!==id)retained.current=undefined;if(query.data)retained.current=query.data;
  useDocumentTitle('Edit Spec');
  if(!retained.current)return <p role={query.isError?'alert':'status'}>{query.error?.message??'Loading spec…'}</p>;
  return <SpecDocumentEditor key={id} spec={retained.current} unavailable={query.isError||!query.data} refetch={query.refetch}/>;
}
function SpecDocumentEditor({spec,unavailable,refetch}:{spec:Sourced<Spec>;unavailable:boolean;refetch:()=>Promise<unknown>}) {
  const navigate=useNavigate(),update=useUpdateSpec(),linked=useSpecExpectations(spec.id),product=useProduct(spec.product_id);
  const {source,...data}=spec;const record={data,source};const controller=useArtifactDraft({type:'specs',id:spec.id},record),{draft}=controller;
  const [resetVersion,setReset]=useState(0),[confirm,setConfirm]=useState(false),[error,setError]=useState(''),[conflict,setConflict]=useState(false);
  const action=useRef<null|(()=>void)>(null),leave=useRef(false),busy=useRef(false);
  function request(work:()=>void){if(busy.current)return;if(draft.dirty){action.current=work;setConfirm(true);}else work();}
  function change(values:CreateSpecInput){const patch=changedFields(draft.baseline,values);delete patch.product_id;delete patch.phase;for(const field of Object.keys(patch))if(source.read_only_fields[field]||source.read_only_fields['*'])delete (patch as Record<string,unknown>)[field];controller.change({...draft.baseline,...patch,context:{...draft.baseline.context,...patch.context}});}
  async function submit(){if(busy.current||draft.external_revision||conflict||unavailable)return;const patch=changedFields(draft.baseline,draft.values);const parsed=updateSpecSchema.safeParse(patch);if(!parsed.success){setError(parsed.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; '));return;}busy.current=true;controller.setSaving(true);setError('');try{const saved=await update.mutateAsync({id:spec.id,product_id:spec.product_id,revision:draft.source.revision,...parsed.data as UpdateSpecInput});const {source,...data}=saved;controller.saved({data,source});leave.current=true;navigate(`/specs/${spec.id}`);}catch(e){setError(e instanceof Error?e.message:'Save failed; your draft is retained.');if(e instanceof ApiError&&/CONFLICT|STALE|REVISION|REQUEST_TIMEOUT/.test(e.code)){setConflict(true);void refetch();}}finally{busy.current=false;controller.setSaving(false);}}
  return <div className="space-y-5"><h1 className="text-2xl font-semibold">Edit {spec.title}</h1><DraftControls controller={controller} record={record} conflict={conflict} unavailable={unavailable} request={request} onReload={()=>{controller.reload(record);setConflict(false);setReset(v=>v+1);}} onRestore={()=>setReset(v=>v+1)}/>{error&&<p role="alert" className="text-red-700">{error}</p>}{Object.keys(source.read_only_fields).length>0&&<p className="text-sm text-amber-800">Some fields require advanced source editing. <Link to={`/specs/${spec.id}?yaml=1`}>Review source</Link></p>}
    <SpecForm pending={update.isPending} productId={spec.product_id} productContext={product.data?.context} defaultValues={draft.values} defaultSpec={draft.values} source={draft.source} resetVersion={resetVersion} onDraftChange={change} checklistExpectations={linked.data??[]} linkedExpectations={linked.data??[]} onSubmit={()=>void submit()} isSubmitting={update.isPending||!!draft.external_revision||conflict||unavailable} submitLabel="Save spec" cancelHref={`/specs/${spec.id}`}/>
    <DraftGuard saving={update.isPending} dirty={draft.dirty} canLeave={()=>leave.current} onDiscard={controller.discard} pending={confirm} onCancel={()=>{setConfirm(false);action.current=null;}} onProceed={()=>{setConfirm(false);action.current?.();action.current=null;}}/>
  </div>;
}
