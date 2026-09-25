import { recoverArtifactTransactions } from './artifactTransaction.js';
import { readRoadmap } from '../../shared/lib/roadmap.js';
import type { WorkspaceSnapshot, WorkspaceConcern, EvidenceRef } from '../../shared/types/workspace.js';
import type { Versioned } from '../../shared/types/source.js';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import type {
  Product, UpdateProductInput, ProductContext, WipLimits,
  Intention, UpdateIntentionInput,
  Expectation, UpdateExpectationInput,
  Spec, UpdateSpecInput,
} from '../../shared/types/index.js';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import type { ArtifactRef, ArtifactType, SourceMeta } from '../../shared/types/source.js';
import { ArtifactError, editDocument, inspectDocument, validateRawDocument, recordTransition, acknowledgeWarnings } from './artifactDocument.js';
import { readArtifact, sourceRevision, commitArtifact, withProductMutation, assertArtifactWritable, recoveryPaths } from './artifactFiles.js';
import { ProductStatus, IntentionStatus, ExpectationStatus, Priority, Complexity, SpecPhase } from '../../shared/types/enums.js';
import { updateProductSchema, updateIntentionSchema, updateExpectationSchema, updateSpecSchema } from '../../shared/schemas/index.js';
import { normalizeGapCheck } from '../../shared/lib/gapCheck.js';

// ── Types for internal YAML document shapes ─────────────────────────────

interface YamlEntry<T> {
  data: T;
  filePath: string;
  text: string;
  raw: Record<string, unknown>; // original parsed YAML (for write-back)
}

interface PhaseHistoryEntry {
  from: string;
  to: string;
  timestamp: string;
  user_id?: string;
  override_reason?: string;
}

export interface ParseError {
  filePath: string;
  message: string;
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

  // Parse failures collected during scan + live re-parses, exposed via getStats() / /api/health
  private parseErrors: ParseError[] = [];
  private recoveryConcerns: WorkspaceConcern[] = [];

  private sourceTexts = new Map<string, string>();
  private knownSources = new Map<string, { filePath: string; text: string }>();
  private sourceIdentities = new Map<string, {ref: ArtifactRef; entity: Record<string, any>}>();
  private workspaceRecords = new Map<string, { ref: ArtifactRef; data: Product | Intention | Expectation | Spec; text: string }>();
  private publishingText: string | undefined;
  private readonly repositoryId: string;
  constructor(private docsDir: string) {
    this.repositoryId = createHash('sha256').update(fs.realpathSync(docsDir)).digest('hex');
  }

  /** Synchronous copy of a single published generation; no file reads or writes. */
  /** Read-only root access for the confined evidence inventory. */
  getDocsRoot(): string { return this.docsDir; }

  getWorkspaceSnapshot(productId: string): WorkspaceSnapshot | null {
    const recoveryDiagnostics:WorkspaceConcern[]=recoveryPaths(this.docsDir).map(relative=>({key:`recovery:${relative}`,code:'RECOVERY_REQUIRED',entity:{type:path.dirname(relative) as ArtifactType,id:relative},message:`Recovery required for ${relative}; published source may be incomplete`,related:[],kind:'unknown'}));
    const records = [...this.workspaceRecords.entries()];
    const selectedProduct = records.find(([, r]) => r.ref.type === 'products' && r.ref.id === productId);
    if (!selectedProduct) return null;
    const productIds = new Set<string>([productId]);
    const intentionIds = new Set<string>();
    const expectationIds = new Set<string>();
    const specIds = new Set<string>();
    const ids = (value: unknown): string[] => Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
    const rawFor = (file: string) => this.sourceIdentities.get(file)?.entity ?? {};
    for (const [file, r] of records) {
      const raw = rawFor(file);
      if (r.ref.type === 'intentions' && (r.data as Intention).product_id === productId) intentionIds.add(r.ref.id);
      if (r.ref.type === 'specs' && (r.data as Spec).product_id === productId) {
        specIds.add(r.ref.id);
        ids(raw.expectation_ids ?? raw.expectations).forEach(id => expectationIds.add(id));
        ids(raw.intentions).forEach(id => intentionIds.add(id));
      }
    }
    // Product/intention child annotations also retain otherwise orphaned records.
    ids(rawFor(selectedProduct[0]).intentions).forEach(id => intentionIds.add(id));
    for (const [file, r] of records) if (r.ref.type === 'intentions' && intentionIds.has(r.ref.id)) {
      ids(rawFor(file).expectations).forEach(id => expectationIds.add(id));
    }
    for (const [, r] of records) if (r.ref.type === 'expectations') {
      const e = r.data as Expectation;
      if (intentionIds.has(e.intention_id) || e.product_id === productId) expectationIds.add(e.id);
    }
    for (const [file, r] of records) if (r.ref.type === 'specs') {
      const raw = rawFor(file);
      if (ids(raw.expectation_ids ?? raw.expectations).some(id => expectationIds.has(id)) || ids(raw.intentions).some(id => intentionIds.has(id))) specIds.add(r.ref.id);
    }
    // Include the immediate context of selected links without pulling in unrelated descendants.
    const dependencyIds = new Set<string>();
    const specDependencyIds = new Set<string>();
    for (const [file, r] of records) {
      if (r.ref.type === 'intentions' && intentionIds.has(r.ref.id)) ids(rawFor(file).dependencies).forEach(id => dependencyIds.add(id));
      if (r.ref.type === 'specs' && specIds.has(r.ref.id)) {
        ids(rawFor(file).depends_on).forEach(id => specDependencyIds.add(id));
        ids(rawFor(file).expectation_ids ?? rawFor(file).expectations).forEach(id => expectationIds.add(id));
        ids(rawFor(file).intentions).forEach(id => dependencyIds.add(id));
      }
    }
    for (const [, r] of records) if (r.ref.type === 'expectations' && expectationIds.has(r.ref.id)) dependencyIds.add((r.data as Expectation).intention_id);
    dependencyIds.forEach(id => intentionIds.add(id));
    specDependencyIds.forEach(id => specIds.add(id));
    // Follow references from contextual records too, without loading unrelated children.
    const groups = new Map<string, typeof records>();
    for (const record of records) {
      const key = `${record[1].ref.type}/${record[1].ref.id}`;
      const group = groups.get(key) ?? []; group.push(record); groups.set(key, group);
    }
    const scope = {products:productIds, intentions:intentionIds, expectations:expectationIds, specs:specIds};
    const pending: ArtifactRef[] = [];
    for (const type of ['intentions','expectations','specs'] as const) for (const id of scope[type]) pending.push({type,id});
    const include = (type: ArtifactType, id: string) => {
      if (!scope[type].has(id)) { scope[type].add(id); pending.push({type,id}); }
    };
    for (let cursor = 0; cursor < pending.length; cursor++) {
      const ref = pending[cursor];
      for (const [file, r] of groups.get(`${ref.type}/${ref.id}`) ?? []) {
        const raw = rawFor(file);
        if (r.ref.type === 'expectations') include('intentions', (r.data as Expectation).intention_id);
        if (r.ref.type === 'intentions') ids(raw.dependencies).forEach(id => include('intentions',id));
        if (r.ref.type === 'specs') {
          ids(raw.depends_on).forEach(id => include('specs',id));
          ids(raw.intentions).forEach(id => include('intentions',id));
          ids(raw.expectation_ids ?? raw.expectations).forEach(id => include('expectations',id));
        }
      }
    }
    const selected = records.filter(([, r]) => ({products:productIds, intentions:intentionIds, expectations:expectationIds, specs:specIds}[r.ref.type]).has(r.ref.id));
    const repository_id = this.repositoryId;
    const version = <T>([file, r]: typeof records[number]): Versioned<T> => ({ data: structuredClone(r.data) as T,
      source: { repository_id, revision: sourceRevision(r.text), path: path.relative(this.docsDir, file), ...inspectDocument(r.text, r.ref) } });
    const diagnostics: WorkspaceConcern[] = this.parseErrors.map(e => {
      const identity = this.sourceIdentities.get(e.filePath);
      const type = path.basename(path.dirname(e.filePath)) as ArtifactType;
      const entity = identity?.ref ?? {type, id:path.relative(this.docsDir,e.filePath)};
      const code = e.message.startsWith('Duplicate artifact ID:') ? 'DUPLICATE_ID' : 'PARSE_ERROR';
      return {key:`${code}:${e.filePath}`,code,entity,message:`${path.relative(this.docsDir,e.filePath)}: ${e.message}`,related:[],kind:'unknown'};
    });
    const spec_expectation_ids: Record<string,string[]> = {};
    const intention_dependency_ids: Record<string,string[]> = {};
    const evidence: EvidenceRef[] = [];
    for (const [file, r] of selected) {
      const raw = rawFor(file);
      if (r.ref.type === 'specs') {
        spec_expectation_ids[r.ref.id] = [...new Set([...(spec_expectation_ids[r.ref.id] ?? []), ...ids(raw.expectation_ids ?? raw.expectations)])];
        const report = (r.data as Spec).gap_check?.report;
        // Availability is intentionally unresolved until the evidence inventory stage.
        if (report) evidence.push({path:report,spec_ids:[r.ref.id],expectation_ids:[],kind:'gap-check',availability:'unknown',result:'unknown'});
      }
      if (r.ref.type === 'intentions') {
        intention_dependency_ids[r.ref.id] = [...new Set([...(intention_dependency_ids[r.ref.id] ?? []), ...ids(raw.dependencies)])];
        for (const id of new Set(ids(raw.expectations))) if (!groups.has(`expectations/${id}`)) {
          const code = `MISSING_expectations_${id}`;
          diagnostics.push({key:`${code}:intentions:${r.ref.id}`,code,entity:r.ref,
            message:`Missing relationship target ${id}`,related:[{type:'expectations',id}],kind:'attention'});
        }
      }
    }
    return {product:version<Product>(selectedProduct),
      intentions:selected.filter(([,r])=>r.ref.type==='intentions').map(r=>version<Intention>(r)),
      expectations:selected.filter(([,r])=>r.ref.type==='expectations').map(r=>version<Expectation>(r)),
      specs:selected.filter(([,r])=>r.ref.type==='specs').map(r=>version<Spec>(r)),
      spec_expectation_ids,intention_dependency_ids,evidence,diagnostics:structuredClone([...diagnostics,...this.recoveryConcerns,...recoveryDiagnostics])};
  }

  getSource(ref: ArtifactRef): SourceMeta | null {
    const entry = this.knownSources.get(`${ref.type}/${ref.id}`);
    if (!entry) return null;
    return { repository_id: this.repositoryId,
      revision: sourceRevision(entry.text), path: path.relative(this.docsDir, entry.filePath),
      ...inspectDocument(entry.text, ref) };
  }
  private invalid(message: string): never { throw new ArtifactError('VALIDATION_ERROR', message, 422); }
  private checkRevision(ref: ArtifactRef, revision: string): { filePath: string; text: string } {
    if (!revision) throw new ArtifactError('PRECONDITION_REQUIRED', 'Reload the artifact to obtain its source revision', 428);
    const entry = this.knownSources.get(`${ref.type}/${ref.id}`);
    if(entry)assertArtifactWritable(this.docsDir,path.relative(this.docsDir,entry.filePath));
    const matching = [...this.sourceIdentities.values()].filter(v => v.ref.type === ref.type && v.ref.id === ref.id);
    if (matching.length > 1) this.invalid('Duplicate artifact ID; repair the source files before editing');
    if (!entry) throw new ArtifactError('REVISION_CONFLICT', 'Artifact is missing; reload and compare your draft', 409);
    try {
      if (sourceRevision(entry.text) !== revision || readArtifact(this.docsDir, path.relative(this.docsDir, entry.filePath)).revision !== revision)
        throw new Error('changed');
    } catch { throw new ArtifactError('REVISION_CONFLICT', 'File changed or was deleted; reload and compare your draft', 409); }
    return entry;
  }
  // minimal: serialize the repository, including watcher publication. Split by product when throughput warrants it.
  private async mutate<T>(ref: ArtifactRef, revision: string, work: (entry: {filePath: string; text: string}) => Promise<T>): Promise<T> {
    return withProductMutation(fs.realpathSync(this.docsDir), async () => {
      const entry = this.checkRevision(ref, revision);
      // Check the stale target before refreshing any index inputs. Every gate sees fresh peer files.
      this.refreshInputs(entry.filePath);
      return work(entry);
    });
  }
  private refreshInputs(excluded: string): void {
    for (const type of ['products','intentions','expectations','specs']) {
      const directory = path.join(this.docsDir, type);
      if (!fs.existsSync(directory)) continue;
      const live = new Set(fs.readdirSync(directory).filter(f => /\.ya?ml$/.test(f) && !f.startsWith('.')).map(f => path.join(directory, f)));
      for (const entry of this.knownSources.values()) {
        if (path.dirname(entry.filePath) === directory && entry.filePath !== excluded && !live.has(entry.filePath)) {
          try{assertArtifactWritable(this.docsDir,path.relative(this.docsDir,entry.filePath));}catch{continue;}
          this.removeFile(entry.filePath);
        }
      }
      for (const file of live) if (file !== excluded) {
        try{assertArtifactWritable(this.docsDir,path.relative(this.docsDir,file));}catch{continue;}
        this.reloadFile(file);
      }
    }
  }
  async applyFileEvent(event: string, filePath: string): Promise<boolean> {
    return withProductMutation(fs.realpathSync(this.docsDir), async () => {
      try{assertArtifactWritable(this.docsDir,path.relative(this.docsDir,filePath));}catch{return false;}
      const before = this.sourceTexts.get(filePath);
      if (event === 'unlink') { this.removeFile(filePath); return before !== undefined; }
      this.reloadFile(filePath);
      return before !== this.sourceTexts.get(filePath);
    });
  }
  /** Reconcile inventory under the same queue as writes, without parsing unchanged bytes.
   * Observation belongs to the watcher: a committed local save still notifies other pages.
   */
  async reconcileFiles(observed: Map<string, string>): Promise<Array<{event: string; filePath: string}>> {
    return withProductMutation(fs.realpathSync(this.docsDir), async () => {
      const changes: Array<{event: string; filePath: string}> = [];
      const live = new Set<string>();
      for (const type of ['products','intentions','expectations','specs']) {
        const directory = path.join(this.docsDir, type);
        let names: string[];
        try { names = fs.readdirSync(directory); }
        catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue; throw error; }
        for (const name of names) if (/\.ya?ml$/i.test(name) && !name.startsWith('.')) live.add(path.join(directory,name));
      }
      const known = new Set([...observed.keys(), ...this.sourceTexts.keys(), ...this.parseErrors.map(e=>e.filePath)]);
      for (const filePath of new Set([...live, ...known])) {
        const relative = path.relative(this.docsDir,filePath);
        try { assertArtifactWritable(this.docsDir,relative); } catch { continue; }
        if (!live.has(filePath)) {
          this.removeFile(filePath);
          if (observed.delete(filePath)) changes.push({event:'unlink',filePath});
          continue;
        }
        let text: string;
        try { text = readArtifact(this.docsDir,relative).text; }
        catch (error) {
          const fingerprint = `unreadable:${String(error)}`;
          if (observed.get(filePath) !== fingerprint) {
            this.removeFile(filePath);
            this.parseErrors.push({filePath,message:String(error)});
            changes.push({event:observed.has(filePath)?'change':'add',filePath});
            observed.set(filePath,fingerprint);
          }
          continue;
        }
        if (this.sourceTexts.get(filePath) !== text) {
          this.publishingText = text;
          try { this.reloadFile(filePath); } finally { this.publishingText = undefined; }
        }
        if (observed.get(filePath) !== text) {
          changes.push({event:observed.has(filePath)?'change':'add',filePath});
          observed.set(filePath,text);
        }
      }
      return changes;
    });
  }
  private async commit(ref: ArtifactRef, entry: { filePath: string }, revision: string, transform: (text: string) => string): Promise<void> {
    const result = await commitArtifact({ root: this.docsDir, relativePath: path.relative(this.docsDir, entry.filePath), expectedRevision: revision, transform: text => {
      const next = transform(text);
      // Prove the committed document can be indexed before replacing the real source.
      const candidate = new YamlStore(this.docsDir);
      candidate.publishingText = next;
      candidate.reloadFile(entry.filePath);
      if (candidate.getParseErrors().length || !candidate.getEntryByTypeAndId(ref.type,ref.id))
        this.invalid('Candidate cannot be read as this artifact; correct its field shapes before saving');
      return next;
    } });
    // Publish exactly the committed bytes, never a second, racing read from disk.
    this.publishingText = result.text;
    try { this.reloadFile(entry.filePath); } finally { this.publishingText = undefined; }
  }
  /** Hold through fresh graph checks, the complete set commit, and publication. */
  async mutateArtifactSet<T>(work:()=>Promise<T>):Promise<T> {
    return withProductMutation(fs.realpathSync(this.docsDir),async()=>{this.refreshInputs('');return work();});
  }
  validateCandidate(ref:ArtifactRef, relative:string, text:string):void {
    validateRawDocument(text,ref);
    const candidate=new YamlStore(this.docsDir);candidate.publishingText=text;candidate.reloadFile(path.join(this.docsDir,relative));
    if(candidate.getParseErrors().length || !candidate.getEntryByTypeAndId(ref.type,ref.id))this.invalid('Candidate cannot be indexed');
  }
  publishArtifactSet(changes:{path:string;text:string}[]):void {
    for(const change of changes) {this.publishingText=change.text;try{this.reloadFile(path.join(this.docsDir,change.path));}finally{this.publishingText=undefined;}}
  }
  private registerSource(ref: ArtifactRef, entity: Record<string, any>, filePath: string): boolean {
    this.sourceIdentities.set(filePath,{ref,entity:structuredClone(entity)});
    const duplicates = [...this.sourceIdentities.entries()].filter(([,v]) => v.ref.type === ref.type && v.ref.id === ref.id);
    if (duplicates.length > 1) {
      for (const [duplicate] of duplicates) {
        this.parseErrors = this.parseErrors.filter(e => e.filePath !== duplicate);
        this.parseErrors.push({filePath:duplicate,message:`Duplicate artifact ID: ${ref.id}`});
      }
      this[ref.type].delete(ref.id);
      return false;
    }
    return true;
  }
  private requireGraph(): void {
    if (this.parseErrors.length) this.invalid('Repair unreadable or duplicate artifact sources before evaluating relationships or transition gates');
  }
  private sourceEntity(text: string, ref: ArtifactRef): Record<string, any> {
    const doc = yaml.load(text, {json:true}) as Record<string, any>;
    const key = ref.type.slice(0,-1);
    return doc[key] && typeof doc[key] === 'object' ? doc[key] : doc;
  }
  private validateChanges(ref: ArtifactRef, changes: Record<string, unknown>, original: string, verifiedEntity?: Record<string, any>): void {
    const entity = verifiedEntity ?? this.sourceEntity(original, ref);
    const statuses = { products: ProductStatus, intentions: IntentionStatus, expectations: ExpectationStatus, specs: SpecPhase };
    for (const key of ['status','phase','priority','complexity']) {
      if (!(key in changes)) continue;
      const allowed = key === 'priority' ? Priority : key === 'complexity' ? Complexity : statuses[ref.type];
      const value = changes[key];
      if (!Object.values(allowed).some(v => this.capitalizeFirst(String(value)) === v)) this.invalid(`Unknown ${key}: ${value}`);
    }
    if (ref.type === 'expectations' && ('status' in changes || 'deferred_reason' in changes) && this.capitalizeFirst(String(changes.status ?? entity.status)) === 'Deferred' && !String(('deferred_reason' in changes ? changes.deferred_reason : entity.deferred_reason) ?? '').trim()) this.invalid('A deferred reason is required');
    if (ref.type === 'specs' && ('phase' in changes || 'status' in changes)) {
      if (this.capitalizeFirst(String(changes.phase ?? changes.status)) !== this.capitalizeFirst(entity.phase ?? entity.status ?? 'Draft')) this.invalid('Phase changes must use the transition action');
      delete changes.phase; delete changes.status;
    }
    for (const [alias, canonical] of [['product','product_id'],['intention','intention_id']]) {
      if (alias in changes || canonical in changes) this.invalid('Parent identity cannot change in an ordinary edit');
    }
    this.validateRelations(ref, changes);
  }
  private validateRelations(ref: ArtifactRef, changes: Record<string, unknown>): void {
    const current = this.getEntryByTypeAndId(ref.type,ref.id)?.data as {product_id?:string;intention_id?:string} | undefined;
    const product = ref.type === 'products' ? ref.id : current?.product_id ?? this.getIntention(current?.intention_id ?? '')?.product_id;
    const rules: [string, ArtifactType][] = ref.type === 'intentions' ? [['dependencies','intentions']] : ref.type === 'specs' ? [['intentions','intentions'],['depends_on','specs'],['expectations','expectations'],['expectation_ids','expectations']] : [];
    for (const [field, type] of rules) {
      if (!(field in changes)) continue;
      this.requireGraph();
      const ids = changes[field];
      if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string' || !id.trim() || id !== id.trim()) || new Set(ids).size !== ids.length) this.invalid(`${field} must contain distinct artifact IDs`);
      for (const id of ids as string[]) {
        if (type === ref.type && id === ref.id) this.invalid('Self-reference is not allowed');
        const target = this.getEntryByTypeAndId(type,id)?.data as {product_id?:string;intention_id?:string;archived_at?:string} | undefined;
        const parentProduct = type === 'expectations' ? this.getIntention(target?.intention_id ?? '')?.product_id : target?.product_id;
        if (!target || target.archived_at || !product || parentProduct !== product || (type === 'expectations' && target.product_id && target.product_id !== product)) this.invalid(`Missing or cross-product ${field} link: ${id}`);
        if (type === ref.type) {
          const seen = new Set<string>(); const pending = [id];
          while (pending.length) {
            const next = pending.pop()!;
            if (next === ref.id) this.invalid('Adding this dependency would create a circular reference');
            if (seen.has(next)) continue; seen.add(next);
            pending.push(...(type === 'intentions' ? this.getIntentionDeps(next) : this.getSpec(next)?.depends_on ?? []));
          }
        }
      }
    }
  }
  private async update(ref: ArtifactRef, input: object, revision: string): Promise<void> {
    await this.mutate(ref, revision, async entry => {
      const schemas = { products: updateProductSchema, intentions: updateIntentionSchema, expectations: updateExpectationSchema, specs: updateSpecSchema };
      const parsed = schemas[ref.type].safeParse(input);
      if (!parsed.success) this.invalid(parsed.error.message);
      const changes = { ...parsed.data } as Record<string, unknown>;
      this.validateChanges(ref, changes, entry.text);
      await this.commit(ref, entry, revision, text => {
        const next = editDocument(text, ref, changes);
        return next === text ? text : editDocument(next, ref, {updated_at:new Date().toISOString()});
      });
    });
  }

  // ── Initialization ──────────────────────────────────────────────────

  async init(): Promise<void> {
    this.recoveryConcerns = await recoverArtifactTransactions(this.docsDir);
    this.scanDir(path.join(this.docsDir, 'products'), this.parseProduct.bind(this));
    this.scanDir(path.join(this.docsDir, 'intentions'), this.parseIntention.bind(this));
    this.scanDir(path.join(this.docsDir, 'expectations'), this.parseExpectation.bind(this));
    this.scanDir(path.join(this.docsDir, 'specs'), this.parseSpec.bind(this));
  }

  private scanDir(dir: string, parser: (filePath: string) => void): void {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
    for (const file of files) {
      const filePath = path.join(dir,file);
      try { parser(filePath); } catch (error) { this.parseErrors.push({filePath,message:String(error)}); }
    }
  }

  getStats() {
    return {
      products: this.products.size,
      intentions: this.intentions.size,
      expectations: this.expectations.size,
      specs: this.specs.size,
      parseErrors: [...this.parseErrors],
    };
  }

  getParseErrors(): ParseError[] {
    return [...this.parseErrors];
  }

  // ── Raw YAML access (for full-file editing) ────────────────────────

  private getEntryByTypeAndId(type: string, id: string): YamlEntry<unknown> | null {
    switch (type) {
      case 'products': return this.products.get(id) ?? null;
      case 'intentions': return this.intentions.get(id) ?? null;
      case 'expectations': return this.expectations.get(id) ?? null;
      case 'specs': return this.specs.get(id) ?? null;
      default: return null;
    }
  }

  getRawFileContent(type: string, id: string): string | null {
    const entry = this.knownSources.get(`${type}/${id}`);
    if (!entry) return null;
    try {
      return this.knownSources.get(`${type}/${id}`)?.text ?? null;
    } catch {
      return null;
    }
  }

  async saveRawFileContent(type: string, id: string, content: string, expectedRevision: string): Promise<boolean> {
    const ref = {type: type as ArtifactType, id};
    await this.mutate(ref, expectedRevision, async entry => {
      await this.commit(ref, entry, expectedRevision, original => {
        validateRawDocument(content, ref);
        let before: Record<string, any>;
        try { before = this.sourceEntity(original,ref); }
        catch {
          const previous = this.sourceIdentities.get(entry.filePath);
          if (!previous || previous.ref.id !== id || previous.ref.type !== type) this.invalid('Original identity is unknown; repair this source externally');
          before = previous.entity;
        }
        const after = this.sourceEntity(content, ref);
        const protectedFields = ['id','archived_at'];
        for (const [alias,canonical] of [['product','product_id'],['intention','intention_id']]) {
          if (!isDeepStrictEqual(before[canonical] ?? before[alias],after[canonical] ?? after[alias]) || (after[canonical] !== undefined && after[alias] !== undefined && !isDeepStrictEqual(after[canonical],after[alias]))) this.invalid('Raw editing cannot change parent identity');
        }
        if (type === 'specs') protectedFields.push('phase','status','phase_history','phase_changed_at','gap_check','peer_reviewed');
        for (const field of protectedFields) if (!isDeepStrictEqual(before[field], after[field])) this.invalid(`Raw editing cannot change ${field}; use the dedicated action`);
        if (type === 'specs' && !isDeepStrictEqual(before.validation?.peer_reviewed, after.validation?.peer_reviewed)) this.invalid('Raw editing cannot change peer review gates');
        const changes: Record<string, unknown> = {};
        for (const key of ['status','priority','complexity','deferred_reason','dependencies','intentions','depends_on','expectations','expectation_ids']) if (!isDeepStrictEqual(before[key],after[key])) changes[key] = after[key];
        this.validateChanges(ref, changes, original, before);
        return content;
      });
    });
    return true;
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  /** Coerce a value to an ISO date string: handles Date objects, strings, and nulls */
  private toISOString(value: unknown): string {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') return value;
    return '';
  }

  /** Capitalize first letter to match Forge enum values (e.g. "critical" → "Critical") */
  private capitalizeFirst(value: string): string {
    if (!value || typeof value !== 'string') return value;
    if (/^in[-_ ]?progress$/i.test(value)) return 'InProgress';
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
      if (typeof raw[key].id !== 'string' || !raw[key].id.trim()) throw new Error('Artifact must have a string ID');
      return raw[key] as Record<string, any>;
    }
    // Flat format: entity fields are at the root, identified by ID prefix
    if (typeof raw.id === 'string' && raw.id.startsWith(idPrefix)) {
      return raw;
    }
    throw new Error('Artifact wrapper or ID does not match its directory');
  }

  // ── Parsers (YAML → Forge types) ───────────────────────────────────

  parseProduct(filePath: string): void {
    const raw = this.readYaml(filePath);
    if (!raw) return;
    const p = this.extractEntity(raw, 'product', 'PROD-');
    if (!p) return;
    const unambiguous = this.registerSource({type:'products',id:p.id},p,filePath);

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
        ? (typeof p.audience.primary === 'string' ? p.audience.primary : this.toStringArray(p.audience.primary ?? p.audience.primary_users?.description).join('\n'))
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
      created_at: this.toISOString(p.created_at ?? p.created),
      updated_at: this.toISOString(p.updated_at),
      archived_at: p.archived_at ?? null,
    };

    const text = this.sourceTexts.get(filePath)!;
    this.workspaceRecords.set(filePath, { ref: {type:'products', id:product.id}, data:product, text });
    if (!unambiguous) return;
    this.knownSources.set(`products/${product.id}`, {filePath, text});
    this.products.set(product.id, { data: product, filePath, raw, text });
  }

  parseIntention(filePath: string): void {
    const raw = this.readYaml(filePath);
    if (!raw) return;
    const i = this.extractEntity(raw, 'intention', 'INT-');
    if (!i) return;
    const unambiguous = this.registerSource({type:'intentions',id:i.id},i,filePath);

    const intention: Intention = {
      id: i.id,
      product_id: i.product_id ?? i.product ?? '',
      title: i.title ?? i.name ?? i.statement?.trim().split('\n')[0] ?? '',
      description: i.description ?? i.statement ?? '',
      rationale: i.rationale,
      roadmap: readRoadmap(i.forge?.roadmap).metadata ?? undefined,
      priority: this.capitalizeFirst(i.priority ?? 'Medium') as Intention['priority'],
      status: this.capitalizeFirst(i.status ?? 'Draft') as Intention['status'],
      owner: i.owner ?? undefined,
      extras: this.computeExtras(i, [
        'id', 'product_id', 'product', 'title', 'name', 'statement', 'description',
        'rationale', 'priority', 'status', 'dependencies', 'created_at', 'updated_at',
        'archived_at', 'owner', 'created',
      ]),
      created_at: this.toISOString(i.created_at ?? i.created),
      updated_at: this.toISOString(i.updated_at),
      archived_at: i.archived_at ?? null,
    };

    const text = this.sourceTexts.get(filePath)!;
    this.workspaceRecords.set(filePath, { ref: {type:'intentions', id:intention.id}, data:intention, text });
    if (!unambiguous) return;
    this.knownSources.set(`intentions/${intention.id}`, {filePath, text});
    this.intentions.set(intention.id, { data: intention, filePath, raw, text });
    this.intentionDeps.set(intention.id, i.dependencies ?? []);
  }

  parseExpectation(filePath: string): void {
    const raw = this.readYaml(filePath);
    if (!raw) return;
    const e = this.extractEntity(raw, 'expectation', 'EXP-');
    if (!e) return;
    const unambiguous = this.registerSource({type:'expectations',id:e.id},e,filePath);

    const expectation: Expectation = {
      id: e.id,
      intention_id: e.intention_id ?? e.intention ?? '',
      title: e.title ?? e.name ?? e.description?.trim().split('\n')[0]?.slice(0, 100) ?? e.statement?.trim().split('\n')[0]?.slice(0, 100) ?? '',
      description: e.description ?? e.statement ?? '',
      status: this.capitalizeFirst(e.status ?? 'Draft') as Expectation['status'],
      edge_cases: this.normalizeEdgeCases(e.edge_cases),
      validation_criteria: typeof e.validation_criteria === 'string' ? e.validation_criteria : undefined,
      complexity: e.complexity, deferred_reason: e.deferred_reason,
      owner: e.owner ?? undefined,
      product_id: e.product_id ?? e.product ?? undefined,
      extras: this.computeExtras(e, [
        'id', 'intention_id', 'intention', 'title', 'name', 'description', 'statement',
        'status', 'edge_cases', 'created_at', 'updated_at', 'archived_at', 'owner',
        'product_id', 'product', 'created',
      ]),
      created_at: this.toISOString(e.created_at ?? e.created),
      updated_at: this.toISOString(e.updated_at),
      archived_at: e.archived_at ?? null,
    };

    const text = this.sourceTexts.get(filePath)!;
    this.workspaceRecords.set(filePath, { ref: {type:'expectations', id:expectation.id}, data:expectation, text });
    if (!unambiguous) return;
    this.knownSources.set(`expectations/${expectation.id}`, {filePath, text});
    this.expectations.set(expectation.id, { data: expectation, filePath, raw, text });
  }

  parseSpec(filePath: string): void {
    const raw = this.readYaml(filePath);
    if (!raw) return;
    const s = this.extractEntity(raw, 'spec', 'SPEC-');
    if (!s) return;
    const unambiguous = this.registerSource({type:'specs',id:s.id},s,filePath);

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
      // Plugin-authored Specs often carry no title; fall back to the first
      // description line so list pages and metrics rows stay readable.
      title: s.title ?? s.description?.trim().split('\n')[0]?.slice(0, 100) ?? '',
      description: s.description ?? '',
      phase: (Object.values(SpecPhase).includes(this.capitalizeFirst(s.status ?? s.phase ?? 'Draft') as Spec['phase'])
        ? this.capitalizeFirst(s.status ?? s.phase ?? 'Draft') : s.status ?? s.phase) as Spec['phase'],
      complexity: this.capitalizeFirst(s.complexity ?? 'Medium') as Spec['complexity'],
      context,
      boundaries: this.flattenBoundaries(s.boundaries),
      deliverables: this.flattenDeliverables(s.deliverables),
      validation_automated: this.toStringArray(validation.automated ?? s.validation_automated ?? []),
      validation_human: this.flattenValidationHuman(validation.human_review ?? validation.human ?? s.validation_human ?? []),
      peer_reviewed: validation.peer_reviewed ?? s.peer_reviewed ?? false,
      // Typed for display/gating; the raw gap_check object deliberately stays in
      // extras (it is NOT in the consumed-keys list) so YAML write-back emits it
      // verbatim — the annotation is owned by the IDD command layer, not Forge.
      gap_check: normalizeGapCheck(s.gap_check) ?? undefined,
      owner: s.owner ?? undefined,
      depends_on: s.depends_on?.length ? s.depends_on : undefined,
      intentions: s.intentions?.length ? s.intentions : undefined,
      extras: this.computeExtras(s, [
        'id', 'product_id', 'product', 'title', 'description', 'status', 'phase',
        'complexity', 'context', 'boundaries', 'deliverables', 'validation',
        'validation_automated', 'validation_human', 'peer_reviewed', 'expectations',
        'phase_history', 'created_at', 'updated_at', 'archived_at', 'owner',
        'depends_on', 'intentions', 'created', 'implemented',
      ]),
      phase_changed_at: this.toISOString(s.phase_changed_at ?? s.updated_at),
      created_at: this.toISOString(s.created_at ?? s.created),
      updated_at: this.toISOString(s.updated_at),
      archived_at: s.archived_at ?? null,
    };

    const text = this.sourceTexts.get(filePath)!;
    this.workspaceRecords.set(filePath, { ref: {type:'specs', id:spec.id}, data:spec, text });
    if (!unambiguous) return;
    this.knownSources.set(`specs/${spec.id}`, {filePath, text});
    this.specs.set(spec.id, { data: spec, filePath, raw, text });
    this.specExpectations.set(spec.id, s.expectation_ids ?? s.expectations ?? []);
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
    // Drop any prior error for this path so re-parses (file watcher) replace, not duplicate
    this.parseErrors = this.parseErrors.filter((e) => e.filePath !== filePath);
    let content: string;
    try {
      content = this.publishingText ?? readArtifact(this.docsDir, path.relative(this.docsDir, filePath)).text;
      this.sourceTexts.set(filePath, content);
      for (const source of this.knownSources.values()) if (source.filePath === filePath) source.text = content;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[idd-forge] Failed to read ${filePath}: ${message}`);
      this.parseErrors.push({ filePath, message });
      return null;
    }
    try {
      // json: true → duplicate keys are last-write-wins (JSON semantics) instead of throwing.
      // Forge is a viewer/editor for AI-generated YAML, not a validator; we accept slightly
      // malformed input and still surface a warning so users can find and fix it.
      return yaml.load(content, { json: true }) as Record<string, any>;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[idd-forge] Failed to parse ${filePath}: ${message}`);
      this.parseErrors.push({ filePath, message });
      return null;
    }
  }



  // ── Re-parse a single file (for file watcher) ─────────────────────

  reloadFile(filePath: string): void {
    const known = [...this.knownSources.entries()].filter(([,v]) => v.filePath === filePath);
    const identity = this.sourceIdentities.get(filePath);
    this.removeFile(filePath);
    if (identity) this.sourceIdentities.set(filePath,identity);
    for (const [key,value] of known) this.knownSources.set(key,value);
    const dir = path.basename(path.dirname(filePath));
    try { switch (dir) {
      case 'products': this.parseProduct(filePath); break;
      case 'intentions': this.parseIntention(filePath); break;
      case 'expectations': this.parseExpectation(filePath); break;
      case 'specs': this.parseSpec(filePath); break;
    } } catch (error) { this.parseErrors.push({filePath,message:String(error)}); }
  }

  removeFile(filePath: string): void {
    this.workspaceRecords.delete(filePath);
    this.sourceIdentities.delete(filePath);
    this.sourceTexts.delete(filePath);
    for (const [key,value] of this.knownSources) if (value.filePath === filePath) this.knownSources.delete(key);
    // Drop any parse error associated with the removed file
    this.parseErrors = this.parseErrors.filter((e) => e.filePath !== filePath);
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
      .map((e) => structuredClone(e.data))
      .filter((p) => !p.archived_at)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  getProduct(id: string): Product | null {
    const entry = this.products.get(id);
    if (!entry || entry.data.archived_at) return null;
    return structuredClone(entry.data);
  }

  async updateProduct(id: string, input: UpdateProductInput, expectedRevision: string): Promise<Product | null> {
    await this.update({type:'products',id},input,expectedRevision);
    return this.getProduct(id);
  }



  // ── Intention operations ───────────────────────────────────────────

  listIntentions(productId: string): Intention[] {
    return Array.from(this.intentions.values())
      .map((e) => structuredClone(e.data))
      .filter((i) => i.product_id === productId && !i.archived_at)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  getIntention(id: string): (Intention & { dependencies?: Array<{ id: string; title: string; status: string }> }) | null {
    const entry = this.intentions.get(id);
    if (!entry || entry.data.archived_at) return null;

    const depIds = this.intentionDeps.get(id) ?? [];
    const dependencies = depIds.map(depId => {
      const target = this.intentions.get(depId)?.data;
      return { id: depId, title: target?.title ?? 'Missing source', status: target?.status ?? 'Unknown', archived_at: target?.archived_at ?? null };
    });

    return structuredClone({ ...entry.data, dependencies });
  }

  async updateIntention(id: string, input: UpdateIntentionInput, expectedRevision: string): Promise<Intention | null> {
    await this.update({type:'intentions',id},input,expectedRevision);
    return this.getIntention(id);
  }



  // ── Intention dependency operations ────────────────────────────────

  getIntentionDeps(intentionId: string): string[] {
    return [...(this.intentionDeps.get(intentionId) ?? [])];
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

  async addIntentionDep(intentionId: string, dependsOnId: string, expectedRevision: string): Promise<void> {
    const ref: ArtifactRef = {type:'intentions',id:intentionId};
    await this.mutate(ref, expectedRevision, async entry => {
      const dependencies = [...this.getIntentionDeps(intentionId), dependsOnId];
      this.validateRelations(ref, {dependencies});
      await this.commit(ref,entry,expectedRevision,text => editDocument(text,ref,{dependencies}));
    });
  }

  async removeIntentionDep(intentionId: string, dependsOnId: string, expectedRevision: string): Promise<boolean> {
    const ref: ArtifactRef = {type:'intentions',id:intentionId};
    return this.mutate(ref, expectedRevision, async entry => {
      const previous = this.getIntentionDeps(intentionId);
      if (!previous.includes(dependsOnId)) return false;
      await this.commit(ref,entry,expectedRevision,text => editDocument(text,ref,{dependencies:previous.filter(id => id !== dependsOnId)}));
      return true;
    });
  }

  // ── Expectation operations ─────────────────────────────────────────

  listExpectations(intentionId: string): Expectation[] {
    return Array.from(this.expectations.values())
      .map((e) => structuredClone(e.data))
      .filter((e) => e.intention_id === intentionId && !e.archived_at)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  /** All live expectations under a product, resolved through their parent
   *  intention (or a direct product_id field when the YAML carries one). */
  listExpectationsByProduct(productId: string): Expectation[] {
    return Array.from(this.expectations.values())
      .map((e) => structuredClone(e.data))
      .filter((e) => {
        if (e.archived_at) return false;
        if (e.product_id === productId) return true;
        const intention = this.intentions.get(e.intention_id);
        return !!intention && intention.data.product_id === productId && !intention.data.archived_at;
      })
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  getExpectation(id: string): Expectation | null {
    const entry = this.expectations.get(id);
    if (!entry || entry.data.archived_at) return null;
    return structuredClone(entry.data);
  }

  async updateExpectation(id: string, input: UpdateExpectationInput, expectedRevision: string): Promise<Expectation | null> {
    await this.update({type:'expectations',id},input,expectedRevision);
    return this.getExpectation(id);
  }



  // ── Spec operations ────────────────────────────────────────────────

  listSpecs(productId: string): Spec[] {
    return Array.from(this.specs.values())
      .map((e) => structuredClone(e.data))
      .filter((s) => s.product_id === productId && !s.archived_at)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  getSpec(id: string): Spec | null {
    const entry = this.specs.get(id);
    if (!entry || entry.data.archived_at) return null;
    return structuredClone(entry.data);
  }

  async updateSpec(id: string, input: UpdateSpecInput, expectedRevision: string): Promise<Spec | null> {
    await this.update({type:'specs',id},input,expectedRevision);
    return this.getSpec(id);
  }

  /**
   * Record human acknowledgment of gap-check warnings on a Spec. This is the
   * one gap_check write Forge performs — the framework's doctrine is that the
   * field is written "only at explicit human direction", and a human clicking
   * an acknowledge control in the UI is exactly that. All other annotation
   * fields remain owned by the IDD command layer.
   */
  async acknowledgeGapCheckWarnings(specId: string, expectedRevision: string): Promise<{ok:true;spec:Spec}|{ok:false;error:string}> {
    if (!this.getSpec(specId)) return {ok:false,error:'NOT_FOUND'};
    const ref: ArtifactRef = {type:'specs',id:specId};
    return this.mutate(ref,expectedRevision,async entry => {
      const gc = this.getSpec(specId)?.gap_check;
      if (!gc) return {ok:false,error:'NO_GAP_CHECK'};
      if (gc.status !== 'warnings') return {ok:false,error:'NOT_WARNINGS'};
      await this.commit(ref,entry,expectedRevision,text => acknowledgeWarnings(text,ref));
      return {ok:true,spec:this.getSpec(specId)!};
    });
  }

  async linkExpectations(specId: string, expectationIds: string[], expectedRevision: string): Promise<boolean> {
    const ref: ArtifactRef = {type:'specs',id:specId};
    await this.mutate(ref,expectedRevision,async entry => {
      this.validateRelations(ref,{expectation_ids:expectationIds});
      await this.commit(ref,entry,expectedRevision,text => editDocument(text,ref,{expectation_ids:expectationIds}));
    });
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
        edge_cases: [...e.edge_cases],
      }));
  }

  countSpecsByPhase(productId: string, phase: string): number {
    return Array.from(this.specs.values())
      .filter((e) => e.data.product_id === productId && e.data.phase === phase && !e.data.archived_at)
      .length;
  }

  // ── Phase transition operations ────────────────────────────────────

  getPhaseHistory(specId: string): PhaseHistoryEntry[] {
    return structuredClone(this.specPhaseHistory.get(specId) ?? []);
  }

  async transition<T>(specId: string, expectedRevision: string, evaluate: () => Promise<{result:T; change?:{to:string; userId:string; overrideReason?:string}}>): Promise<T> {
    const ref: ArtifactRef = {type:'specs',id:specId};
    return this.mutate(ref,expectedRevision,async entry => {
      this.requireGraph();
      const {result,change} = await evaluate();
      if (change) {
        if (!Object.values(SpecPhase).includes(change.to as Spec['phase'])) this.invalid('Unknown phase');
        const history = {from:this.getSpec(specId)!.phase,to:change.to,timestamp:new Date().toISOString(),user_id:change.userId,...(change.overrideReason ? {override_reason:change.overrideReason}: {})};
        await this.commit(ref,entry,expectedRevision,text => recordTransition(text,ref,change.to,history));
      }
      return result;
    });
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
