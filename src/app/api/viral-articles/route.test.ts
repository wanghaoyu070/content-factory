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

describe('/api/viral-articles', () => {
    const mockAuth = vi.mocked(auth);
    const mockGetWechatArticleConfig = vi.mocked(getWechatArticleConfig);
    const mockFetchWithTimeout = vi.mocked(fetchWithTimeout);
    const originalMockFallback = process.env.ALLOW_MOCK_DATA_FALLBACK;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubEnv('NODE_ENV', 'development');
        vi.stubEnv('ALLOW_MOCK_DATA_FALLBACK', 'true');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        if (originalMockFallback !== undefined) {
            vi.stubEnv('ALLOW_MOCK_DATA_FALLBACK', originalMockFallback);
        }
    });

    const makeRequest = (body: Record<string, unknown>) =>
        new Request('http://localhost/api/viral-articles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

    const validBody = {
        start_time: '2026-03-08',
        end_time: '2026-03-11',
    };

    it('returns 401 when user is not authenticated', async () => {
        mockAuth.mockResolvedValueOnce(null);

        const response = await POST(makeRequest(validBody) as never);
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.success).toBe(false);
        expect(body.code).toBe('UNAUTHORIZED');
    });

    it('returns mock data when config is unavailable and fallback is enabled', async () => {
        mockAuth.mockResolvedValueOnce({ user: { id: 1 } } as never);
        mockGetWechatArticleConfig.mockReturnValueOnce(null);

        const response = await POST(makeRequest(validBody) as never);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.source).toBe('mock');
        expect(Array.isArray(body.data)).toBe(true);
        expect(body.data.length).toBeGreaterThan(0);
        // Verify mock items have the hot field
        expect(body.data[0]).toHaveProperty('hot');
        expect(body.data[0]).toHaveProperty('fans');
    });

    it('returns 504 when upstream times out and fallback is disabled', async () => {
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('ALLOW_MOCK_DATA_FALLBACK', 'false');

        mockAuth.mockResolvedValueOnce({ user: { id: 1 } } as never);
        mockGetWechatArticleConfig.mockReturnValueOnce({
            endpoint: 'https://www.dajiala.com/fbmain/monitor/v3/kw_search',
            apiKey: 'test-key',
        });
        mockFetchWithTimeout.mockRejectedValueOnce(new HttpTimeoutError('请求超时（>15000ms）'));

        const response = await POST(makeRequest(validBody) as never);
        const body = await response.json();

        expect(response.status).toBe(504);
        expect(body.success).toBe(false);
        expect(body.code).toBe('UPSTREAM_TIMEOUT');
    });

    it('returns 400 for invalid date format', async () => {
        mockAuth.mockResolvedValueOnce({ user: { id: 1 } } as never);

        const response = await POST(
            makeRequest({ start_time: 'invalid', end_time: '2026-03-11' }) as never
        );
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.success).toBe(false);
    });

    it('calls upstream with FormData when config is available', async () => {
        mockAuth.mockResolvedValueOnce({ user: { id: 1 } } as never);
        mockGetWechatArticleConfig.mockReturnValueOnce({
            endpoint: 'https://www.dajiala.com/fbmain/monitor/v3/kw_search',
            apiKey: 'test-key-123',
        });

        const mockResponse = {
            ok: true,
            json: vi.fn().mockResolvedValue({
                code: 0,
                msg: 'success',
                total: 1,
                total_page: 1,
                data: [
                    {
                        url: 'https://mp.weixin.qq.com/s/test',
                        title: 'Test Viral Article',
                        mp_nickname: 'Test Account',
                        pub_time: '2026-03-10 12:00:00',
                        wxid: 'gh_test',
                        hot: 25.5,
                        read_num: 10000,
                        zan_num: 100,
                        cover: '',
                        avg: 400,
                        category: '科技',
                        fans: 50000,
                        position: 1,
                        is_original: '原创',
                        publish_type: '图文',
                    },
                ],
            }),
        };
        mockFetchWithTimeout.mockResolvedValueOnce(mockResponse as never);

        const response = await POST(makeRequest(validBody) as never);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.source).toBe('api');
        expect(body.data[0].hot).toBe(25.5);
        expect(body.data[0].title).toBe('Test Viral Article');

        // Verify the endpoint was derived correctly
        expect(mockFetchWithTimeout).toHaveBeenCalledWith(
            'https://www.dajiala.com/fbmain/monitor/v3/hot_typical_search',
            expect.objectContaining({
                method: 'POST',
            }),
            15000
        );
    });
});
