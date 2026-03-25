import { getStore } from '../lib/yamlStore.js';
import type { Intention, UpdateIntentionInput } from '../../shared/types/index.js';

export async function listIntentions(productId: string): Promise<Intention[]> {
  return getStore().listIntentions(productId);
}

export async function getIntention(id: string): Promise<(Intention & { dependencies?: any[] }) | null> {
  return getStore().getIntention(id);
}

export async function updateIntention(id: string, input: UpdateIntentionInput): Promise<Intention | null> {
  return getStore().updateIntention(id, input);
}
