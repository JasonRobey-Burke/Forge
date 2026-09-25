import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WorkspaceProjection } from '@shared/types/workspace';
import type { ArtifactRef, Versioned } from '@shared/types/source';
import type { Expectation, Spec } from '@shared/types';

const PAGE = 50;
const connector = 'ml-2 space-y-3 border-l-2 border-emerald-100 pl-3 sm:ml-4 sm:pl-5';
function Children({children, label, className = connector}: {children: ReactNode[]; label: string; className?:string}) {
  const [limit, setLimit] = useState(PAGE);
  return <ul aria-label={label} className={className}>{children.slice(0, limit)}{children.length > limit && <li><Button variant="outline" size="sm" onClick={() => setLimit(n => n + PAGE)}>Show more <span className="sr-only">{label}</span></Button></li>}</ul>;
}
export default function ProductTree({workspace: w, filter, onEdit}: {workspace: WorkspaceProjection; filter: string; onEdit: (ref: ArtifactRef) => void}) {
  const [expanded, setExpanded] = useState(new Set<string>());
  const query = filter.trim().toLowerCase();
  const matches = (...values: (string | undefined)[]) => values.some(value => value?.toLowerCase().includes(query));
  const index = useMemo(() => {
    const expectations = new Map<string, Versioned<Expectation>[]>(), specs = new Map<string, Versioned<Spec>[]>(), direct = new Map<string, Versioned<Spec>[]>();
    for (const record of w.expectations) expectations.set(record.data.intention_id, [...(expectations.get(record.data.intention_id) ?? []), record]);
    for (const record of w.specs) {
      for (const id of new Set(w.spec_expectation_ids[record.data.id] ?? [])) specs.set(id, [...(specs.get(id) ?? []), record]);
      for (const id of new Set(record.data.intentions ?? [])) direct.set(id, [...(direct.get(id) ?? []), record]);
    }
    return {expectations, specs, direct};
  }, [w]);
  function disclosure(key: string, title: string, forced: boolean) {
    const open = forced || expanded.has(key);
    return <button type="button" disabled={forced} title={forced?'Expanded to show filter matches; clear the filter to collapse.':undefined} aria-expanded={open} aria-label={`${open ? 'Collapse' : 'Expand'} ${title}`} className="flex min-w-0 items-start gap-2 text-left font-medium hover:text-emerald-800" onClick={() => setExpanded(current => {const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next;})}>{open ? <ChevronDown className="mt-0.5 h-4 w-4 shrink-0"/> : <ChevronRight className="mt-0.5 h-4 w-4 shrink-0"/>}<span className="break-words">{title}</span></button>;
  }
  function specRow(record: Versioned<Spec>) {
    const s = record.data;
    return <li key={`${s.id}:${record.source.path}`} className="relative space-y-1 border-t border-stone-100 pt-2 text-sm before:absolute before:-left-3 before:top-4 before:w-2 before:border-t before:border-emerald-200"><Link className="break-words text-emerald-800 underline" to={`/specs/${encodeURIComponent(s.id)}`}>{s.id}{s.title !== s.id && ` · ${s.title}`}</Link><p className="text-xs text-stone-500">{s.phase}{s.archived_at && ' · Archived'}{s.product_id !== w.product.data.id && ' · Other product; excluded from totals'}</p></li>;
  }
  const specMatches = (s: Versioned<Spec>) => matches(s.data.id, s.data.title, s.data.description);
  const expectationMatches = (e: Versioned<Expectation>) => matches(e.data.id, e.data.title, e.data.description) || (index.specs.get(e.data.id) ?? []).some(specMatches);
  const intentionRows = w.intentions.flatMap(record => {
    const i = record.data, children = index.expectations.get(i.id) ?? [], direct = index.direct.get(i.id) ?? [];
    const ownMatch = matches(i.id, i.title, i.description);
    const childMatch = children.some(expectationMatches) || direct.some(specMatches);
    const concerns = w.concerns.filter(c => c.entity.type === 'intentions' && c.entity.id === i.id);
    if (query && !ownMatch && !childMatch && !concerns.some(c => matches(c.message, ...c.related.map(r => r.id)))) return [];
    const isOpen = !!query || expanded.has(`i:${i.id}`);
    const nested = children.filter(e => !query || ownMatch || expectationMatches(e)).map(e => {
      const row = e.data, specs = index.specs.get(row.id) ?? [], eMatch = matches(row.id, row.title, row.description);
      const open = !!query || expanded.has(`e:${i.id}:${row.id}`);
      return <li key={`${row.id}:${e.source.path}`} className="space-y-3"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0 flex-1">{disclosure(`e:${i.id}:${row.id}`, row.title || row.description || row.id, !!query)}<p className="ml-6 text-xs text-stone-500">{row.title !== row.id && row.id} · {row.status}{row.archived_at && ' · Archived'}{!w.coverage.covered_ids.includes(row.id) && !w.coverage.uncovered_ids.includes(row.id) && ' · Outside active totals'}</p></div><Button variant="ghost" size="sm" aria-label={`Edit ${row.id}`} onClick={() => onEdit({type:'expectations',id:row.id})}>Edit</Button></div>{open && (specs.length ? <Children label={`${row.id} specs`}>{specs.filter(s => !query || ownMatch || eMatch || specMatches(s)).map(specRow)}</Children> : <p className="ml-6 text-sm text-stone-500">No linked spec</p>)}</li>;
    });
    const directRows = direct.filter(s => !query || ownMatch || specMatches(s)).map(specRow);
    return [<li key={`${i.id}:${record.source.path}`} className="space-y-4 rounded-lg border bg-white p-3 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0 flex-1">{disclosure(`i:${i.id}`, i.title, !!query)}<p className="ml-6 text-xs text-stone-500">{i.title !== i.id && i.id} · {i.status}{i.archived_at && ' · Archived'}{i.product_id !== w.product.data.id && ' · Other product; context only'}</p></div><Button size="sm" variant="ghost" aria-label={`Edit ${i.id}`} onClick={() => onEdit({type:'intentions',id:i.id})}>Edit</Button></div>{isOpen && <><Children label={`${i.id} expectations`}>{nested}</Children>{!children.length && <p className="ml-6 text-sm text-stone-500">No expectations</p>}{directRows.length > 0 && <section className="space-y-2"><h3 className="text-xs font-medium text-stone-600">Direct intention-to-spec links · do not establish expectation coverage</h3><Children label={`${i.id} direct spec links`}>{directRows}</Children></section>}</>}</li>];
  });
  const attachedSpecIds = new Set([...index.specs.values(), ...index.direct.values()].flat().map(s => s.data.id));
  const detachedSpecs = w.specs.filter(s => s.data.product_id === w.product.data.id && !attachedSpecIds.has(s.data.id) && (!query || specMatches(s)));
  const orphans = w.expectations.filter(e => !w.intentions.some(i => i.data.id === e.data.intention_id) && (!query || expectationMatches(e)));
  const issues = w.concerns.filter(c => !['UNCOVERED','BLOCKED_NEXT_PHASE','REVIEW_QUEUE','EVIDENCE_UNKNOWN'].includes(c.code) && (!query || matches(c.entity.id,c.message,...c.related.map(r => r.id))));
  return <div className="space-y-5"><p className="text-sm text-stone-600">{Object.values(w.delivery).flat().length} unique active specs · {w.coverage.covered_ids.length} of {w.coverage.total} active expectations linked. Shared specs appear under every parent and count once. Done describes delivery; evidence remains unknown.</p><Children label="Product relationships" className="space-y-4">{intentionRows}</Children>{!intentionRows.length && <p className="text-sm text-stone-500">No matching outcomes.</p>}{detachedSpecs.length > 0 && <section className="space-y-3"><h2 className="font-semibold">Specs without outcome links</h2><Children label="Unassociated specs">{detachedSpecs.map(specRow)}</Children></section>}{orphans.length > 0 && <section><h2 className="font-semibold">Expectations with missing parents</h2>{orphans.map(e => <p key={e.source.path}><Link to={`/expectations/${e.data.id}`}>{e.data.id} · Inspect missing parent {e.data.intention_id}</Link></p>)}</section>}{issues.length > 0 && <section className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4"><h2 className="font-semibold">Relationships to inspect</h2><Children label="Relationship concerns">{issues.map(c => <li key={c.key} className="text-sm"><p>{c.entity.id} · {c.message}</p>{c.related.map(r => <span className="mr-2 font-mono text-xs" key={`${r.type}:${r.id}`}>{r.id}</span>)}<Link className="block text-emerald-900 underline" to={`/${c.entity.type}/${encodeURIComponent(c.entity.id)}`}>Inspect {c.entity.id} source and repair relationship</Link></li>)}</Children></section>}</div>;
}
