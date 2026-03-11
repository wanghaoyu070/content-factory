import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchApiSuccessOrThrow, fetchJsonWithApiError } from './api-fetch';

describe('api-fetch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetchJsonWithApiError returns parsed json for ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ hello: 'world' }), { status: 200 })
    );

    const result = await fetchJsonWithApiError<{ hello: string }>('/api/test');
    expect(result.hello).toBe('world');
  });

  it('fetchJsonWithApiError throws friendly message for non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false, error: '失败', code: 'BAD_REQUEST' }), {
        status: 400,
      })
    );

    await expect(fetchJsonWithApiError('/api/test', undefined, '默认错误')).rejects.toThrow(
      '失败'
    );
  });

  it('fetchApiSuccessOrThrow throws when api success=false', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false, error: '未授权', code: 'UNAUTHORIZED' }), {
        status: 200,
      })
    );

    await expect(fetchApiSuccessOrThrow('/api/test', undefined, '默认错误')).rejects.toThrow(
      '未授权'
    );
  });
});
