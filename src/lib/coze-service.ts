// Coze Workflow parsing service
// Migrated from second-brain/twitter-parser-api/src/services/coze.service.js
// Calls the Coze API to extract clean article text from any URL

const COZE_API_URL = 'https://api.coze.cn/v1/workflow/run';
const COZE_TIMEOUT = 30_000; // 30s — parsing can be slow

/** Structured result from Coze workflow */
export interface CozeParseResult {
    title: string;
    content: string;   // Clean plain-text body — the key value
    banner: string;
    images: string[];
    tags: string[];
    source: string;    // Domain hostname
}

/**
 * Get the Coze config from environment variables.
 * Returns null if COZE_API_TOKEN is missing.
 */
export function getCozeConfig(): { apiToken: string; workflowId: string } | null {
    const apiToken = process.env.COZE_API_TOKEN;
    if (!apiToken) return null;
    const workflowId = process.env.COZE_WORKFLOW_ID || '7599497963701911562';
    return { apiToken, workflowId };
}

/**
 * Parse a URL through Coze workflow and return clean structured data.
 * The key advantage: `content` is already cleaned plain text — no HTML cleanup needed.
 *
 * @param url - The article URL to parse (e.g. a WeChat article link)
 * @returns Parsed article with clean text, or null on failure
 */
export async function parseArticleViaCoze(url: string): Promise<CozeParseResult | null> {
    const config = getCozeConfig();
    if (!config) {
        console.warn('[CozeService] COZE_API_TOKEN not configured, skipping');
        return null;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), COZE_TIMEOUT);

        const response = await fetch(COZE_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.apiToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                workflow_id: config.workflowId,
                parameters: {
                    url,
                    notes: '',
                    orderid: '',
                    knowledgeurl: '',
                },
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error(`[CozeService] HTTP ${response.status}: ${response.statusText}`);
            return null;
        }

        const json = await response.json();

        if (json.code !== 0) {
            console.error(`[CozeService] API Error: ${json.msg}`);
            return null;
        }

        // Parse the nested result — Coze sometimes returns a JSON string
        let rawResult = json.data;
        if (typeof rawResult === 'string') {
            try {
                rawResult = JSON.parse(rawResult);
            } catch {
                // Non-JSON string — use as-is
            }
        }

        // Adapt to Coze workflow's body[0].fields structure
        const fields = rawResult?.body?.[0]?.fields || rawResult || {};

        // Clean image URLs — Coze sometimes returns "图1=(http...)" format
        const cleanUrl = (maybeUrl: unknown): string => {
            if (typeof maybeUrl !== 'string') return '';
            const match = maybeUrl.match(/\((https?:\/\/[^)]+)\)/);
            return match ? match[1] : maybeUrl;
        };

        const rawImages = fields['图片链接'];
        const images = Array.isArray(rawImages)
            ? rawImages.map(cleanUrl)
            : rawImages ? [cleanUrl(rawImages)] : [];

        let hostname = '';
        try {
            hostname = new URL(url).hostname.replace('www.', '');
        } catch { /* ignore invalid URLs */ }

        return {
            title: fields['标题'] || rawResult?.title || '未命名',
            content: fields['内容文本'] || rawResult?.content || '',
            banner: cleanUrl(fields['封面链接'] || fields['图片链接'] || rawResult?.image || ''),
            images,
            tags: fields['标签'] || [],
            source: fields['域名'] || hostname,
        };
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            console.warn(`[CozeService] Timeout parsing: ${url}`);
        } else {
            console.error(`[CozeService] Failed to parse: ${url}`, error);
        }
        return null;
    }
}

/**
 * Batch-parse multiple URLs concurrently (with concurrency limit).
 * Failed items return null and do not block the batch.
 *
 * @param urls - Array of article URLs to parse
 * @param concurrency - Max concurrent requests (default 3)
 * @returns Array of results (null entries mean that URL failed)
 */
export async function batchParseArticles(
    urls: string[],
    concurrency = 3
): Promise<(CozeParseResult | null)[]> {
    const results: (CozeParseResult | null)[] = new Array(urls.length).fill(null);

    // Process in chunks to respect concurrency limit
    for (let i = 0; i < urls.length; i += concurrency) {
        const chunk = urls.slice(i, i + concurrency);
        const chunkResults = await Promise.allSettled(
            chunk.map(url => parseArticleViaCoze(url))
        );

        chunkResults.forEach((result, j) => {
            results[i + j] = result.status === 'fulfilled' ? result.value : null;
        });
    }

    return results;
}
