import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button } from '@/components/ui/button';
import { useNavigate, useParams } from 'react-router-dom';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useUpdateIntention } from '@/hooks/useIntentions';
import RoadmapBoard from '@/components/workspace/RoadmapBoard';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
export default function ProductRoadmapPage(){
  const {id=''}=useParams(),navigate=useNavigate();const query=useWorkspace(id),update=useUpdateIntention();
  useDocumentTitle(`${query.data?.product.data.name??'Product'} — Roadmap`);
  if(!query.data)return <p role={query.isError?'alert':'status'}>{query.isError?'Could not load roadmap.':'Loading roadmap…'}</p>;
  return <WorkspaceShell><header><p className="text-xs text-stone-500">{query.data.product.data.name} / Roadmap</p><h1 className="mt-2 text-3xl font-semibold">Where are we going?</h1></header>{query.isError&&<div role="alert" className="rounded border border-amber-200 bg-amber-50 p-3 text-sm">Refresh failed. Displayed workspace data may be stale. {query.error.message} <Button variant="outline" onClick={()=>void query.refetch()}>Retry</Button></div>}<RoadmapBoard workspace={query.data} onEdit={id=>navigate(`/intentions/${id}?edit=1`)} onMove={async(id,roadmap,revision)=>{await update.mutateAsync({id,product_id:query.data.product.data.id,roadmap,revision});await query.refetch();}}/></WorkspaceShell>;
}
