import type { ApiResponse } from '@shared/types';

const BASE_URL = '/api';

export class ApiError extends Error {
  code: string;
  details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const { headers: optHeaders, ...restOptions } = options ?? {};
  const res = await fetch(`${BASE_URL}${path}`, {
    ...restOptions,
    headers: { 'Content-Type': 'application/json', ...optHeaders },
  });

  if (!res.ok) {
    // Try to parse as JSON error; fall back to status text
    try {
      const json: ApiResponse<T> = await res.json();
      if (json.error) {
        throw new ApiError(json.error.code, json.error.message, json.error.details);
      }
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError('HTTP_ERROR', `Request failed: ${res.status} ${res.statusText}`);
    }
  }

  const json: ApiResponse<T> = await res.json();

  if (json.error) {
    throw new ApiError(json.error.code, json.error.message, json.error.details);
  }

  return json.data as T;
}
