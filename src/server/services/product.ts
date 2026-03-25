import { getStore } from '../lib/yamlStore.js';
import type { Product, UpdateProductInput } from '../../shared/types/index.js';

export async function listProducts(): Promise<Product[]> {
  return getStore().listProducts();
}

export async function getProduct(id: string): Promise<Product | null> {
  return getStore().getProduct(id);
}

export async function updateProduct(id: string, input: UpdateProductInput): Promise<Product | null> {
  return getStore().updateProduct(id, input);
}
