import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from '@/auth';
import { getWechatArticleConfig } from '@/lib/config';
import { fetchWithTimeout, HttpTimeoutError } from '@/lib/http-client';
import { POST } from './route';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/config', () => ({
  getWechatArticleConfig: vi.fn(),
}));

vi.mock('@/lib/http-client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/http-client')>('@/lib/http-client');
  return {
    ...actual,
    fetchWithTimeout: vi.fn(),
  };
});

describe('/api/wechat-articles', () => {
  const mockAuth = vi.mocked(auth);
  const mockGetWechatArticleConfig = vi.mocked(getWechatArticleConfig);
  const mockFetchWithTimeout = vi.mocked(fetchWithTimeout);
  const originalNodeEnv = process.env.NODE_ENV;
  const originalMockFallback = process.env.ALLOW_MOCK_DATA_FALLBACK;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ALLOW_MOCK_DATA_FALLBACK', 'true');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    if (originalNodeEnv !== undefined) {
      vi.stubEnv('NODE_ENV', originalNodeEnv);
    }
    if (originalMockFallback !== undefined) {
      vi.stubEnv('ALLOW_MOCK_DATA_FALLBACK', originalMockFallback);
    }
  });

  it('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);

    const request = new Request('http://localhost/api/wechat-articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: 'AI' }),
    });

    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('returns mock data when config is unavailable and fallback is enabled', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 1 } } as never);
    mockGetWechatArticleConfig.mockReturnValueOnce(null);

    const request = new Request('http://localhost/api/wechat-articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: 'AI', page: 1, period: 7 }),
    });

    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.source).toBe('mock');
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('returns 504 when upstream times out and fallback is disabled', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ALLOW_MOCK_DATA_FALLBACK', 'false');

    mockAuth.mockResolvedValueOnce({ user: { id: 1 } } as never);
    mockGetWechatArticleConfig.mockReturnValueOnce({
      endpoint: 'https://api.test.local/search',
      apiKey: 'test-key',
    });
    mockFetchWithTimeout.mockRejectedValueOnce(new HttpTimeoutError('请求超时（>10000ms）'));

    const request = new Request('http://localhost/api/wechat-articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: 'AI', page: 1, period: 7 }),
    });

    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(504);
    expect(body.success).toBe(false);
    expect(body.code).toBe('UPSTREAM_TIMEOUT');
  });
});
