import { Link } from 'react-router-dom';
import type { WorkspaceProjection } from '@shared/types/workspace';
export default function AttentionList({workspace:w}:{workspace:WorkspaceProjection}) {
  return <section><h2 className="mb-4 text-lg font-semibold">Needs attention</h2>{w.concerns.length?w.concerns.map(c=><article key={c.key} className="border-b border-stone-200 py-4"><Link className="text-sm font-medium text-emerald-900 underline-offset-4 hover:underline" to={`?concern=${c.code==='UNCOVERED'?'coverage':c.code==='REVIEW_QUEUE'?'review':c.code==='BLOCKED_NEXT_PHASE'?'blocked':'attention'}&cause=${encodeURIComponent(c.key)}`}>{c.message}</Link><p className="mt-2 text-xs text-stone-500"><Link to={`/${c.entity.type}/${c.entity.id}`}>{c.entity.id} · {c.code==='BLOCKED_NEXT_PHASE'?'Open spec checklist':'Inspect source'}</Link></p></article>):<p className="text-sm text-stone-500">No known concerns in the current records.</p>}</section>;
}
