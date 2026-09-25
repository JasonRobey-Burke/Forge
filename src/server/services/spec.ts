import { getStore } from '../lib/yamlStore.js';
import type { Spec, UpdateSpecInput } from '../../shared/types/index.js';

export async function listSpecs(productId: string): Promise<Spec[]> {
  return getStore().listSpecs(productId);
}

export async function getSpec(id: string): Promise<Spec | null> {
  return getStore().getSpec(id);
}

export async function updateSpec(id: string, input: UpdateSpecInput, expectedRevision: string): Promise<Spec | null> {
  return getStore().updateSpec(id, input, expectedRevision);
}

export async function linkExpectations(specId: string, expectationIds: string[], expectedRevision: string): Promise<boolean> {
  return getStore().linkExpectations(specId, expectationIds, expectedRevision);
}

export async function getSpecExpectations(specId: string) {
  return getStore().getSpecExpectations(specId);
}

export async function countSpecsByPhase(productId: string, phase: string): Promise<number> {
  return getStore().countSpecsByPhase(productId, phase);
}

export async function checkSpecStaleness(specId: string) {
  return getStore().checkSpecStaleness(specId);
}

export async function acknowledgeGapCheckWarnings(specId: string, expectedRevision: string) {
  return getStore().acknowledgeGapCheckWarnings(specId, expectedRevision);
}

export async function getStaleSpecIds(productId: string): Promise<string[]> {
  return getStore().getStaleSpecIds(productId);
}
