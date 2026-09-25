import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, apiFetchEnvelope, apiFetchSourced, ApiError } from './api';
const source = { repository_id: 'repo', revision: '"' + 'a'.repeat(64) + '"', path: 'products/P.yaml', read_only_fields: { id: 'P' } };
afterEach(() => vi.unstubAllGlobals());
function response(body: unknown, status = 200) {
  const json = vi.fn().mockResolvedValue(body);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: status < 400, status, json, headers: new Headers({ 'Content-Type': 'application/json' }) }));
  return json;
}
describe('revision-aware API transport', () => {
  it('preserves the existing data-only API', async () => {
    const json = response({ data: { id: 'P' }, error: null, meta: { source } });
    expect(await apiFetch('/products/P')).toEqual({ id: 'P' });
    expect(json).toHaveBeenCalledTimes(1);
  });
  it('retains metadata in envelope reads without consuming a response twice', async () => {
    const envelope = { data: { id: 'P' }, error: null, meta: { source } };
    const json = response(envelope);
    expect(await apiFetchEnvelope('/products/P')).toEqual(envelope);
    expect(json).toHaveBeenCalledTimes(1);
  });
  it('provides the source alongside entity data', async () => {
    const json = response({ data: { id: 'P' }, error: null, meta: { source } });
    expect(await apiFetchSourced('/products/P')).toEqual({ id: 'P', source });
    expect(json).toHaveBeenCalledTimes(1);
  });
  it('preserves Headers If-Match and content headers on writes', async () => {
    response({ data: true, error: null, meta: { source } });
    const headers = new Headers({ 'If-Match': source.revision, 'Content-Type': 'application/json; charset=utf-8' });
    await apiFetch('/products/P', { method: 'PUT', headers, body: JSON.stringify({ name: 'Changed' }) });
    const [url, options] = vi.mocked(fetch).mock.calls[0]!;
    expect(url).toBe('/api/products/P');
    const actual = new Headers(options?.headers);
    expect(actual.get('If-Match')).toBe(source.revision);
    expect(actual.get('Content-Type')).toBe('application/json; charset=utf-8');
  });
  it('retains conflict code, message and details in ApiError', async () => {
    const error = { code: 'REVISION_CONFLICT', message: 'Reload before saving', details: { revision: source.revision } };
    const json = response({ data: null, error }, 409);
    await expect(apiFetch('/products/P')).rejects.toMatchObject(error);
    expect(json).toHaveBeenCalledTimes(1);
  });
  it('wraps non-JSON HTTP failures in ApiError HTTP_ERROR', async () => {
    const json = vi.fn().mockRejectedValue(new SyntaxError('Unexpected HTML'));
    const text = vi.fn().mockResolvedValue('<html>Bad Gateway</html>');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502, statusText: 'Bad Gateway', headers: new Headers({ 'Content-Type': 'text/html' }), json, text }));
    const error = await apiFetch('/products/P').catch((value) => value);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'HTTP_ERROR', message: expect.any(String) });
    expect(json.mock.calls.length + text.mock.calls.length).toBeLessThanOrEqual(1);
  });
});
