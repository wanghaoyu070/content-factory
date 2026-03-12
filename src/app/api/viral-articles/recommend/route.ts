import { auth } from '@/auth';
import { getWechatArticleConfig } from '@/lib/config';
import { isPlaceholderEndpoint } from '@/lib/mock-policy';
import { successResponse, errorResponse } from '@/lib/api-response';
import { fetchWithTimeout } from '@/lib/http-client';

// Helper: format date as YYYY-MM-DD, offset by daysAgo
function getDateStr(daysAgo: number): string {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
}

// Derive the hot_typical_search endpoint from kw_search endpoint
function deriveViralEndpoint(kwEndpoint: string): string {
    const url = new URL(kwEndpoint);
    const segments = url.pathname.split('/');
    segments[segments.length - 1] = 'hot_typical_search';
    url.pathname = segments.join('/');
    return url.toString();
}

interface UpstreamArticle {
    title: string;
    mp_nickname: string;
    read_num: number;
    avg: number;
    hot: number;
    fans: number;
    zan_num: number;
    url: string;
    pub_time: string;
    category: string;
    position: number;
    is_original: string;
    publish_type: string;
    wxid?: string;
}

// ── Daily cache ──────────────────────────────────────────────
// Recommendations refresh once per day. "换一批" sends ?refresh=1 to bypass.
interface CachedRecommendation {
    date: string; // YYYY-MM-DD
    articles: UpstreamArticle[];
    domains: string[];
}
let cachedRecommendation: CachedRecommendation | null = null;

function getTodayStr(): string {
    return new Date().toISOString().slice(0, 10);
}

/**
 * GET /api/viral-articles/recommend
 * 
 * Reads CREATOR_DOMAINS from env, fetches top viral articles for each domain,
 * merges and deduplicates by URL, sorts by hot value desc, returns top 15.
 * Results are cached for the entire day; pass ?refresh=1 to force a fresh fetch.
 */
export async function GET(request: Request) {
    const requestId = crypto.randomUUID();
    const session = await auth();

    if (!session?.user?.id) {
        return errorResponse('请先登录', 401, 'UNAUTHORIZED', requestId);
    }

    // Read creator domains from env
    const domainsStr = process.env.CREATOR_DOMAINS || '';
    if (!domainsStr.trim()) {
        return successResponse(
            { articles: [], domains: [] },
            200,
            requestId
        );
    }

    const domains = domainsStr.split(',').map(d => d.trim()).filter(Boolean);

    // Check if forced refresh via ?refresh=1
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get('refresh') === '1';

    // Return cached data if it's from today and no force refresh
    if (!forceRefresh && cachedRecommendation && cachedRecommendation.date === getTodayStr()) {
        console.log(`[recommend] Serving cached data from ${cachedRecommendation.date} (${cachedRecommendation.articles.length} articles)`);
        return successResponse(
            { articles: cachedRecommendation.articles, domains: cachedRecommendation.domains, cached: true },
            undefined,
            requestId
        );
    }

    const config = getWechatArticleConfig(session.user.id);
    if (!config || isPlaceholderEndpoint(config.endpoint) || !config.apiKey) {
        return errorResponse('未配置微信文章检索接口', 503, 'SERVICE_UNAVAILABLE', requestId);
    }

    const viralEndpoint = deriveViralEndpoint(config.endpoint);
    const endTime = getDateStr(0);
    const startTime = getDateStr(7); // last 7 days

    // Fetch top articles for each domain keyword (concurrently, max 3 at a time)
    const allArticles: UpstreamArticle[] = [];
    const seenUrls = new Set<string>();

    const fetchForDomain = async (keyword: string) => {
        try {
            const formData = new FormData();
            formData.append('key', config.apiKey);
            formData.append('keyword', keyword);
            formData.append('pub_type', '0');
            formData.append('category', '0');
            formData.append('page', '1');
            formData.append('start_time', startTime);
            formData.append('end_time', endTime);

            const response = await fetchWithTimeout(viralEndpoint, {
                method: 'POST',
                body: formData,
            }, 15000);

            if (response.ok) {
                const data = await response.json();
                if (data?.code === 0 && Array.isArray(data.data)) {
                    return data.data as UpstreamArticle[];
                }
            }
        } catch (err) {
            console.warn(`[recommend] Failed to fetch for domain "${keyword}":`, err);
        }
        return [];
    };

    // Fetch all domains concurrently (limit to 3 concurrent)
    const batchSize = 3;
    for (let i = 0; i < domains.length; i += batchSize) {
        const batch = domains.slice(i, i + batchSize);
        const results = await Promise.all(batch.map(fetchForDomain));
        for (const articles of results) {
            for (const article of articles) {
                const key = article.url || article.title;
                if (!seenUrls.has(key)) {
                    seenUrls.add(key);
                    allArticles.push(article);
                }
            }
        }
    }

    // Sort by hot value descending, take top 15
    allArticles.sort((a, b) => (b.hot || 0) - (a.hot || 0));
    const topArticles = allArticles.slice(0, 15);

    // Store in daily cache
    cachedRecommendation = {
        date: getTodayStr(),
        articles: topArticles,
        domains,
    };
    console.log(`[recommend] Fetched fresh data: ${topArticles.length} articles, cached for ${getTodayStr()}`);

    return successResponse(
        { articles: topArticles, domains, cached: false },
        undefined,
        requestId
    );
}
