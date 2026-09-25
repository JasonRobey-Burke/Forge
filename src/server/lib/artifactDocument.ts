import { readRoadmap } from '../../shared/lib/roadmap.js';
import { parseDocument, isMap, isSeq, isScalar, isAlias, stringify, type Node, type YAMLMap } from 'yaml';
import { isDeepStrictEqual } from 'node:util';
import type { ArtifactRef, ArtifactType } from '../../shared/types/source.js';

export class ArtifactError extends Error {
  constructor(public code: string, message: string, public status: number, public details?: unknown) {
    super(message);
    this.name = 'ArtifactError';
  }
}
const wrappers: Record<ArtifactType, string> = {
  products: 'product', intentions: 'intention', expectations: 'expectation', specs: 'spec',
};
type FieldPaths = Record<string, string[][]>;
const common: FieldPaths = Object.fromEntries([
  'title', 'description', 'owner', 'status', 'priority', 'complexity', 'rationale',
  'dependencies', 'deferred_reason', 'roadmap', 'edge_cases', 'validation_criteria', 'boundaries', 'deliverables', 'peer_reviewed',
  'depends_on', 'intentions', 'expectations', 'updated_at',
].map(key => [key, [[key]]]));
function fields(type: ArtifactType): FieldPaths {
  const table: FieldPaths = { ...common, title: [['title'], ['name']], name: [['name'], ['title']],
    product_id: [['product_id'], ['product']], intention_id: [['intention_id'], ['intention']],
    context: [['context'], ['technical_context']], wip_limits: [['wip_limits']],
  };
  if (type === 'products') Object.assign(table, {
    problem_statement: [['problem_statement'], ['problem']],
    vision: [['vision'], ['value_proposition']],
    target_audience: [['target_audience'], ['audience', 'primary']],
  });
  if (type === 'intentions') Object.assign(table, {
    roadmap: [['forge', 'roadmap']],
    description: [['description'], ['statement']], statement: [['statement'], ['description']],
  });
  if (type === 'specs') Object.assign(table, {
    peer_reviewed: [['peer_reviewed'], ['validation', 'peer_reviewed']],
    phase: [['phase'], ['status']], status: [['status'], ['phase']],
    validation_automated: [['validation_automated'], ['validation', 'automated']],
    validation_human: [['validation_human'], ['validation', 'human'], ['validation', 'human_review']],
    expectation_ids: [['expectation_ids'], ['expectations']],
  });
  return table;
}
function invalid(message: string): never { throw new ArtifactError('INVALID_SOURCE', message, 422); }
function parse(text: string, ref: ArtifactRef) {
  const doc = parseDocument(text, { keepSourceTokens: true });
  if (doc.errors.length) invalid(doc.errors.map(error => error.message).join('; '));
  if (!isMap(doc.contents)) invalid('Artifact document must be a mapping');
  const singular = wrappers[ref.type];
  if (!singular) invalid('Unknown artifact type');
  const presentWrappers = Object.values(wrappers).filter(key => doc.has(key));
  // A flat artifact may use product/intention as a scalar parent reference.
  const mappingWrappers = presentWrappers.filter(key => isMap(doc.get(key, true)) || isSeq(doc.get(key, true)));
  if (mappingWrappers.some(key => key !== singular)) invalid('Artifact wrapper does not match the requested type');
  const root = doc.has(singular) && !doc.has('id') ? [singular] : [];
  const entity = root.length ? doc.getIn(root, true) : doc.contents;
  if (!isMap(entity)) invalid('Artifact wrapper must contain a mapping');
  const id = entity.get('id', true);
  if (!isScalar(id) || id.value !== ref.id) invalid('Artifact identity does not match the requested entity');
  return { doc, entity, root };
}
export function validateRawDocument(text: string, ref: ArtifactRef): void { parse(text, ref); }

function protectedNode(node: unknown): boolean {
  if (isAlias(node)) return true;
  if ((isScalar(node) || isMap(node) || isSeq(node)) && node.anchor) return true;
  if (isMap(node)) return node.items.some(pair => protectedNode(pair.key) || protectedNode(pair.value));
  if (isSeq(node)) return node.items.some(protectedNode);
  return false;
}
function reason(entity: YAMLMap, alternatives: string[][], field: string, ref: ArtifactRef): string | undefined {
  const existing = alternatives.filter(p => entity.hasIn(p));
  if (existing.length > 1) return 'Multiple source aliases are present. Repair this field in advanced source before editing.';
  if (field === 'title' && ref.type === 'intentions' && !existing.length)
    return 'This title is derived from the full statement. Edit the purpose or add an explicit title in advanced source.';
  const selected = existing[0] ?? alternatives[0];
  for (let i = 1; i <= selected.length; i++) {
    const ancestor = entity.getIn(selected.slice(0, i), true);
    if (i === selected.length ? protectedNode(ancestor) : isAlias(ancestor) || ((isMap(ancestor) || isSeq(ancestor) || isScalar(ancestor)) && ancestor.anchor)) return 'Anchored or aliased values require an explicit advanced source repair.';
    if (i < selected.length && ancestor !== undefined && !isMap(ancestor))
      return 'This structured source path cannot be represented by the ordinary form; use advanced source.';
  }
  const node = entity.getIn(selected, true);
  if (isSeq(node) && ['title','name','description','target_audience','vision','problem_statement','validation_criteria'].includes(field))
    return 'This structured field is read-only in the ordinary form; use advanced source.';
  if (isSeq(node) && node.items.some(item => !isScalar(item) || typeof item.value !== 'string'))
    return 'Structured list entries are read-only in the ordinary form; use advanced source.';
  if (isMap(node) && !['context', 'wip_limits', 'roadmap'].includes(field))
    return 'This structured field is read-only in the ordinary form; use advanced source.';
  return undefined;
}
export function inspectDocument(text: string, ref: ArtifactRef): { read_only_fields: Record<string, string> } {
  const table = fields(ref.type);
  const read_only_fields: Record<string, string> = {};
  try {
    const { entity } = parse(text, ref);
    for (const [field, paths] of Object.entries(table)) {
      const diagnostic = reason(entity, paths, field, ref);
      if (diagnostic) read_only_fields[field] = diagnostic;
      if (field === 'context') {
        const selected = paths.find(path => entity.hasIn(path)) ?? paths[0];
        const context = entity.getIn(selected, true);
        if (context !== undefined && !isMap(context)) read_only_fields.context = 'Structured technical context requires advanced source editing.';
        if (isMap(context)) for (const key of ['stack', 'patterns', 'conventions', 'auth']) {
          const value = context.get(key, true);
          if (value === undefined) continue;
          const supported = key === 'auth' ? isScalar(value) && typeof value.value === 'string'
            : isSeq(value) && value.items.every(item => isScalar(item) && typeof item.value === 'string');
          if (!supported || protectedNode(value)) read_only_fields[`context.${key}`] = `Structured context ${key} requires advanced source editing.`;
        }
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid source; repair in advanced source';
    for (const field of Object.keys(table)) read_only_fields[field] = message;
  }
  return { read_only_fields };
}

function scalarText(value: unknown): string {
  // Flow rendering makes the edited value self-contained; all surrounding bytes remain untouched.
  if (typeof value === 'string' && /[\r\n]/.test(value)) return JSON.stringify(value);
  return stringify(value, { collectionStyle: 'flow', lineWidth: 0 }).trimEnd();
}
function replaceValue(text: string, ref: ArtifactRef, fieldPath: string[], value: unknown): string {
  const { doc, root } = parse(text, ref);
  const fullPath = [...root, ...fieldPath];
  const node = doc.getIn(fullPath, true) as Node | undefined;
  if (node && (isScalar(node) || isSeq(node) || isMap(node)) && node.range) {
    if (isDeepStrictEqual(node.toJSON(), value)) return text;
    const [start, end] = node.range;
    const original = text.slice(start, end);
    const blockHeaderComment = isScalar(node) && (node.type === 'BLOCK_LITERAL' || node.type === 'BLOCK_FOLDED')
      ? original.split(/\r?\n/, 1)[0].match(/[ \t]+#.*$/)?.[0] ?? '' : '';
    const replacement = scalarText(value) + blockHeaderComment
      + (original.endsWith('\n') ? (original.endsWith('\r\n') ? '\r\n' : '\n') : '');
    return text.slice(0, start) + replacement + text.slice(end);
  }
  // Insert only the missing pair, keeping the existing mapping's source untouched.
  let parentPath = fullPath.slice(0, -1);
  let key = fullPath.at(-1)!;
  let nextValue = value;
  while (!doc.hasIn(parentPath) && parentPath.length) {
    nextValue = { [key]: nextValue };
    key = parentPath.at(-1)!;
    parentPath = parentPath.slice(0, -1);
  }
  const parent = parentPath.length ? doc.getIn(parentPath, true) : doc.contents;
  if (!isMap(parent) || !parent.range) invalid('Cannot insert into this source shape; use advanced source');
  if (parent.flow) {
    const position = parent.range[1] - 1;
    return text.slice(0, position) + `${parent.items.length ? ', ' : ''}${key}: ${scalarText(nextValue)}` + text.slice(position);
  }
  const firstKey = parent.items[0]?.key;
  if (!isScalar(firstKey) || !firstKey.range) invalid('Cannot determine source indentation; use advanced source');
  const indent = firstKey.range[0] - text.lastIndexOf('\n', firstKey.range[0] - 1) - 1;
  const position = parent.range[2];
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const prefix = position > 0 && text[position - 1] !== '\n' ? eol : '';
  return text.slice(0, position) + `${prefix}${' '.repeat(indent)}${key}: ${scalarText(nextValue)}${eol}` + text.slice(position);
}

function removeValue(text: string, ref: ArtifactRef, path: string[]): string {
  const { entity } = parse(text, ref);
  const parent = entity.getIn(path.slice(0, -1), true);
  if (!isMap(parent)) return text;
  const index = parent.items.findIndex(pair => isScalar(pair.key) && pair.key.value === path.at(-1));
  if (index < 0) return text;
  const pair = parent.items[index];
  if (!isScalar(pair.key) || !pair.key.range) invalid('Cannot locate roadmap field');
  const value = pair.value as Node;
  if (!value?.range) invalid('Cannot locate roadmap value');
  let start = pair.key.range[0], end = value.range[2];
  if (parent.flow) {
    end = value.range[1];
    const next = parent.items[index + 1]?.key as Node | undefined;
    if (next?.range) end = next.range[0];
    else if (index > 0) { const prev = parent.items[index - 1].value as Node; start = text.indexOf(',', prev.range![1]); }
  } else {
    start = text.lastIndexOf('\n', start - 1) + 1;
    if (text[end - 1] !== '\n') { const newline = text.indexOf('\n', end); end = newline < 0 ? text.length : newline + 1; }
  }
  return text.slice(0, start) + text.slice(end);
}

export function editDocument(text: string, ref: ArtifactRef, changes: Record<string, unknown>): string {
  const { entity } = parse(text, ref);
  const table = fields(ref.type);
  let result = text;
  const resolved = new Set<string>();
  for (const [field, rawValue] of Object.entries(changes)) {
    const alternatives = table[field];
    if (!alternatives) invalid(`Unsupported editable field: ${field}`);
    const diagnostic = reason(entity, alternatives, field, ref);
    if (diagnostic) invalid(diagnostic);
    const selected = alternatives.find(p => entity.hasIn(p)) ?? alternatives[0];
    if (resolved.has(selected.join('.'))) invalid(`Multiple edits address the same source field: ${field}`);
    resolved.add(selected.join('.'));
    let value = rawValue;
    if (value === undefined) invalid(`Missing value for ${field}`);
    if ((field === 'phase' || field === 'status') && typeof value === 'string')
      value = value.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase().replace(/[ _]+/g, '-');
    if (field === 'roadmap') {
      if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('Roadmap edit must be a mapping');
      const patch = value as Record<string, unknown>;
      const previous = readRoadmap((entity.getIn(selected, true) as Node | undefined)?.toJSON?.()).metadata ?? {};
      const next = { ...previous, ...patch } as Record<string, unknown>;
      if (patch.bucket === null) { delete next.bucket; delete next.rank; }
      if (patch.target_window === null) delete next.target_window;
      if (readRoadmap(next).unsupported) invalid('Unsupported roadmap placement, rank or target window');
      if (readRoadmap((entity.getIn(selected, true) as Node | undefined)?.toJSON?.()).unsupported || !entity.hasIn(selected)) result = replaceValue(result, ref, selected, next);
      else {
        for (const key of ['bucket', 'rank', 'target_window']) {
          if (Object.hasOwn(next, key)) result = replaceValue(result, ref, [...selected, key], next[key]);
          else result = removeValue(result, ref, [...selected, key]);
        }
      }
      continue;
    }
    // Object forms patch supplied leaves rather than replacing unknown nested extension fields.
    if (value && typeof value === 'object' && !Array.isArray(value) && ['context', 'wip_limits'].includes(field)) {
      for (const [leaf, leafValue] of Object.entries(value)) {
        const existing = entity.getIn([...selected, leaf], true);
        if (protectedNode(existing) || isMap(existing) || (isSeq(existing) && existing.items.some(item => !isScalar(item))))
          invalid(`Structured ${field}.${leaf} requires advanced source editing`);
        result = replaceValue(result, ref, [...selected, leaf], leafValue);
      }
    } else result = replaceValue(result, ref, selected, value);
  }
  validateRawDocument(result, ref);
  return result;
}

/** Trusted lifecycle operations: callers must hold the product queue and enforce gates. */
export function recordTransition(text: string, ref: ArtifactRef, phase: string, entry: Record<string, unknown>): string {
  const { entity } = parse(text, ref);
  const history = entity.get('phase_history');
  if (history !== undefined && !isSeq(history)) invalid('Phase history must be a sequence');
  let result = editDocument(text, ref, { phase });
  // Append only the new sequence item; retain every existing audit node and surrounding byte.
  const {entity: current} = parse(result, ref);
  const node = current.get('phase_history', true);
  if (isSeq(node) && node.range) {
    if (protectedNode(node)) invalid('Anchored phase history requires source repair before transitioning');
    if (node.flow) {
      const position = node.range[1] - 1;
      result = result.slice(0,position) + (node.items.length ? ', ' : '') + scalarText(entry) + result.slice(position);
    } else {
      const indent = node.range[0] - result.lastIndexOf('\n',node.range[0] - 1) - 1;
      const position = node.range[2];
      const eol = result.includes('\r\n') ? '\r\n' : '\n';
      result = result.slice(0,position) + (result[position - 1] === '\n' ? '' : eol) + ' '.repeat(indent) + '- ' + scalarText(entry) + eol + result.slice(position);
    }
  } else result = replaceValue(result, ref, ['phase_history'], [entry]);
  return replaceValue(result, ref, ['phase_changed_at'], entry.timestamp);
}
export function acknowledgeWarnings(text: string, ref: ArtifactRef): string {
  const { entity } = parse(text, ref);
  if (!isMap(entity.get('gap_check', true))) invalid('Gap check must be a mapping');
  return replaceValue(text, ref, ['gap_check', 'warnings_acknowledged'], true);
}
