import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useExpectation } from '@/hooks/useExpectations';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useIntention } from '@/hooks/useIntentions';
import { apiFetchSourced } from '@/lib/api';
import type { Expectation } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import ArtifactDocumentPage from './ArtifactDocumentPage';
export default function ExpectationDetailPage(){
  const {id=''}=useParams(),query=useExpectation(id),parent=useIntention(query.data?.intention_id??''),workspace=useWorkspace(parent.data?.product_id??'');
  const qc=useQueryClient();
  const [open,setOpen]=useState(false),[destination,setDestination]=useState(''),[error,setError]=useState(''),[pending,setPending]=useState(false);
  const [review,setReview]=useState<{childRevision:string;oldRevision:string;newRevision:string;oldId:string;newId:string;description:string;oldDescription:string;newDescription:string}|null>(null);
  useDocumentTitle(query.data?.title??'Expectation');
  function prepare(){
    const child=query.data,old=workspace.data?.intentions.find(i=>i.data.id===child?.intention_id),next=workspace.data?.intentions.find(i=>i.data.id===destination);
    if(!child||!old||!next||old.data.product_id!==next.data.product_id){setError('Choose an available intention in the same product');return;}
    setReview({childRevision:child.source.revision,oldRevision:old.source.revision,newRevision:next.source.revision,oldId:old.data.id,newId:next.data.id,description:child.description,oldDescription:old.data.description,newDescription:next.data.description});setError('');
  }
  async function move(){
    if(!review||pending)return;setPending(true);setError('');
    try{await apiFetchSourced<Expectation>(`/expectations/${id}/reparent`,{method:'POST',headers:{'If-Match':review.childRevision},body:JSON.stringify({intention_id:review.newId,old_parent_revision:review.oldRevision,new_parent_revision:review.newRevision})});setOpen(false);setReview(null);setDestination('');void qc.invalidateQueries();}
    catch(error){setError(error instanceof Error?error.message:'Parent change failed');setReview(null);void qc.invalidateQueries();}
    finally{setPending(false);}
  }
  return <><ArtifactDocumentPage key={id} type="expectations" record={query.data} loading={query.isLoading} error={query.error} refetch={query.refetch}/>{query.data&&<section className="mx-auto mb-8 max-w-5xl rounded border bg-white p-5"><h2 className="font-semibold">Parent relationship</h2><p className="my-2 text-sm">{query.data.intention_id} · Move this expectation only within its current product. Content and status are retained.</p><Button variant="outline" disabled={!workspace.data} onClick={()=>{setOpen(true);setError('');setReview(null);}}>Change parent intention</Button></section>}
    <Dialog open={open} onOpenChange={value=>{if(!pending)setOpen(value);}}><DialogContent className="max-h-[90dvh] w-[calc(100%-1rem)] overflow-y-auto"><DialogTitle>Change parent intention</DialogTitle><DialogDescription>Review the expectation and both parent links before confirming.</DialogDescription>{review?<section className="space-y-3"><h3 className="font-medium">Review affected links</h3><MarkdownRenderer content={review.description}/><p>Remove {id} from {review.oldId}</p><MarkdownRenderer content={review.oldDescription} variant="inline"/><p>Add {id} to {review.newId}</p><MarkdownRenderer content={review.newDescription} variant="inline"/><p className="text-sm">The expectation keeps its ID, content and status.</p><div className="flex gap-2"><Button variant="outline" disabled={pending} onClick={()=>setReview(null)}>Back</Button><Button disabled={pending} onClick={move}>{pending?'Changing…':'Confirm parent change'}</Button></div></section>:<section className="space-y-3"><label className="block text-sm">New parent intention<select aria-label="New parent intention" className="mt-2 block w-full rounded border p-3" value={destination} onChange={event=>setDestination(event.target.value)}><option value="">Select an intention</option>{workspace.data?.intentions.filter(i=>i.data.product_id===parent.data?.product_id&&i.data.id!==query.data?.intention_id&&!i.data.archived_at).map(i=><option key={i.data.id} value={i.data.id}>{i.data.id} · {i.data.title}</option>)}</select></label><Button disabled={!destination||pending} onClick={prepare}>Review parent change</Button></section>}{error&&<p role="alert" className="text-sm text-red-700">{error}. Review the refreshed parents before retrying.</p>}</DialogContent></Dialog></>;
}
