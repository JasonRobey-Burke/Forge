import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import type {
  Product, UpdateProductInput, ProductContext, WipLimits,
  Intention, UpdateIntentionInput,
  Expectation, UpdateExpectationInput,
  Spec, UpdateSpecInput,
} from '../../shared/types/index.js';

// ── Types for internal YAML document shapes ─────────────────────────────

interface YamlEntry<T> {
  data: T;
  filePath: string;
  raw: Record<string, unknown>; // original parsed YAML (for write-back)
}

interface PhaseHistoryEntry {
  from: string;
  to: string;
  timestamp: string;
  user_id?: string;
  override_reason?: string;
}

// ── Defaults ────────────────────────────────────────────────────────────

const DEFAULT_CONTEXT: ProductContext = { stack: [], patterns: [], conventions: [], auth: '' };
const DEFAULT_WIP_LIMITS: WipLimits = { draft: 5, ready: 3, in_progress: 3, review: 3, validating: 2 };

// ── YamlStore ───────────────────────────────────────────────────────────

export class YamlStore {
  private products = new Map<string, YamlEntry<Product>>();
  private intentions = new Map<string, YamlEntry<Intention>>();
  private expectations = new Map<string, YamlEntry<Expectation>>();
  private specs = new Map<string, YamlEntry<Spec>>();

  // spec_id → expectation_ids (from YAML `expectations` array)
  private specExpectations = new Map<string, string[]>();
  // spec_id → phase_history (from YAML `phase_history` array)
  private specPhaseHistory = new Map<string, PhaseHistoryEntry[]>();
  // intention_id → depends_on_ids (from YAML `dependencies` array)
  private intentionDeps = new Map<string, string[]>();

  constructor(private docsDir: string) {}

  // ── Initialization ──────────────────────────────────────────────────

  async init(): Promise<void> {
    this.scanDir(path.join(this.docsDir, 'products'), this.parseProduct.bind(this));
    this.scanDir(path.join(this.docsDir, 'intentions'), this.parseIntention.bind(this));
    this.scanDir(path.join(this.docsDir, 'expectations'), this.parseExpectation.bind(this));
    this.scanDir(path.join(this.docsDir, 'specs'), this.parseSpec.bind(this));
  }

  private scanDir(dir: string, parser: (filePath: string) => void): void {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
    for (const file of files) {
      parser(path.join(dir, file));
    }
  }

  getStats() {
    return {
      products: this.products.size,
      intentions: this.intentions.size,
      expectations: this.expectations.size,
      specs: this.specs.size,
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  /** Capitalize first letter to match Forge enum values (e.g. "critical" → "Critical") */
  private capitalizeFirst(value: string): string {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  /** Coerce a value to string[]: handles arrays, multiline strings, and nested objects */
  private toStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.map((v) => (typeof v === 'string' ? v : JSON.stringify(v)));
    }
    if (typeof value === 'string') {
      return value
        .split('\n')
        .map((line) => line.replace(/^[\s-]+/, '').trim())
        .filter((line) => line.length > 0 && !line.startsWith('#'));
    }
    if (typeof value === 'object' && value !== null) {
      const result: string[] = [];
      for (const [key, val] of Object.entries(value)) {
        if (typeof val === 'string') {
          result.push(`${key}: ${val}`);
        } else if (Array.isArray(val)) {
          result.push(...val.map((v) => (typeof v === 'string' ? `${key}: ${v}` : JSON.stringify(v))));
        } else if (typeof val === 'object' && val !== null) {
          const entries = Object.entries(val).map(([k, v]) => `${k}: ${v}`);
          result.push(`${key}: ${entries.join(', ')}`);
        }
      }
      return result;
    }
    return [];
  }

  /** Compute extras: all YAML keys not in the consumed list */
  private computeExtras(entity: Record<string, unknown>, consumedKeys: string[]): Record<string, unknown> {
    const extras: Record<string, unknown> = {};
    for (const key of Object.keys(entity)) {
      if (!consumedKeys.includes(key)) {
        extras[key] = entity[key];
      }
    }
    return extras;
  }

  /** Flatten validation.human_review: handles string[] or {area, checks}[] */
  private flattenValidationHuman(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.flatMap((item) => {
        if (typeof item === 'string') return [item];
        if (typeof item === 'object' && item !== null && item.area && Array.isArray(item.checks)) {
          return item.checks.map((c: string) => `[${item.area}] ${c}`);
        }
        return [String(item)];
      });
    }
    return this.toStringArray(value);
  }

  /** Normalize edge_cases: handles string[], or array of objects with description/scenario fields */
  private normalizeEdgeCases(value: unknown): string[] {
    if (!value || !Array.isArray(value)) return [];
    return value.map((item) => {
      if (typeof item === 'string') return item;
      if (typeof item === 'object' && item !== null) {
        // Format: { description, scenario, expected_behavior }
        const parts = [item.description, item.scenario, item.expected_behavior].filter(Boolean);
        return parts.join(': ');
      }
      return String(item);
    });
  }

  // ── Format detection ───────────────────────────────────────────────

  /**
   * Extract entity data from YAML that may use either:
   *   - Wrapped format:  `product: { id: PROD-001, ... }`
   *   - Flat format:     `id: PROD-001\nname: ...` (fields at root)
   */
  private extractEntity(raw: Record<string, any>, key: string, idPrefix: string): Record<string, any> | null {
    // Wrapped format: top-level key is an object containing the entity fields
    if (raw[key] && typeof raw[key] === 'object' && !Array.isArray(raw[key])) {
      return raw[key] as Record<string, any>;
    }
    // Flat format: entity fields are at the root, identified by ID prefix
    if (typeof raw.id === 'string' && raw.id.startsWith(idPrefix)) {
      return raw;
    }
    return null;
  }

  // ── Parsers (YAML → Forge types) ───────────────────────────────────

  parseProduct(filePath: string): void {
    const raw = this.readYaml(filePath);
    if (!raw) return;
    const p = this.extractEntity(raw, 'product', 'PROD-');
    if (!p) return;

    const techCtx = p.technical_context ?? p.context ?? {};
    const context: ProductContext = {
      stack: this.toStringArray(techCtx.stack),
      patterns: this.toStringArray(techCtx.patterns),
      conventions: this.toStringArray(techCtx.conventions),
      auth: typeof techCtx.auth === 'string' ? techCtx.auth : JSON.stringify(techCtx.auth ?? ''),
    };

    const wipRaw = p.wip_limits ?? {};
    const wipLimits: WipLimits = {
      draft: wipRaw.draft ?? DEFAULT_WIP_LIMITS.draft,
      ready: wipRaw.ready ?? DEFAULT_WIP_LIMITS.ready,
      in_progress: wipRaw.in_progress ?? DEFAULT_WIP_LIMITS.in_progress,
      review: wipRaw.review ?? DEFAULT_WIP_LIMITS.review,
      validating: wipRaw.validating ?? DEFAULT_WIP_LIMITS.validating,
    };

    const product: Product = {
      id: p.id,
      name: p.name ?? '',
      problem_statement: p.problem ?? p.problem_statement ?? '',
      vision: p.value_proposition ?? p.vision ?? '',
      target_audience: typeof p.audience === 'object'
        ? (p.audience.primary ?? p.audience.primary_users?.description ?? '')
        : (p.target_audience ?? p.audience ?? ''),
      status: this.capitalizeFirst(p.status ?? 'Active') as Product['status'],
      context,
      wip_limits: wipLimits,
      owner: p.owner ?? undefined,
      version: p.version ?? undefined,
      extras: this.computeExtras(p, [
        'id', 'name', 'problem', 'problem_statement', 'value_proposition', 'vision',
        'audience', 'target_audience', 'status', 'technical_context', 'context',
        'wip_limits', 'created_at', 'updated_at', 'archived_at', 'owner', 'version', 'created',
      ]),
      created_at: p.created_at ?? p.created ?? new Date().toISOString(),
      updated_at: p.updated_at ?? new Date().toISOString(),
      archived_at: p.archived_at ?? null,
    };

    this.products.set(product.id, { data: product, filePath, raw });
  }

  parseIntention(filePath: string): void {
    const raw = this.readYaml(filePath);
    if (!raw) return;
    const i = this.extractEntity(raw, 'intention', 'INT-');
    if (!i) return;

    const intention: Intention = {
      id: i.id,
      product_id: i.product_id ?? i.product ?? '',
      title: i.title ?? i.name ?? i.statement?.trim().split('\n')[0] ?? '',
      description: i.description ?? i.rationale ?? i.statement ?? '',
      priority: this.capitalizeFirst(i.priority ?? 'Medium') as Intention['priority'],
      status: this.capitalizeFirst(i.status ?? 'Draft') as Intention['status'],
      owner: i.owner ?? undefined,
      extras: this.computeExtras(i, [
        'id', 'product_id', 'product', 'title', 'name', 'statement', 'description',
        'rationale', 'priority', 'status', 'dependencies', 'created_at', 'updated_at',
        'archived_at', 'owner', 'created',
      ]),
      created_at: i.created_at ?? i.created ?? new Date().toISOString(),
      updated_at: i.updated_at ?? new Date().toISOString(),
      archived_at: i.archived_at ?? null,
    };

    this.intentions.set(intention.id, { data: intention, filePath, raw });
    this.intentionDeps.set(intention.id, i.dependencies ?? []);
  }

  parseExpectation(filePath: string): void {
    const raw = this.readYaml(filePath);
    if (!raw) return;
    const e = this.extractEntity(raw, 'expectation', 'EXP-');
    if (!e) return;

    const expectation: Expectation = {
      id: e.id,
      intention_id: e.intention_id ?? e.intention ?? '',
      title: e.title ?? e.name ?? e.description?.trim().split('\n')[0]?.slice(0, 100) ?? e.statement?.trim().split('\n')[0]?.slice(0, 100) ?? '',
      description: e.description ?? e.statement ?? '',
      status: this.capitalizeFirst(e.status ?? 'Draft') as Expectation['status'],
      edge_cases: this.normalizeEdgeCases(e.edge_cases),
      owner: e.owner ?? undefined,
      product_id: e.product_id ?? e.product ?? undefined,
      extras: this.computeExtras(e, [
        'id', 'intention_id', 'intention', 'title', 'name', 'description', 'statement',
        'status', 'edge_cases', 'created_at', 'updated_at', 'archived_at', 'owner',
        'product_id', 'product', 'created',
      ]),
      created_at: e.created_at ?? e.created ?? new Date().toISOString(),
      updated_at: e.updated_at ?? new Date().toISOString(),
      archived_at: e.archived_at ?? null,
    };

    this.expectations.set(expectation.id, { data: expectation, filePath, raw });
  }

  parseSpec(filePath: string): void {
    const raw = this.readYaml(filePath);
    if (!raw) return;
    const s = this.extractEntity(raw, 'spec', 'SPEC-');
    if (!s) return;

    const ctx = s.context ?? {};
    const context: ProductContext = {
      stack: this.toStringArray(ctx.stack),
      patterns: this.toStringArray(ctx.patterns),
      conventions: this.toStringArray(ctx.conventions),
      auth: typeof ctx.auth === 'string' ? ctx.auth
        : (typeof ctx.auth === 'object' && ctx.auth !== null ? JSON.stringify(ctx.auth) : ''),
    };

    const validation = s.validation ?? {};

    const spec: Spec = {
      id: s.id,
      product_id: s.product_id ?? s.product ?? '',
      title: s.title ?? '',
      description: s.description ?? '',
      phase: this.capitalizeFirst(s.status ?? s.phase ?? 'Draft') as Spec['phase'],
      complexity: this.capitalizeFirst(s.complexity ?? 'Medium') as Spec['complexity'],
      context,
      boundaries: this.flattenBoundaries(s.boundaries),
      deliverables: this.flattenDeliverables(s.deliverables),
      validation_automated: this.toStringArray(validation.automated ?? s.validation_automated ?? []),
      validation_human: this.flattenValidationHuman(validation.human_review ?? validation.human ?? s.validation_human ?? []),
      peer_reviewed: validation.peer_reviewed ?? s.peer_reviewed ?? false,
      owner: s.owner ?? undefined,
      depends_on: s.depends_on ?? undefined,
      intentions: s.intentions ?? undefined,
      extras: this.computeExtras(s, [
        'id', 'product_id', 'product', 'title', 'description', 'status', 'phase',
        'complexity', 'context', 'boundaries', 'deliverables', 'validation',
        'validation_automated', 'validation_human', 'peer_reviewed', 'expectations',
        'phase_history', 'created_at', 'updated_at', 'archived_at', 'owner',
        'depends_on', 'intentions', 'created', 'implemented',
      ]),
      phase_changed_at: s.phase_changed_at ?? s.updated_at ?? new Date().toISOString(),
      created_at: s.created_at ?? s.created ?? new Date().toISOString(),
      updated_at: s.updated_at ?? new Date().toISOString(),
      archived_at: s.archived_at ?? null,
    };

    this.specs.set(spec.id, { data: spec, filePath, raw });
    this.specExpectations.set(spec.id, s.expectations ?? []);
    this.specPhaseHistory.set(spec.id, s.phase_history ?? []);
  }

  // Boundaries: array of strings, or object with categorized arrays — preserves category labels
  private flattenBoundaries(boundaries: unknown): string[] {
    if (Array.isArray(boundaries)) return boundaries.map(String);
    if (typeof boundaries === 'object' && boundaries !== null) {
      const result: string[] = [];
      for (const [key, values] of Object.entries(boundaries)) {
        const label = key.replace(/_/g, ' ');
        if (Array.isArray(values)) {
          result.push(...values.map((v) => `[${label}] ${v}`));
        } else if (typeof values === 'string') {
          result.push(`[${label}] ${values}`);
        }
      }
      return result;
    }
    return [];
  }

  // Deliverables: array of strings, or nested object — preserves category/subcategory labels
  private flattenDeliverables(deliverables: unknown): string[] {
    if (Array.isArray(deliverables)) return deliverables.map(String);
    if (typeof deliverables === 'object' && deliverables !== null) {
      const result: string[] = [];
      for (const [category, content] of Object.entries(deliverables)) {
        const label = category.replace(/_/g, ' ');
        if (typeof content === 'string') {
          result.push(`[${label}] ${content}`);
        } else if (Array.isArray(content)) {
          result.push(...content.map((v) => `[${label}] ${typeof v === 'string' ? v : JSON.stringify(v)}`));
        } else if (typeof content === 'object' && content !== null) {
          // Nested: { description: "...", files: [...], tables: [...] }
          const desc = (content as Record<string, unknown>).description;
          if (typeof desc === 'string') result.push(`[${label}] ${desc}`);
          for (const [subKey, subVal] of Object.entries(content as Record<string, unknown>)) {
            if (subKey === 'description') continue;
            if (Array.isArray(subVal)) {
              result.push(...subVal.map((v) => `[${label}/${subKey}] ${typeof v === 'string' ? v : JSON.stringify(v)}`));
            }
          }
        }
      }
      return result;
    }
    return [];
  }

  // ── File I/O helpers ───────────────────────────────────────────────

  private readYaml(filePath: string): Record<string, any> | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return yaml.load(content) as Record<string, any>;
    } catch {
      return null;
    }
  }

  private writeYaml(filePath: string, doc: Record<string, any>): void {
    const content = yaml.dump(doc, { lineWidth: 100, noRefs: true, quotingType: '"' });
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  // ── Re-parse a single file (for file watcher) ─────────────────────

  reloadFile(filePath: string): void {
    const dir = path.basename(path.dirname(filePath));
    switch (dir) {
      case 'products': this.parseProduct(filePath); break;
      case 'intentions': this.parseIntention(filePath); break;
      case 'expectations': this.parseExpectation(filePath); break;
      case 'specs': this.parseSpec(filePath); break;
    }
  }

  removeFile(filePath: string): void {
    // Find and remove from the correct map
    for (const [id, entry] of this.products) {
      if (entry.filePath === filePath) { this.products.delete(id); return; }
    }
    for (const [id, entry] of this.intentions) {
      if (entry.filePath === filePath) { this.intentions.delete(id); this.intentionDeps.delete(id); return; }
    }
    for (const [id, entry] of this.expectations) {
      if (entry.filePath === filePath) { this.expectations.delete(id); return; }
    }
    for (const [id, entry] of this.specs) {
      if (entry.filePath === filePath) { this.specs.delete(id); this.specExpectations.delete(id); this.specPhaseHistory.delete(id); return; }
    }
  }

  // ── Product operations ─────────────────────────────────────────────

  listProducts(): Product[] {
    return Array.from(this.products.values())
      .map((e) => e.data)
      .filter((p) => !p.archived_at)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  getProduct(id: string): Product | null {
    const entry = this.products.get(id);
    if (!entry || entry.data.archived_at) return null;
    return entry.data;
  }

  updateProduct(id: string, input: UpdateProductInput): Product | null {
    const entry = this.products.get(id);
    if (!entry || entry.data.archived_at) return null;

    const data = entry.data;
    if (input.name !== undefined) data.name = input.name;
    if (input.problem_statement !== undefined) data.problem_statement = input.problem_statement;
    if (input.vision !== undefined) data.vision = input.vision;
    if (input.target_audience !== undefined) data.target_audience = input.target_audience;
    if (input.status !== undefined) data.status = input.status;
    if (input.context !== undefined) data.context = input.context;
    if (input.wip_limits !== undefined) data.wip_limits = input.wip_limits;
    data.updated_at = new Date().toISOString();

    this.writeProductYaml(entry);
    return data;
  }

  private writeProductYaml(entry: YamlEntry<Product>): void {
    const p = entry.data;
    const doc = {
      product: {
        id: p.id,
        name: p.name,
        status: p.status,
        problem: p.problem_statement,
        value_proposition: p.vision,
        audience: { primary: p.target_audience },
        technical_context: {
          stack: p.context.stack,
          patterns: p.context.patterns,
          conventions: p.context.conventions,
          auth: p.context.auth,
        },
        wip_limits: p.wip_limits,
        ...(p.owner ? { owner: p.owner } : {}),
        ...(p.version ? { version: p.version } : {}),
        ...p.extras,
        created_at: p.created_at,
        updated_at: p.updated_at,
      },
    };
    this.writeYaml(entry.filePath, doc);
  }

  // ── Intention operations ───────────────────────────────────────────

  listIntentions(productId: string): Intention[] {
    return Array.from(this.intentions.values())
      .map((e) => e.data)
      .filter((i) => i.product_id === productId && !i.archived_at)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  getIntention(id: string): (Intention & { dependencies?: Array<{ id: string; title: string; status: string }> }) | null {
    const entry = this.intentions.get(id);
    if (!entry || entry.data.archived_at) return null;

    const depIds = this.intentionDeps.get(id) ?? [];
    const dependencies = depIds
      .map((depId) => this.intentions.get(depId)?.data)
      .filter((d): d is Intention => !!d && !d.archived_at)
      .map((d) => ({ id: d.id, title: d.title, status: d.status }));

    return { ...entry.data, dependencies };
  }

  updateIntention(id: string, input: UpdateIntentionInput): Intention | null {
    const entry = this.intentions.get(id);
    if (!entry || entry.data.archived_at) return null;

    const data = entry.data;
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.status !== undefined) data.status = input.status;
    data.updated_at = new Date().toISOString();

    this.writeIntentionYaml(entry);
    return data;
  }

  private writeIntentionYaml(entry: YamlEntry<Intention>): void {
    const i = entry.data;
    const doc = {
      intention: {
        id: i.id,
        product_id: i.product_id,
        title: i.title,
        description: i.description,
        priority: i.priority,
        status: i.status,
        dependencies: this.intentionDeps.get(i.id) ?? [],
        ...(i.owner ? { owner: i.owner } : {}),
        ...i.extras,
        created_at: i.created_at,
        updated_at: i.updated_at,
      },
    };
    this.writeYaml(entry.filePath, doc);
  }

  // ── Intention dependency operations ────────────────────────────────

  getIntentionDeps(intentionId: string): string[] {
    return this.intentionDeps.get(intentionId) ?? [];
  }

  getAllDependencyEdges(productId: string): Array<{ intention_id: string; depends_on_id: string }> {
    const edges: Array<{ intention_id: string; depends_on_id: string }> = [];
    for (const [intentionId, depIds] of this.intentionDeps) {
      const intention = this.intentions.get(intentionId);
      if (intention && intention.data.product_id === productId && !intention.data.archived_at) {
        for (const depId of depIds) {
          edges.push({ intention_id: intentionId, depends_on_id: depId });
        }
      }
    }
    return edges;
  }

  addIntentionDep(intentionId: string, dependsOnId: string): void {
    const deps = this.intentionDeps.get(intentionId) ?? [];
    if (!deps.includes(dependsOnId)) {
      deps.push(dependsOnId);
      this.intentionDeps.set(intentionId, deps);
      const entry = this.intentions.get(intentionId);
      if (entry) this.writeIntentionYaml(entry);
    }
  }

  removeIntentionDep(intentionId: string, dependsOnId: string): boolean {
    const deps = this.intentionDeps.get(intentionId) ?? [];
    const idx = deps.indexOf(dependsOnId);
    if (idx === -1) return false;
    deps.splice(idx, 1);
    this.intentionDeps.set(intentionId, deps);
    const entry = this.intentions.get(intentionId);
    if (entry) this.writeIntentionYaml(entry);
    return true;
  }

  // ── Expectation operations ─────────────────────────────────────────

  listExpectations(intentionId: string): Expectation[] {
    return Array.from(this.expectations.values())
      .map((e) => e.data)
      .filter((e) => e.intention_id === intentionId && !e.archived_at)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  getExpectation(id: string): Expectation | null {
    const entry = this.expectations.get(id);
    if (!entry || entry.data.archived_at) return null;
    return entry.data;
  }

  updateExpectation(id: string, input: UpdateExpectationInput): Expectation | null {
    const entry = this.expectations.get(id);
    if (!entry || entry.data.archived_at) return null;

    const data = entry.data;
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.status !== undefined) data.status = input.status;
    if (input.edge_cases !== undefined) data.edge_cases = input.edge_cases;
    data.updated_at = new Date().toISOString();

    this.writeExpectationYaml(entry);
    return data;
  }

  private writeExpectationYaml(entry: YamlEntry<Expectation>): void {
    const e = entry.data;
    const doc = {
      expectation: {
        id: e.id,
        intention_id: e.intention_id,
        title: e.title,
        description: e.description,
        status: e.status,
        edge_cases: e.edge_cases,
        ...(e.owner ? { owner: e.owner } : {}),
        ...(e.product_id ? { product_id: e.product_id } : {}),
        ...e.extras,
        created_at: e.created_at,
        updated_at: e.updated_at,
      },
    };
    this.writeYaml(entry.filePath, doc);
  }

  // ── Spec operations ────────────────────────────────────────────────

  listSpecs(productId: string): Spec[] {
    return Array.from(this.specs.values())
      .map((e) => e.data)
      .filter((s) => s.product_id === productId && !s.archived_at)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  getSpec(id: string): Spec | null {
    const entry = this.specs.get(id);
    if (!entry || entry.data.archived_at) return null;
    return entry.data;
  }

  updateSpec(id: string, input: UpdateSpecInput): Spec | null {
    const entry = this.specs.get(id);
    if (!entry || entry.data.archived_at) return null;

    const data = entry.data;
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.phase !== undefined) data.phase = input.phase;
    if (input.complexity !== undefined) data.complexity = input.complexity;
    if (input.context !== undefined) data.context = input.context;
    if (input.boundaries !== undefined) data.boundaries = input.boundaries;
    if (input.deliverables !== undefined) data.deliverables = input.deliverables;
    if (input.validation_automated !== undefined) data.validation_automated = input.validation_automated;
    if (input.validation_human !== undefined) data.validation_human = input.validation_human;
    if (input.peer_reviewed !== undefined) data.peer_reviewed = input.peer_reviewed;
    data.updated_at = new Date().toISOString();

    this.writeSpecYaml(entry);
    return data;
  }

  linkExpectations(specId: string, expectationIds: string[]): boolean {
    const entry = this.specs.get(specId);
    if (!entry || entry.data.archived_at) return false;
    this.specExpectations.set(specId, expectationIds);
    this.writeSpecYaml(entry);
    return true;
  }

  getSpecExpectations(specId: string): Array<{ id: string; title: string; description: string; status: string; edge_cases: string[] }> {
    const ids = this.specExpectations.get(specId) ?? [];
    return ids
      .map((eid) => this.expectations.get(eid)?.data)
      .filter((e): e is Expectation => !!e)
      .map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        status: e.status,
        edge_cases: e.edge_cases,
      }));
  }

  countSpecsByPhase(productId: string, phase: string): number {
    return Array.from(this.specs.values())
      .filter((e) => e.data.product_id === productId && e.data.phase === phase && !e.data.archived_at)
      .length;
  }

  // ── Phase transition operations ────────────────────────────────────

  getPhaseHistory(specId: string): PhaseHistoryEntry[] {
    return this.specPhaseHistory.get(specId) ?? [];
  }

  addPhaseTransition(specId: string, from: string, to: string, userId: string, overrideReason?: string): void {
    const entry = this.specs.get(specId);
    if (!entry) return;

    const history = this.specPhaseHistory.get(specId) ?? [];
    history.push({
      from,
      to,
      timestamp: new Date().toISOString(),
      user_id: userId,
      override_reason: overrideReason,
    });
    this.specPhaseHistory.set(specId, history);

    entry.data.phase = to as Spec['phase'];
    entry.data.phase_changed_at = new Date().toISOString();
    entry.data.updated_at = new Date().toISOString();

    this.writeSpecYaml(entry);
  }

  // ── Staleness detection ────────────────────────────────────────────

  checkSpecStaleness(specId: string): { stale: boolean; staleExpectationIds: string[] } {
    const NOT_STALE = { stale: false, staleExpectationIds: [] };

    const spec = this.getSpec(specId);
    if (!spec || spec.phase === 'Draft') return NOT_STALE;

    const history = this.specPhaseHistory.get(specId) ?? [];
    const gateTransition = [...history]
      .reverse()
      .find((h) => h.from === 'Draft' && h.to === 'Ready');
    if (!gateTransition) return NOT_STALE;

    const gateTime = gateTransition.timestamp;
    const expIds = this.specExpectations.get(specId) ?? [];
    const staleIds = expIds.filter((eid) => {
      const exp = this.expectations.get(eid)?.data;
      return exp && exp.updated_at > gateTime;
    });

    return { stale: staleIds.length > 0, staleExpectationIds: staleIds };
  }

  getStaleSpecIds(productId: string): string[] {
    const staleIds: string[] = [];
    for (const entry of this.specs.values()) {
      if (entry.data.product_id === productId && !entry.data.archived_at && entry.data.phase !== 'Draft') {
        const result = this.checkSpecStaleness(entry.data.id);
        if (result.stale) staleIds.push(entry.data.id);
      }
    }
    return staleIds;
  }

  // ── Spec YAML write-back ───────────────────────────────────────────

  private writeSpecYaml(entry: YamlEntry<Spec>): void {
    const s = entry.data;
    const expIds = this.specExpectations.get(s.id) ?? [];
    const history = this.specPhaseHistory.get(s.id) ?? [];

    // Build expectations_detail from linked expectations
    const expectationsDetail = expIds
      .map((eid) => this.expectations.get(eid)?.data)
      .filter((e): e is Expectation => !!e)
      .map((e) => ({
        id: e.id,
        description: e.description,
        edge_cases: e.edge_cases,
      }));

    const doc = {
      spec: {
        id: s.id,
        product_id: s.product_id,
        title: s.title,
        description: s.description,
        status: s.phase,
        complexity: s.complexity,
        ...(s.owner ? { owner: s.owner } : {}),
        ...(s.depends_on?.length ? { depends_on: s.depends_on } : {}),
        ...(s.intentions?.length ? { intentions: s.intentions } : {}),
        expectations: expIds,
        context: {
          stack: s.context.stack,
          patterns: s.context.patterns,
          conventions: s.context.conventions,
          auth: s.context.auth,
        },
        expectations_detail: expectationsDetail.length > 0 ? expectationsDetail : undefined,
        boundaries: s.boundaries,
        deliverables: s.deliverables,
        validation: {
          automated: s.validation_automated,
          human: s.validation_human,
          peer_reviewed: s.peer_reviewed,
        },
        phase_history: history.length > 0 ? history : undefined,
        ...s.extras,
        created_at: s.created_at,
        updated_at: s.updated_at,
      },
    };
    this.writeYaml(entry.filePath, doc);
  }
}

// ── Singleton ─────────────────────────────────────────────────────────

let store: YamlStore | null = null;

export function getStore(): YamlStore {
  if (!store) throw new Error('YamlStore not initialized. Call initStore() first.');
  return store;
}

export async function initStore(docsDir: string): Promise<YamlStore> {
  store = new YamlStore(docsDir);
  await store.init();
  return store;
}
