import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetchEnvelope, ApiError } from './api';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function abortablePending<T>(signal?: AbortSignal | null): Promise<T> {
  return new Promise((_resolve, reject) => {
    const abort = () => reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'));
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
  });
}

function observe<T>(promise: Promise<T>) {
  const result: { state: 'pending' | 'fulfilled' | 'rejected'; value?: T; error?: unknown } = { state: 'pending' };
  void promise.then(
    (value) => { result.state = 'fulfilled'; result.value = value; },
    (error) => { result.state = 'rejected'; result.error = error; },
  );
  return result;
}

const writeOptions = {
  method: 'PUT',
  headers: { 'If-Match': '"exact-revision"' },
  body: JSON.stringify({ statement: 'Keep this draft' }),
};

describe('repo-local API request deadlines', () => {
  it.each(['headers', 'JSON body'])('bounds stalled %s to 30 seconds and never retries an ambiguous write', async (stage) => {
    let requestSignal: AbortSignal | null | undefined;
    const fetchMock = vi.fn((_url: unknown, options?: RequestInit) => {
      requestSignal = options?.signal;
      if (stage === 'headers') return abortablePending<Response>(requestSignal);
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: () => abortablePending(requestSignal),
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const result = observe(apiFetchEnvelope('/intentions/INT-1', writeOptions));

    await vi.advanceTimersByTimeAsync(30_000);

    expect.soft(result.state).toBe('rejected');
    expect.soft(result.error).toBeInstanceOf(ApiError);
    expect.soft(result.error).toMatchObject({ code: 'REQUEST_TIMEOUT' });
    expect.soft(requestSignal?.aborted).toBe(true);
    expect.soft(fetchMock).toHaveBeenCalledTimes(1);
    expect.soft(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('honors caller cancellation promptly and distinguishes it from a deadline without retry', async () => {
    const controller = new AbortController();
    let requestSignal: AbortSignal | null | undefined;
    const fetchMock = vi.fn((_url: unknown, options?: RequestInit) => {
      requestSignal = options?.signal;
      return abortablePending<Response>(requestSignal);
    });
    vi.stubGlobal('fetch', fetchMock);
    const result = observe(apiFetchEnvelope('/intentions/INT-1', { ...writeOptions, signal: controller.signal }));
    controller.abort(new DOMException('Caller cancelled', 'AbortError'));
    await vi.advanceTimersByTimeAsync(0);

    expect.soft(result.state).toBe('rejected');
    expect.soft(result.error).toBeDefined();
    expect.soft((result.error as { code?: unknown } | undefined)?.code).not.toBe('REQUEST_TIMEOUT');
    expect.soft(requestSignal?.aborted).toBe(true);
    expect.soft(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('preserves a successful envelope and clears the deadline before it can abort a completed request', async () => {
    const envelope = { data: { id: 'INT-1' }, error: null, meta: { source: { revision: '"saved"' } } };
    let requestSignal: AbortSignal | null | undefined;
    const fetchMock = vi.fn((_url: unknown, options?: RequestInit) => {
      requestSignal = options?.signal;
      return Promise.resolve({ ok: true, status: 200, headers: new Headers({ 'Content-Type': 'application/json' }), json: async () => envelope });
    });
    vi.stubGlobal('fetch', fetchMock);

    expect(await apiFetchEnvelope('/intentions/INT-1', writeOptions)).toEqual(envelope);
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(requestSignal?.aborted ?? false).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    [428, 'PRECONDITION_REQUIRED'],
    [409, 'REVISION_CONFLICT'],
  ])('retains HTTP %i error semantics and clears its deadline without retry', async (status, code) => {
    const error = { code, message: 'Reload before saving', details: { revision: '"current"' } };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false, status, headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => ({ data: null, error, meta: {} }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiFetchEnvelope('/intentions/INT-1', writeOptions)).rejects.toMatchObject(error);
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
