import { listEvidence } from '../lib/evidenceFiles.js';
import { getStore } from '../lib/yamlStore.js';
import { projectWorkspace } from '../../shared/lib/productWorkspace.js';
import type { WorkspaceProjection } from '../../shared/types/workspace.js';
export async function getWorkspace(productId: string): Promise<WorkspaceProjection | null> {
  const snapshot = getStore().getWorkspaceSnapshot(productId);
  if (!snapshot) return null;
  let inventoryIncomplete = false;
  try { snapshot.evidence = await listEvidence(getStore().getDocsRoot(), snapshot.specs.map(r => r.data).filter(s => s.product_id === productId)); }
  catch (error) {
    inventoryIncomplete = true;
    snapshot.evidence = snapshot.evidence.filter(ref => ref.spec_ids.some(id => snapshot.specs.some(r => r.data.id === id && r.data.product_id === productId)));
    snapshot.diagnostics.push({key:`evidence-inventory:${productId}`,code:'EVIDENCE_INVENTORY_UNAVAILABLE',entity:{type:'products',id:productId},message:error instanceof Error?error.message:'Evidence inventory is unavailable. Review access to the reviews directory.',related:[],kind:'unknown'});
  }
  const intentionIds = new Set(snapshot.intentions.filter(r => r.data.product_id === productId).map(r => r.data.id));
  const expectationIds = new Set(snapshot.expectations.filter(r => intentionIds.has(r.data.intention_id)).map(r => r.data.id));
  for (const evidence of snapshot.evidence) evidence.expectation_ids = [...new Set(evidence.spec_ids.flatMap(id => snapshot.spec_expectation_ids[id] ?? []))].filter(id => expectationIds.has(id));
  const projection = projectWorkspace(snapshot);
  if (inventoryIncomplete) projection.incomplete = true;
  return projection;
}
