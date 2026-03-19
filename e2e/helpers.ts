const BASE_URL = 'http://localhost:3001/api';

async function apiCall<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.data;
}

export async function createProduct(overrides: Record<string, unknown> = {}) {
  return apiCall<any>('/products', {
    method: 'POST',
    body: JSON.stringify({
      name: `E2E Product ${Date.now()}`,
      problem_statement: 'E2E test problem',
      vision: 'E2E test vision',
      target_audience: 'E2E testers',
      ...overrides,
    }),
  });
}

export async function createIntention(productId: string, overrides: Record<string, unknown> = {}) {
  return apiCall<any>('/intentions', {
    method: 'POST',
    body: JSON.stringify({
      product_id: productId,
      title: `E2E Intention ${Date.now()}`,
      description: 'E2E test intention',
      ...overrides,
    }),
  });
}

export async function createExpectation(intentionId: string, overrides: Record<string, unknown> = {}) {
  return apiCall<any>('/expectations', {
    method: 'POST',
    body: JSON.stringify({
      intention_id: intentionId,
      title: `E2E Expectation ${Date.now()}`,
      description: 'E2E test expectation',
      edge_cases: ['Edge case 1', 'Edge case 2'],
      ...overrides,
    }),
  });
}

export async function createSpec(productId: string, overrides: Record<string, unknown> = {}) {
  return apiCall<any>('/specs', {
    method: 'POST',
    body: JSON.stringify({
      product_id: productId,
      title: `E2E Spec ${Date.now()}`,
      description: 'E2E test spec',
      ...overrides,
    }),
  });
}

export async function deleteEntity(type: 'products' | 'intentions' | 'expectations' | 'specs', id: string) {
  return apiCall<any>(`/${type}/${id}`, { method: 'DELETE' });
}

export async function transitionSpec(specId: string, toPhase: string, overrideReason?: string) {
  return apiCall<any>(`/specs/${specId}/transition`, {
    method: 'POST',
    body: JSON.stringify({ to_phase: toPhase, ...(overrideReason ? { override_reason: overrideReason } : {}) }),
  });
}

export async function linkExpectations(specId: string, expectationIds: string[]) {
  return apiCall<any>(`/specs/${specId}/expectations`, {
    method: 'PUT',
    body: JSON.stringify({ expectation_ids: expectationIds }),
  });
}

export async function updateSpec(specId: string, data: Record<string, unknown>) {
  return apiCall<any>(`/specs/${specId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
