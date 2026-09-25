import { useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ArtifactRef, Sourced } from '@shared/types/source';
import ArtifactEditor, {type EditableArtifact} from '@/components/workspace/ArtifactEditor';
import YamlEditor from '@/components/YamlEditor';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import AdditionalFields from '@/components/AdditionalFields';
import { Button } from '@/components/ui/button';
import { apiFetchSourced } from '@/lib/api';
export default function ArtifactDocumentPage({type,record,loading,error,refetch,children,settings=false}:{type:ArtifactRef['type'];record?:Sourced<EditableArtifact>;loading:boolean;error:Error|null;refetch:()=>Promise<unknown>;children?:ReactNode;settings?:boolean}) {
  const qc=useQueryClient(),[params,setParams]=useSearchParams();const [editing,setEditing]=useState(settings||params.has('edit')||params.has('draft'));
  const retained=useRef(record);if(record)retained.current=record;
  const data=record??retained.current;
  if(!data)return <p role={error?'alert':'status'}>{loading?'Loading document…':error?.message??'Document not found.'}</p>;
  const {source,...entity}=data;
  const title='name' in entity?entity.name:entity.title;
  const yaml=params.has('yaml');
  function close(){setEditing(false);setParams({}, {replace:true});}
  return <div className="mx-auto max-w-4xl space-y-5"><header className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-stone-500">{entity.id}</p><h1 className="mt-2 text-2xl font-semibold">{settings?'Product settings':title}</h1><p className="mt-2 text-sm text-stone-500">{'owner' in entity&&entity.owner?`${entity.owner} · `:''}{entity.status}</p></div>{!editing&&!yaml&&<div className="flex gap-2"><Button variant="outline" onClick={()=>setEditing(true)}>Edit</Button><Button variant="ghost" onClick={()=>setParams({yaml:'1'})}>Edit YAML</Button></div>}</header>
    {yaml?<YamlEditor type={type} id={entity.id} onClose={close}/>:editing?<ArtifactEditor key={`${type}:${entity.id}`} presentation="page" ref={{type,id:entity.id}} record={{data:entity as EditableArtifact,source}} sourceUnavailable={!record||!!error} onConflict={async()=>{await refetch();}} onClose={close} save={async(changes,revision)=>{const saved=await apiFetchSourced<EditableArtifact>(`/${type}/${entity.id}`,{method:'PUT',headers:{'If-Match':revision},body:JSON.stringify(changes)});await qc.invalidateQueries();const {source,...data}=saved;return {data:data as EditableArtifact,source};}}/>:<><section className="rounded border bg-white p-6"><MarkdownRenderer content={'description' in entity?entity.description:entity.problem_statement}/>{'rationale' in entity&&entity.rationale&&<div className="mt-5"><h2 className="font-semibold">Rationale</h2><MarkdownRenderer content={entity.rationale}/></div>}{'validation_criteria' in entity&&entity.validation_criteria&&<div className="mt-5"><h2 className="font-semibold">Validation criteria</h2><MarkdownRenderer content={entity.validation_criteria}/></div>}{'edge_cases' in entity&&<div className="mt-5"><h2 className="font-semibold">Edge cases</h2><ul className="list-inside list-disc">{entity.edge_cases.map((value,n)=><li key={n}>{value}</li>)}</ul></div>}{'intention_id' in entity&&<Link className="mt-4 block text-sm text-emerald-800" to={`/intentions/${entity.intention_id}`}>Parent intention · {entity.intention_id}</Link>}<p className="mt-5 text-xs text-stone-600">Reported status does not establish supporting validation evidence.</p></section><AdditionalFields extras={entity.extras}/>{children}</>}
  </div>;
}
