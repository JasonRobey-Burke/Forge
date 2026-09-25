import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { transferDraft, transferredDraft, clearTransfer } from '@/lib/artifactDraft';
import { useEffect, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import * as Dialog from '@radix-ui/react-dialog';
import type { ArtifactRef, Versioned } from '@shared/types/source';
import type { Product, Intention, Expectation } from '@shared/types';
import { updateExpectationSchema } from '@shared/schemas/expectation';
import { updateIntentionSchema } from '@shared/schemas/intention';
import { updateProductSchema } from '@shared/schemas/product';
import { changedFields, ApiError } from '@/lib/api';
import { useArtifactDraft } from '@/hooks/useArtifactDraft';
import { Button } from '@/components/ui/button';
import ArtifactFields, {fieldNames} from './ArtifactFields';
import DraftGuard from './DraftGuard';
export type EditableArtifact=Product|(Intention&{dependencies?:string[]})|Expectation;
export interface ArtifactEditorProps {refreshError?:string;presentation?:"dialog"|"page";sourceUnavailable?:boolean;onConflict?:()=>Promise<void>;ref:ArtifactRef;record:Versioned<EditableArtifact>;onClose:()=>void;save:(changes:Record<string,unknown>,revision:string)=>Promise<Versioned<EditableArtifact>>;}
export default function ArtifactEditor({ref:artifactRef,record,onClose,save,sourceUnavailable=false,onConflict,refreshError,presentation="dialog"}:ArtifactEditorProps) {
  const navigate=useNavigate();const [params]=useSearchParams();
  const [handoff,setHandoff]=useState(false);
  const initial=useRef(transferredDraft(params.get('draft'),artifactRef,record.source,record.data));
  const controller=useArtifactDraft(artifactRef,record,initial.current);
  useEffect(()=>()=>clearTransfer(params.get('draft')),[]);
  const {draft}=controller;
  const form=useForm<Record<string,unknown>>({defaultValues:(initial.current?.values??record.data) as unknown as Record<string,unknown>});
  const [conflict,setConflict]=useState(false);
  const [pending,setPending]=useState(false),[error,setError]=useState(''),[compare,setCompare]=useState(false),[copyFallback,setCopyFallback]=useState(false);
  const action=useRef<null|(()=>void)>(null);
  const [confirm,setConfirm]=useState(false);
  const busy=useRef(false),leave=useRef(false);
  const baselineRef=useRef(draft.baseline);baselineRef.current=draft.baseline;
  const opener=useRef<HTMLElement|null>(document.activeElement as HTMLElement);
  const handoffOpener=useRef<HTMLElement|null>(null);
  useEffect(()=>{
    const subscription=form.watch(values=>{
      const baseline=baselineRef.current;
      controller.change({...baseline,...values} as EditableArtifact);
    });
    return()=>subscription.unsubscribe();
  },[form.watch]);
  function reset(next:Versioned<EditableArtifact>){setConflict(false);controller.reload(next);form.reset(next.data as unknown as Record<string,unknown>);}
  function request(work:()=>void){if(busy.current)return;if(draft.dirty){action.current=work;setConfirm(true);}else work();}
  function close(){leave.current=true;onClose();}
  const noun=artifactRef.type.slice(0,-1);
  async function submit(){
    if(busy.current || draft.external_revision||conflict||sourceUnavailable)return;
    const values=form.getValues();
    const changed=changedFields(draft.baseline,values);
    const changes=Object.fromEntries(fieldNames[artifactRef.type].filter(key=>!draft.source.read_only_fields[key]&&!draft.source.read_only_fields['*']&&Object.hasOwn(changed,key)).map(key=>[key,changed[key as keyof typeof changed]]));
    if(changes.context&&typeof changes.context==='object'){for(const leaf of Object.keys(changes.context)){if(draft.source.read_only_fields[`context.${leaf}`])delete (changes.context as Record<string,unknown>)[leaf];}if(!Object.keys(changes.context).length)delete changes.context;}
    const schema=artifactRef.type==='products'?updateProductSchema:artifactRef.type==='intentions'?updateIntentionSchema:updateExpectationSchema;
    form.clearErrors();
    if(artifactRef.type==='expectations'&&String(values.status).toLowerCase()==='deferred'&&!String(values.deferred_reason??'').trim()){form.setError('deferred_reason',{message:'A reason is required before saving Deferred.'});return;}
    const parsed=schema.safeParse(changes);
    if(!parsed.success){parsed.error.issues.forEach(issue=>form.setError(String(issue.path[0]),{message:issue.message}));return;}
    busy.current=true;controller.setSaving(true);setPending(true);setError('');
    try{const result=await save(parsed.data,draft.source.revision);controller.saved(result);toast.success(`${noun.charAt(0).toUpperCase()+noun.slice(1)} saved`);form.reset(result.data as unknown as Record<string,unknown>);close();}
    catch(err){if(err instanceof ApiError&&/CONFLICT|STALE|REVISION|REQUEST_TIMEOUT/.test(err.code??'')){setConflict(true);void onConflict?.();}setError(err instanceof Error?err.message:'Save failed. Your draft is retained.');}
    finally{busy.current=false;controller.setSaving(false);setPending(false);}
  }
  const content=<>
      <header className="shrink-0 border-b px-6 py-5"><div className="flex justify-between text-xs text-stone-500"><span>{artifactRef.id} / {noun}</span><Button type="button" size="sm" variant="ghost" disabled={pending} aria-label={`Close ${noun} editor`} onClick={()=>request(close)}>✕</Button></div><>{presentation==='dialog'?<><Dialog.Title className="text-xl font-semibold">Edit {noun}</Dialog.Title><Dialog.Description className="mt-1 text-xs text-stone-500">{draft.source.path}</Dialog.Description></>:<><h2 id="artifact-editor-title" className="text-xl font-semibold">Edit {noun}</h2><p id="artifact-editor-description" className="mt-1 text-xs text-stone-500">{draft.source.path}</p></>}</></header>
      <FormProvider {...form}><form className="flex min-h-0 flex-1 flex-col" onSubmit={e=>{e.preventDefault();void submit();}}>
        <div className="min-h-0 flex-1 overflow-y-auto p-6"><fieldset disabled={pending} className="min-w-0 space-y-4">
          {refreshError&&<div role="alert" className="rounded border border-amber-200 bg-amber-50 p-3 text-sm">Refresh failed. Displayed workspace data may be stale. {refreshError} <Button type="button" variant="outline" onClick={()=>void onConflict?.()}>Retry</Button></div>}
          {draft.recovery_unavailable&&<p role="status" className="rounded border border-amber-200 bg-amber-50 p-3 text-sm">Session recovery is unavailable. Your draft remains protected while this editor is open.</p>}
          {controller.recovery&&<div className="rounded border p-3 text-sm"><p>A saved draft is available. Review before restoring.</p><Button type="button" variant="outline" onClick={()=>{const recovered=controller.recovery!;controller.restore(recovered);form.reset(recovered.values as unknown as Record<string,unknown>);}}>Restore draft</Button><Button type="button" variant="ghost" onClick={()=>{controller.discard();form.reset(record.data as unknown as Record<string,unknown>);}}>Discard recovered draft</Button></div>}
          {(draft.external_revision||conflict||sourceUnavailable)&&<div role="status" className="space-y-2 rounded border border-amber-200 bg-amber-50 p-3 text-sm"><strong>File changed outside Forge</strong>{sourceUnavailable&&<p>The source is unavailable or invalid. Your draft is retained; review the source file before continuing. <Button type="button" variant="outline" size="sm" onClick={()=>{void onConflict?.();}}>Check source again</Button></p>}<p>Your draft is protected. Compare it with the current source before continuing.</p><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={()=>setCompare(!compare)}>Compare</Button><Button type="button" variant="outline" size="sm" onClick={async()=>{try{await navigator.clipboard.writeText(JSON.stringify(form.getValues(),null,2));}catch{setCopyFallback(true);}}}>Copy draft</Button><Button type="button" variant="outline" size="sm" disabled={sourceUnavailable} onClick={()=>request(()=>reset(record))}>Reload source</Button></div></div>}
          {compare&&<section className="space-y-2 text-sm"><h3 className="font-semibold">{sourceUnavailable?'Last loaded source':'Current source'}</h3><pre className="whitespace-pre-wrap break-words rounded bg-stone-100 p-3">{JSON.stringify(record.data,null,2)}</pre><h3 className="font-semibold">Your draft</h3><pre className="whitespace-pre-wrap break-words rounded bg-stone-100 p-3">{JSON.stringify(form.getValues(),null,2)}</pre></section>}
          {copyFallback&&<label className="block text-sm">Select and copy your draft<textarea readOnly className="w-full border p-2" value={JSON.stringify(form.getValues(),null,2)}/></label>}
          {presentation==='dialog'&&<Button type="button" variant="outline" onClick={event=>{if(!busy.current){handoffOpener.current=event.currentTarget;setHandoff(true);}}}>Open document</Button>}
          <a className="block text-sm text-emerald-800 underline" href={`/${artifactRef.type}/${artifactRef.id}${artifactRef.type==='products'?'/edit':''}?yaml=1`} onClick={e=>{e.preventDefault();request(()=>{leave.current=true;navigate(`/${artifactRef.type}/${artifactRef.id}${artifactRef.type==='products'?'/edit':''}?yaml=1`);});}}>Advanced source</a>
          <ArtifactFields type={artifactRef.type} source={draft.source}/>
          {'intention_id' in record.data&&<p className="text-sm text-stone-500">Parent intention: {record.data.intention_id}. Relationships are managed from the document.</p>}
          {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
        </fieldset></div><footer className="sticky bottom-0 flex shrink-0 justify-between border-t bg-white px-6 py-4"><Button type="button" variant="outline" disabled={pending} onClick={()=>request(close)}>Cancel</Button><Button type="submit" className="bg-emerald-800 hover:bg-emerald-900" disabled={pending||!!draft.external_revision||conflict||sourceUnavailable}>{pending?'Saving…':`Save ${noun}`}</Button></footer>
      </form></FormProvider>
    </>;
  return <>
    {presentation==='dialog'?<Dialog.Root open onOpenChange={open=>{if(!open)request(close);}}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-40 bg-stone-900/25"/><Dialog.Content onCloseAutoFocus={event=>{event.preventDefault();opener.current?.focus();}} className="fixed inset-y-0 right-0 z-50 flex h-[100dvh] w-full max-w-[510px] flex-col border-l bg-white shadow-2xl">{content}</Dialog.Content></Dialog.Portal></Dialog.Root>:<section className="flex min-h-0 flex-col rounded-lg border bg-white">{content}</section>}
    <Dialog.Root open={handoff} onOpenChange={setHandoff}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-[60] bg-stone-900/25"/><Dialog.Content onCloseAutoFocus={event=>{if(!leave.current&&handoffOpener.current?.isConnected){event.preventDefault();handoffOpener.current.focus();}}} className="fixed left-1/2 top-1/2 z-[70] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-white p-6"><Dialog.Title className="font-semibold">Continue in the full document?</Dialog.Title><Dialog.Description className="my-4 text-sm">Your current values and original source revision will move with you.</Dialog.Description><div className="flex gap-3"><Button disabled={pending} onClick={()=>{if(busy.current)return;const token=transferDraft(draft);leave.current=true;navigate(`/${artifactRef.type}/${artifactRef.id}${artifactRef.type==='products'?'/edit':''}?edit=1&draft=${token}`);}}>Continue editing</Button><Button variant="outline" onClick={()=>setHandoff(false)}>Keep here</Button></div></Dialog.Content></Dialog.Portal></Dialog.Root>

    <DraftGuard saving={pending} dirty={draft.dirty} canLeave={()=>leave.current} onDiscard={()=>{controller.discard();}} pending={confirm} onCancel={()=>{setConfirm(false);action.current=null;}} onProceed={()=>{setConfirm(false);action.current?.();action.current=null;}}/>
  </>;
}
