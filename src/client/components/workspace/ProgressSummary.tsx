import { Link } from 'react-router-dom';
import type { WorkspaceProjection } from '@shared/types/workspace';
export default function ProgressSummary({workspace:w}:{workspace:WorkspaceProjection}) {
  const base=`/products/${w.product.data.id}`;
  const tiles=[{label:'Expectation coverage',value:w.coverage.total?`${w.coverage.covered_ids.length} of ${w.coverage.total}`:'No expectations',detail:'have linked specs · inspect coverage →',url:'?concern=coverage'},
    {label:'Spec delivery',value:`${w.delivery.Done?.length??0} of ${new Set(Object.values(w.delivery).flat()).size} Done`,detail:'Unique specs · inspect delivery →',url:'?concern=delivery&phase=Done'},
    {label:'Reported validation',value:`${w.reported_validated_ids.length} reported validated`,detail:'Supporting evidence unknown →',url:'?concern=validation'}];
  return <section aria-label="Product progress" className="grid gap-3 md:grid-cols-3">{tiles.map(tile=><Link key={tile.label} to={base+tile.url} className="rounded-lg border border-stone-200 bg-white p-5 transition hover:border-emerald-700"><span className="text-sm text-stone-600">{tile.label}</span><strong className="my-2 block text-2xl font-semibold tracking-tight">{tile.value}</strong><span className="text-xs text-stone-500">{tile.detail}</span></Link>)}</section>;
}
