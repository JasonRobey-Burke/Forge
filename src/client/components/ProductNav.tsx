import { useSyncExternalStore, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { WorkspaceProjection } from '@shared/types/workspace';
import { workspaceKey } from '@/hooks/useWorkspace';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
interface ProductNavProps {productId:string;productName:string|null;}
const tabs=[{label:'Overview',path:''},{label:'Roadmap',path:'/roadmap'},{label:'Product map',path:'/map'},{label:'Evidence',path:'/evidence'},{label:'Intentions',path:'/intentions'},{label:'Specs',path:'/specs'},{label:'Delivery',path:'/board'},{label:'Metrics',path:'/metrics'},{label:'Product settings',path:'/edit'}];
export default function ProductNav({productId,productName}:ProductNavProps){
 const location=useLocation(),base=`/products/${productId}`;
 const cache=useQueryClient().getQueryCache();
 const subscribe=useCallback((notify:()=>void)=>cache.subscribe(notify),[cache]);
 const snapshot=useSyncExternalStore(subscribe,()=>cache.find<WorkspaceProjection>({queryKey:workspaceKey(productId),exact:true})?.state.data);
 const workspaceRoute=['','/roadmap','/map','/evidence','/board'].some(suffix=>location.pathname===base+suffix);
 const name=workspaceRoute&&snapshot?snapshot.product.data.name:productName;

 return <><div className="mb-6 hidden px-3 md:block"><p className="mb-2 text-[10px] uppercase tracking-widest text-stone-600">Product workspace</p><p className="break-words font-semibold">{name??productId}</p><p className="mt-1 text-xs text-stone-600">{productId}</p></div><nav aria-label="Product workspace" className="flex flex-wrap gap-1 md:flex-col">{tabs.map(tab=><Link key={tab.path} to={base+tab.path} aria-current={location.pathname===base+tab.path?'page':undefined} className={cn('rounded-md px-3 py-2 text-xs font-medium transition md:text-sm',location.pathname===base+tab.path?'bg-emerald-100 text-emerald-900':'text-stone-600 hover:bg-stone-100')}>{tab.label}</Link>)}</nav></>;
}
