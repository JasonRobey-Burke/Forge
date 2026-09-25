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

export async function apiFetchEnvelope<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const headers = new Headers(options?.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type','application/json');
  const controller = new AbortController();
  const caller = options?.signal;
  const cancel = () => controller.abort(caller?.reason);
  if (caller?.aborted) cancel(); else caller?.addEventListener('abort', cancel, {once:true});
  const timer = setTimeout(() => controller.abort(new ApiError('REQUEST_TIMEOUT',
    'Request timed out. The outcome may be uncertain; review the current source before trying again.')), 30_000);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {...options,headers,signal:controller.signal});
    if (!res.headers.get('Content-Type')?.includes('application/json'))
      throw new ApiError(res.ok ? 'INVALID_RESPONSE' : 'HTTP_ERROR', `Request failed: ${res.status} ${res.statusText ?? ''}`);
    let json: ApiResponse<T>;
    try { json = await res.json(); }
    catch { if(controller.signal.aborted) throw controller.signal.reason; throw new ApiError(res.ok ? 'INVALID_RESPONSE' : 'HTTP_ERROR', `Request failed: ${res.status}`); }
    if (json.error) throw new ApiError(json.error.code,json.error.message,json.error.details ?? json.error);
    if (!res.ok) throw new ApiError('HTTP_ERROR',`Request failed: ${res.status} ${res.statusText ?? ''}`);
    return json;
  } catch(error) {
    if(controller.signal.aborted) throw controller.signal.reason;
    throw error;
  } finally {
    clearTimeout(timer);
    caller?.removeEventListener('abort',cancel);
  }
}
export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  return (await apiFetchEnvelope<T>(path,options)).data as T;
}
export async function apiFetchSourced<T>(path: string, options?: RequestInit): Promise<import('@shared/types/source').Sourced<T>> {
  const envelope = await apiFetchEnvelope<T>(path,options);
  const source = envelope.meta?.source as import('@shared/types/source').SourceMeta | undefined;
  if (!source) throw new ApiError('INVALID_RESPONSE','Source revision is missing; reload before editing');
  return {...envelope.data as T,source};
}
export async function apiFetchSourcedList<T extends {id:string}>(path: string): Promise<import('@shared/types/source').Sourced<T>[]> {
  const envelope = await apiFetchEnvelope<T[]>(path);
  const sources = envelope.meta?.sources as Record<string, import('@shared/types/source').SourceMeta> | undefined;
  return (envelope.data ?? []).map(data => ({...data,source:sources?.[data.id]!}));
}

/** Only explicitly changed fields enter the source patch. Baseline is captured when editing begins. */
export function changedFields<T extends object>(baseline: object, input: T): Partial<T> {
  const result: Record<string,unknown> = {};
  for (const [key,value] of Object.entries(input)) {
    const original = (baseline as Record<string,unknown>)[key];
    if (original === undefined && (value === '' || value === undefined || Array.isArray(value) && value.length === 0)) continue;
    if (JSON.stringify(original) === JSON.stringify(value)) continue;
    if (['context','wip_limits'].includes(key) && original && value && typeof original === 'object' && typeof value === 'object') {
      const leaves = changedFields(original,value);
      if (Object.keys(leaves).length) result[key] = leaves;
    } else result[key] = value;
  }
  return result as Partial<T>;
}
