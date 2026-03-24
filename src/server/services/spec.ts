import { getStore } from '../lib/yamlStore.js';
import type { Spec, UpdateSpecInput } from '../../shared/types/index.js';

export async function listSpecs(productId: string): Promise<Spec[]> {
  return getStore().listSpecs(productId);
}

export async function getSpec(id: string): Promise<Spec | null> {
  return getStore().getSpec(id);
}

export async function updateSpec(id: string, input: UpdateSpecInput): Promise<Spec | null> {
  return getStore().updateSpec(id, input);
}

export async function linkExpectations(specId: string, expectationIds: string[]): Promise<boolean> {
  return getStore().linkExpectations(specId, expectationIds);
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

export async function getStaleSpecIds(productId: string): Promise<string[]> {
  return getStore().getStaleSpecIds(productId);
}
