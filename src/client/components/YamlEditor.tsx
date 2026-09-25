import { useRef, useState } from 'react';
import { useRawYaml, useSaveRawYaml } from '@/hooks/useRawYaml';
import { useArtifactDraft } from '@/hooks/useArtifactDraft';
import type { ArtifactType, Sourced } from '@shared/types/source';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import DraftGuard from '@/components/workspace/DraftGuard';
import DraftControls from '@/components/workspace/DraftControls';
type Raw = {id:string;type:string;content:string};
interface Props {type:string;id:string;onClose:()=>void}
export default function YamlEditor(props:Props) {
  const query=useRawYaml(props.type,props.id),retained=useRef(query.data);if(query.data)retained.current=query.data;
  if(!retained.current)return <p role={query.isError?'alert':'status'}>{query.error?.message??'Loading YAML…'}</p>;
  return <SourceEditor key={`${props.type}:${props.id}`} {...props} record={retained.current} unavailable={query.isError||!query.data} refetch={query.refetch}/>;
}
function SourceEditor({type,id,onClose,record,unavailable,refetch}:Props&{record:Sourced<Raw>;unavailable:boolean;refetch:()=>Promise<unknown>}) {
  const controller=useArtifactDraft({type:type as ArtifactType,id:`${id}:yaml`},{data:{id,type,content:record.content},source:record.source});const {draft}=controller;
  const save=useSaveRawYaml(),busy=useRef(false),leave=useRef(false),action=useRef<null|(()=>void)>(null);
  const [confirm,setConfirm]=useState(false),[error,setError]=useState(''),[conflict,setConflict]=useState(false);
  function request(work:()=>void){if(busy.current)return;if(draft.dirty){action.current=work;setConfirm(true);}else work();}
  function close(){leave.current=true;onClose();}
  const current={data:{id,type,content:record.content},source:record.source};
  async function submit(){if(busy.current||draft.external_revision||conflict||unavailable)return;busy.current=true;controller.setSaving(true);setError('');try{const result=await save.mutateAsync({type,id,content:draft.values.content,revision:draft.source.revision});controller.saved({data:draft.values,source:result.source});close();}catch(e){setError(e instanceof Error?`YAML source save did not complete. ${e.message}`:'Invalid YAML source; your draft is retained.');if(e instanceof ApiError&&/CONFLICT|STALE|REVISION|REQUEST_TIMEOUT/.test(e.code)){setConflict(true);void refetch();}}finally{busy.current=false;controller.setSaving(false);}}
  return <section className="space-y-4 rounded border bg-white p-5"><h2 className="font-semibold">Advanced · Edit YAML</h2><p className="text-sm text-stone-600">Source edits preserve identity and parent links. Use transition actions for phase changes; audit history and gate annotations cannot be edited here.</p><DraftControls controller={controller} record={current} conflict={conflict} unavailable={unavailable} request={request} onReload={()=>{controller.reload(current);setConflict(false);setError('');}} onRestore={()=>{}}/>
    <label className="block text-sm font-semibold">YAML source<textarea className="mt-2 min-h-[400px] w-full rounded border p-3 font-mono text-sm" disabled={save.isPending} spellCheck={false} value={draft.values.content} onChange={e=>controller.change({...draft.values,content:e.target.value})}/></label>{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
    <footer className="sticky bottom-0 flex justify-between border-t bg-white py-4"><Button variant="outline" disabled={save.isPending} onClick={()=>request(close)}>Cancel</Button><Button onClick={()=>void submit()} disabled={save.isPending||!!draft.external_revision||conflict||unavailable}>{save.isPending?'Saving…':'Save YAML'}</Button></footer>
    <DraftGuard saving={save.isPending} dirty={draft.dirty} canLeave={()=>leave.current} onDiscard={controller.discard} pending={confirm} onCancel={()=>{setConfirm(false);action.current=null;}} onProceed={()=>{setConfirm(false);action.current?.();action.current=null;}}/>
  </section>;
}
