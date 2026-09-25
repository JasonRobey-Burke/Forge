import { useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { evaluateTransitionEligibility, transitionExplanation } from '@shared/lib/transitionEligibility';

import FlowBoard from '@/components/FlowBoard';
import Breadcrumbs from '@/components/Breadcrumbs';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useSessionState } from '@/hooks/useSessionState';
import { PHASE_LABELS } from '@/lib/phaseColors';
import FlowBoardSkeleton from '@/components/skeletons/FlowBoardSkeleton';
import ListToolbar from '@/components/ListToolbar';
import { Button } from '@/components/ui/button';

export default function FlowBoardPage() {
  const { productId } = useParams<{ productId: string }>();
  const query = useWorkspace(productId!);
  const {data:workspace,isLoading} = query;
  const product=workspace?.product.data;
  const [params,setParams]=useSearchParams();
  const outcome=params.get('outcome')??'';
  const specs=useMemo(()=>workspace?.specs.filter(r=>r.data.product_id===productId&&!r.data.archived_at).map(r=>({...r.data,source:r.source})),[workspace,productId]);
  const relationships=useMemo(()=>{
    if(!workspace)return {};
    const parent=new Map(workspace.expectations.map(r=>[r.data.id,r.data.intention_id]));
    const intentions=new Map(workspace.intentions.filter(r=>r.data.product_id===productId).map(r=>[r.data.id,r.data]));
    return Object.fromEntries((specs??[]).map(s=>[s.id,[...new Set([...(s.intentions??[]),...(workspace.spec_expectation_ids[s.id]??[]).flatMap(id=>parent.has(id)?[parent.get(id)!]:[])])].flatMap(id=>intentions.has(id)?[{id,title:intentions.get(id)!.title}]:[])]));
  },[workspace,specs,productId]);
  const gateReasons=useMemo(()=>{
    if(!workspace)return {};
    const phases=['Draft','Ready','InProgress','Review','Validating','Done'];
    const expectations=new Map(workspace.expectations.map(r=>[r.data.id,r.data]));
    return Object.fromEntries((specs??[]).flatMap(s=>{
      const next=phases[phases.indexOf(s.phase)+1];
      if(!next||!phases.includes(s.phase))return [];
      const linked=(workspace.spec_expectation_ids[s.id]??[]).flatMap(id=>expectations.has(id)?[expectations.get(id)!]:[]);
      const gate=evaluateTransitionEligibility(s,next,workspace.product.data,linked,workspace.delivery[next]?.length??0);
      if(gate.success)return [];
      const href=gate.error==='WIP_LIMIT_EXCEEDED'?`/products/${productId}/edit`:gate.error?.startsWith('GAP_CHECK_')?`/products/${productId}/evidence`:`/specs/${s.id}#${gate.error==='PEER_REVIEW_REQUIRED'?'review':'checklist'}`;
      return [[s.id,{message:transitionExplanation(gate),href,label:gate.error==='WIP_LIMIT_EXCEEDED'?'Review WIP settings':gate.error?.startsWith('GAP_CHECK_')?'Review gap-check source':'Open spec and complete checklist or review'}]];
    }));
  },[workspace,specs,productId]);
  useDocumentTitle(product?.name ? `${product.name} — Delivery` : 'Delivery');
  const storagePrefix = `forge:board:${productId ?? 'unknown'}`;
  const [search, setSearch] = useSessionState(`${storagePrefix}:search`, '');
  const [phaseFilter, setPhaseFilter] = useSessionState(`${storagePrefix}:phaseFilter`, '__all__');
  const [complexityFilter, setComplexityFilter] = useSessionState(`${storagePrefix}:complexityFilter`, '__all__');

  const filteredSpecs = useMemo(() => {
    let items = specs ?? [];
    if (outcome) items=items.filter(s=>relationships[s.id]?.some(i=>i.id===outcome));
    if (search) items = items.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()));
    if (phaseFilter !== '__all__') items = items.filter((s) => s.phase === phaseFilter);
    if (complexityFilter !== '__all__') items = items.filter((s) => s.complexity === complexityFilter);
    return items;
  }, [specs, search, phaseFilter, complexityFilter, outcome, relationships]);

  if (isLoading) return <FlowBoardSkeleton />;
  if (!product || !specs) return <div className="text-destructive">Error loading board.</div>;

  return (
    <div>
      <Breadcrumbs items={[
        { label: 'Products', href: '/products' },
        { label: product.name, href: `/products/${productId}` },
        { label: 'Flow Board' },
      ]} />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{product.name} — Flow Board</h1>
        <Button asChild variant="outline" size="sm">
          <Link to={`/products/${productId}/edit`}>
            <Settings className="h-4 w-4 mr-1" />
            WIP Settings
          </Link>
        </Button>
      </div>

      {query.isError&&<div role="alert" className="mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm">Refresh failed. Displayed workspace data may be stale. {query.error.message} <Button variant="outline" onClick={()=>void query.refetch()}>Retry</Button></div>}
      <p className="mb-4 text-sm text-muted-foreground">Done describes delivery, not validation. Column counts and work-in-progress limits include the whole product.</p>
      <label className="mb-4 block text-sm font-medium">Outcome
        <select className="ml-2 max-w-full rounded border bg-background p-2" value={outcome} onChange={event=>{const next=new URLSearchParams(params);if(event.target.value)next.set('outcome',event.target.value);else next.delete('outcome');setParams(next);}}>
          <option value="">All outcomes</option>{workspace?.intentions.filter(r=>r.data.product_id===productId).map(r=><option key={r.source.path} value={r.data.id}>{r.data.title}{r.data.archived_at?' · Archived':''}</option>)}
        </select>
      </label>
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search board specs..."
        filters={[
          {
            label: 'Phase',
            value: phaseFilter,
            onChange: setPhaseFilter,
            options: Object.entries(PHASE_LABELS).map(([value, label]) => ({ label, value })),
          },
          {
            label: 'Complexity',
            value: complexityFilter,
            onChange: setComplexityFilter,
            options: [
              { label: 'Low', value: 'Low' },
              { label: 'Medium', value: 'Medium' },
              { label: 'High', value: 'High' },
            ],
          },
        ]}
      />

      <FlowBoard wholeProductCounts={Object.fromEntries(Object.entries(workspace?.delivery??{}).map(([phase,ids])=>[phase,ids.length]))} outcomes={relationships} gateReasons={gateReasons} specs={filteredSpecs} wipLimits={product.wip_limits} productId={productId!} />
    </div>
  );
}
