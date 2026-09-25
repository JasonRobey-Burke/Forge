import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button } from '@/components/ui/button';
import { useParams, useSearchParams } from 'react-router-dom';
import { useWorkspace, useEvidenceSource } from '@/hooks/useWorkspace';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import EvidenceList from '@/components/workspace/EvidenceList';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
export default function ProductEvidencePage() {
  const {id = ''} = useParams(), workspace = useWorkspace(id);
  const [params, setParams] = useSearchParams(), selected = params.get('source') ?? '';
  const source = useEvidenceSource(id, selected);
  useDocumentTitle(`${workspace.data?.product.data.name??'Product'} — Evidence`);
  if (!workspace.data) return <p role={workspace.isError ? 'alert' : 'status'}>{workspace.isError ? 'Could not load product evidence.' : 'Loading product evidence…'}</p>;
  return <WorkspaceShell><header><p className="text-xs text-stone-500">{workspace.data.product.data.name} / Evidence</p><h1 className="mt-2 text-3xl font-semibold">What supports the claim?</h1></header>{workspace.isError&&<div role="alert" className="rounded border border-amber-200 bg-amber-50 p-3 text-sm">Refresh failed. Displayed workspace data may be stale. {workspace.error.message} <Button variant="outline" onClick={()=>void workspace.refetch()}>Retry</Button></div>}{workspace.data.incomplete && <p role="alert">Some source files are invalid or unavailable. This evidence inventory may be incomplete.</p>}{workspace.data.diagnostics.map(d=><p key={d.key} role="alert" className="text-sm text-amber-800">{d.message}</p>)}<EvidenceList workspace={workspace.data} onOpen={ref => {const next = new URLSearchParams(params); next.set('source', ref.path); setParams(next);}}/><Dialog open={!!selected} onOpenChange={open => {if (!open) {const next = new URLSearchParams(params); next.delete('source'); setParams(next);}}}><DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>Evidence source</DialogTitle><DialogDescription className="break-all">{selected} · Result unknown</DialogDescription></DialogHeader>{source.isPending && <p role="status">Loading source…</p>}{source.isError && <p role="alert">{source.error.message} Review the source path in its linked spec.</p>}{source.data && <MarkdownRenderer content={source.data.content}/>}</DialogContent></Dialog></WorkspaceShell>;
}
