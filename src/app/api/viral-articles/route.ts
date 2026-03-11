import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { getWechatArticleConfig } from '@/lib/config';
import {
    badRequestResponse,
    createRequestId,
    errorResponse,
    successResponseWithMeta,
    unauthorizedResponse,
} from '@/lib/api-response';
import { fetchWithTimeout, HttpTimeoutError } from '@/lib/http-client';
import { canUseMockFallback, isPlaceholderEndpoint } from '@/lib/mock-policy';
import { validateBody, viralArticleSearchSchema } from '@/lib/validations';
import type { ViralArticleItem } from '@/types/api';

// Response shape from the upstream hot_typical_search API
interface UpstreamViralResponse {
    code: number;
    msg: string;
    note: string;
    cost: number;
    remain_money: number;
    total: number;
    total_page: number;
    data: ViralArticleItem[];
}

/**
 * Derive the viral articles endpoint from the configured kw_search endpoint.
 * e.g. https://www.dajiala.com/fbmain/monitor/v3/kw_search
 *   -> https://www.dajiala.com/fbmain/monitor/v3/hot_typical_search
 */
function deriveViralEndpoint(kwSearchEndpoint: string): string {
    // Try to replace the last path segment
    const url = new URL(kwSearchEndpoint);
    const segments = url.pathname.split('/');
    segments[segments.length - 1] = 'hot_typical_search';
    url.pathname = segments.join('/');
    return url.toString();
}

export async function POST(request: NextRequest) {
    const requestId = createRequestId();
    const mockFallbackEnabled = canUseMockFallback();

    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorizedResponse('请先登录', requestId);
        }

        const parsedBody = await validateBody(request, viralArticleSearchSchema);
        if (!parsedBody.success) {
            return badRequestResponse(parsedBody.error, requestId);
        }
        const { keyword, category, pub_type, page, start_time, end_time } = parsedBody.data;

        // Reuse the same API key/endpoint config as wechat-articles
        const config = getWechatArticleConfig(session.user.id);

        if (!config || isPlaceholderEndpoint(config.endpoint) || !config.apiKey) {
            if (!mockFallbackEnabled) {
                return errorResponse('未配置可用的微信文章检索接口', 503, 'SERVICE_UNAVAILABLE', requestId);
            }
        }

        let fetchSuccess = false;
        let data: UpstreamViralResponse | null = null;
        let upstreamError: unknown = null;

        // Call the real API
        if (config && config.endpoint && config.apiKey && !isPlaceholderEndpoint(config.endpoint)) {
            try {
                const viralEndpoint = deriveViralEndpoint(config.endpoint);

                // The hot_typical_search API uses multipart/form-data
                const formData = new FormData();
                formData.append('key', config.apiKey);
                formData.append('keyword', keyword);
                formData.append('pub_type', pub_type);
                formData.append('category', category);
                formData.append('page', String(page));
                formData.append('start_time', start_time);
                formData.append('end_time', end_time);

                const response = await fetchWithTimeout(viralEndpoint, {
                    method: 'POST',
                    body: formData,
                }, 15000);

                if (response.ok) {
                    data = await response.json();
                    if (data && data.code === 0) {
                        fetchSuccess = true;
                    }
                }
            } catch (err) {
                upstreamError = err;
                console.warn('[viral-articles] Real API call failed:', err);
            }
        }

        // Return real data if successful
        if (fetchSuccess && data) {
            return successResponseWithMeta(
                data.data,
                {
                    source: 'api' as const,
                    total: data.total,
                    page: page,
                    totalPage: data.total_page,
                },
                200,
                requestId
            );
        }

        if (!mockFallbackEnabled) {
            if (upstreamError instanceof HttpTimeoutError) {
                return errorResponse(upstreamError.message, 504, 'UPSTREAM_TIMEOUT', requestId);
            }
            return errorResponse('获取爆文数据失败，请稍后重试', 502, 'UPSTREAM_ERROR', requestId);
        }

        // Mock data fallback for development
        console.log('[viral-articles] Generating mock data');
        const mockData: ViralArticleItem[] = Array.from({ length: 10 }).map((_, i) => ({
            url: '#',
            title: `${keyword || '热门'}话题爆文示例 ${i + 1}：为什么这篇文章阅读量暴涨${(i + 1) * 10}倍？`,
            mp_nickname: `示例公众号${i + 1}`,
            pub_time: new Date(Date.now() - i * 86400000).toISOString().split('T')[0] + ' 12:00:00',
            wxid: `gh_mock_${i}`,
            hot: parseFloat((30 - i * 2.5).toFixed(2)),
            read_num: Math.floor(Math.random() * 50000) + 1000,
            zan_num: Math.floor(Math.random() * 500) + 10,
            cover: `https://api.dicebear.com/7.x/shapes/svg?seed=viral${i}`,
            avg: Math.floor(Math.random() * 500) + 50,
            category: ['科技', '财经', '教育', '健康', '职场'][i % 5],
            fans: Math.floor(Math.random() * 100000) + 5000,
            position: i < 6 ? 1 : 2,
            is_original: i % 3 === 0 ? '原创' : '非原创',
            publish_type: ['图文', '视频', '转载'][i % 3],
        }));

        return successResponseWithMeta(
            mockData,
            {
                source: 'mock' as const,
                total: 10,
                page: 1,
                totalPage: 1,
            },
            200,
            requestId
        );

    } catch (error) {
        console.error(`[API ${requestId}] Error in viral-articles:`, error);
        if (!mockFallbackEnabled) {
            if (error instanceof HttpTimeoutError) {
                return errorResponse(error.message, 504, 'UPSTREAM_TIMEOUT', requestId);
            }
            return errorResponse('获取爆文数据失败', 500, 'INTERNAL_ERROR', requestId);
        }

        // Emergency mock fallback
        const mockData: ViralArticleItem[] = Array.from({ length: 5 }).map((_, i) => ({
            url: '#',
            title: `爆文示例 ${i + 1}（系统演示）`,
            mp_nickname: `系统演示${i + 1}`,
            pub_time: new Date().toISOString().split('T')[0] + ' 12:00:00',
            wxid: `gh_demo_${i}`,
            hot: 10 - i,
            read_num: 5000,
            zan_num: 50,
            cover: '',
            avg: 200,
            category: '综合',
            fans: 10000,
            position: 1,
            is_original: '非原创',
            publish_type: '图文',
        }));

        return successResponseWithMeta(
            mockData,
            { source: 'mock' as const, total: 5, page: 1, totalPage: 1 },
            200,
            requestId
        );
    }
}
