import { readRoadmap } from './roadmap.js';
import type { WorkspaceSnapshot, WorkspaceProjection, WorkspaceConcern } from '../types/workspace.js';
import type { ArtifactRef, Versioned } from '../types/source.js';
import { SpecPhase, IntentionStatus, ExpectationStatus } from '../types/enums.js';
import { evaluateTransitionEligibility, transitionExplanation } from './transitionEligibility.js';

const unique = <T extends { id: string }>(rows: Versioned<T>[]) => new Map(rows.map(row => [row.data.id, row.data]));
const ref = (type: ArtifactRef['type'], id: string): ArtifactRef => ({ type, id });
function deduplicate(concerns: WorkspaceConcern[]): WorkspaceConcern[] {
  return [...new Map(concerns.map(c => [`${c.code}:${c.entity.type}:${c.entity.id}`, c])).values()];
}
function concern(code: string, entity: ArtifactRef, message: string, related: ArtifactRef[] = [], kind: WorkspaceConcern['kind'] = 'attention'): WorkspaceConcern {
  return { key: `${code}:${entity.type}:${entity.id}`, code, entity, message, related, kind };
}
export function collectWorkspaceDiagnostics(snapshot: WorkspaceSnapshot): WorkspaceConcern[] {
  const result = [...snapshot.diagnostics];
  const intentions = unique(snapshot.intentions), expectations = unique(snapshot.expectations), specs = unique(snapshot.specs);
  for (const [type, rows] of [['intentions', snapshot.intentions], ['expectations', snapshot.expectations], ['specs', snapshot.specs]] as const) {
    const seen = new Set<string>();
    for (const { data, source } of rows) {
      const entity = ref(type, data.id);
      if (seen.has(data.id)) result.push(concern('DUPLICATE_ID', entity, `Duplicate source ID ${data.id}`, [], 'unknown'));
      seen.add(data.id);
      for (const [field, reason] of Object.entries(source.read_only_fields))
        if (!(field === 'title' && reason === 'This title is derived from the full statement. Edit the purpose or add an explicit title in advanced source.')) result.push(concern(`UNSUPPORTED_FIELD_${field}`, entity, `${field}: ${reason}`, [], 'unknown'));
      if (data.archived_at) result.push(concern('ARCHIVED_RECORD', entity, 'Archived record retained for inspection'));
    }
  }
  for (const i of intentions.values()) {
    const forge = i.extras.forge;
    if (forge && typeof forge === 'object' && readRoadmap((forge as Record<string, unknown>).roadmap).unsupported) result.push(concern('UNSUPPORTED_ROADMAP', ref('intentions', i.id), 'Unsupported planning metadata is preserved. Review the roadmap to explicitly replace it.', [], 'unknown'));
  }
  for (const i of intentions.values()) if (!Object.values(IntentionStatus).includes(i.status))
    result.push(concern('UNKNOWN_STATUS', ref('intentions', i.id), `Unknown recorded status: ${i.status}`, [], 'unknown'));
  for (const e of expectations.values()) {
    if (!Object.values(ExpectationStatus).includes(e.status)) result.push(concern('UNKNOWN_STATUS', ref('expectations', e.id), `Unknown recorded status: ${e.status}`, [], 'unknown'));
    const parent = intentions.get(e.intention_id);
    if (!parent) result.push(concern('ORPHAN_PARENT', ref('expectations', e.id), 'Missing parent intention', [ref('intentions', e.intention_id)]));
    else {
      if (parent.archived_at) result.push(concern('ARCHIVED_PARENT', ref('expectations', e.id), 'Parent intention is archived', [ref('intentions', parent.id)]));
      if (e.product_id && e.product_id !== parent.product_id) result.push(concern('CONTRADICTORY_PRODUCT', ref('expectations', e.id), 'Product annotation contradicts parent intention product', [ref('intentions', parent.id)]));
    }
  }
  const inspect = (entity: ArtifactRef, target: ArtifactRef, record: { archived_at: string | null } | undefined, cross: boolean) => {
    if (!record) result.push(concern(`MISSING_${target.type}_${target.id}`, entity, `Missing relationship target ${target.id}`, [target]));
    else if (record.archived_at) result.push(concern(`ARCHIVED_${target.type}_${target.id}`, entity, `Relationship target ${target.id} is archived`, [target]));
    else if (cross) result.push(concern(`CROSS_PRODUCT_${target.type}_${target.id}`, entity, `Cross-product relationship to ${target.id}`, [target]));
  };
  for (const [id, links] of Object.entries(snapshot.intention_dependency_ids)) {
    const owner = intentions.get(id);
    for (const linked of new Set(links)) {
      const target = intentions.get(linked);
      inspect(ref('intentions', id), ref('intentions', linked), target, !!target && target.product_id !== owner?.product_id);
    }
  }
  for (const s of specs.values()) {
    for (const id of new Set(s.depends_on ?? [])) {
      const target = specs.get(id);
      inspect(ref('specs', s.id), ref('specs', id), target, !!target && target.product_id !== s.product_id);
    }
    for (const id of new Set(snapshot.spec_expectation_ids[s.id] ?? [])) {
      const target = expectations.get(id), parent = target && intentions.get(target.intention_id);
      inspect(ref('specs', s.id), ref('expectations', id), target, !!parent && parent.product_id !== s.product_id);
    }
    for (const id of new Set(s.intentions ?? [])) {
      const target = intentions.get(id);
      inspect(ref('specs', s.id), ref('intentions', id), target, !!target && target.product_id !== s.product_id);
    }
    if (!Object.values(SpecPhase).includes(s.phase)) result.push(concern('UNKNOWN_PHASE', ref('specs', s.id), `Unknown recorded phase: ${s.phase}`, [], 'unknown'));
  }
  // Linear DFS marks existing dependency cycles as warnings, never lifecycle gates.
  const cycles = (type: 'intentions' | 'specs', graph: Map<string, string[]>) => {
    const state = new Map<string, number>(), stack: string[] = [], positions = new Map<string, number>();
    const visit = (id: string) => {
      state.set(id, 1); positions.set(id, stack.length); stack.push(id);
      for (const target of graph.get(id) ?? []) {
        if (!graph.has(target)) continue;
        if (state.get(target) === 1) {
          for (let index = positions.get(target)!; index < stack.length; index++) {
            const member = stack[index];
            result.push(concern('DEPENDENCY_CYCLE', ref(type, member), 'Existing dependency cycle (including self links) requires review', [ref(type, target)]));
          }
        } else if (!state.has(target)) visit(target);
      }
      stack.pop(); positions.delete(id); state.set(id, 2);
    };
    for (const id of graph.keys()) if (!state.has(id)) visit(id);
  };
  cycles('intentions', new Map([...intentions.keys()].map(id => [id, snapshot.intention_dependency_ids[id] ?? []])));
  cycles('specs', new Map([...specs.values()].map(s => [s.id, s.depends_on ?? []])));
  return deduplicate(result);
}
export function projectWorkspace(snapshot: WorkspaceSnapshot): WorkspaceProjection {
  const intentions = unique(snapshot.intentions), expectations = unique(snapshot.expectations), specs = unique(snapshot.specs);
  const activeIntentions = new Set([...intentions.values()].filter(i => i.product_id === snapshot.product.data.id && !i.archived_at).map(i => i.id));
  const activeExpectations = [...expectations.values()].filter(e => activeIntentions.has(e.intention_id) && !e.archived_at);
  const activeIds = new Set(activeExpectations.map(e => e.id));
  const activeSpecs = [...specs.values()].filter(s => s.product_id === snapshot.product.data.id && !s.archived_at);
  const delivery: Record<string, string[]> = Object.fromEntries([...Object.values(SpecPhase), 'Unknown'].map(p => [p, []]));
  const covered = new Set<string>();
  for (const s of activeSpecs) {
    delivery[Object.values(SpecPhase).includes(s.phase) ? s.phase : 'Unknown'].push(s.id);
    for (const id of snapshot.spec_expectation_ids[s.id] ?? []) if (activeIds.has(id)) covered.add(id);
  }
  const uncovered = activeExpectations.filter(e => !covered.has(e.id)).map(e => e.id);
  const concerns = collectWorkspaceDiagnostics(snapshot);
  for (const id of uncovered) concerns.push(concern('UNCOVERED', ref('expectations', id), 'No linked active same-product spec provides coverage'));
  const validated = activeExpectations.filter(e => e.status === 'Validated').map(e => e.id);
  for (const id of validated) concerns.push(concern('EVIDENCE_UNKNOWN', ref('expectations', id), 'Reported validated; validation evidence result is unknown', [], 'unknown'));
  const phases = Object.values(SpecPhase);
  const graphIncomplete = concerns.some(c => ['PARSE_ERROR', 'DUPLICATE_ID', 'UNREADABLE_SOURCE'].includes(c.code));
  for (const s of activeSpecs) {
    const next = phases[phases.indexOf(s.phase) + 1];
    if (phases.includes(s.phase) && next) {
      const linked = (snapshot.spec_expectation_ids[s.id] ?? []).flatMap(id => { const e = expectations.get(id); return e ? [e] : []; });
      const gate = graphIncomplete ? { success: false, error: 'SOURCE_GRAPH_INCOMPLETE' }
        : evaluateTransitionEligibility(s, next, snapshot.product.data, linked, delivery[next].length);
      if (!gate.success) concerns.push(concern('BLOCKED_NEXT_PHASE', ref('specs', s.id), transitionExplanation(gate)));
    }
    if (s.phase === 'Review' || s.phase === 'Validating') concerns.push(concern('REVIEW_QUEUE', ref('specs', s.id), `Awaiting ${s.phase === 'Review' ? 'review' : 'validation'}`));
  }
  for (const e of snapshot.evidence) if (e.availability !== 'present') {
    for (const entity of [...e.spec_ids.map(id => ref('specs', id)), ...e.expectation_ids.map(id => ref('expectations', id))])
      concerns.push(concern(`EVIDENCE_${e.path}`, entity, `Evidence report ${e.path}: ${e.availability}; result unknown`, [], 'unknown'));
  }
  const finalConcerns = deduplicate(concerns);
  return { ...snapshot, active_intention_ids: [...activeIntentions], coverage: { covered_ids: [...covered], uncovered_ids: uncovered, total: activeExpectations.length },
    delivery, reported_validated_ids: validated, concerns: finalConcerns,
    incomplete: finalConcerns.some(c => ['PARSE_ERROR', 'DUPLICATE_ID', 'UNREADABLE_SOURCE'].includes(c.code)) };
}
