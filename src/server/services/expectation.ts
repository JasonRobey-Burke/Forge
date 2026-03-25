import { getStore } from '../lib/yamlStore.js';
import type { Expectation, UpdateExpectationInput } from '../../shared/types/index.js';

export async function listExpectations(intentionId: string): Promise<Expectation[]> {
  return getStore().listExpectations(intentionId);
}

export async function getExpectation(id: string): Promise<Expectation | null> {
  return getStore().getExpectation(id);
}

export async function updateExpectation(id: string, input: UpdateExpectationInput): Promise<Expectation | null> {
  return getStore().updateExpectation(id, input);
}
