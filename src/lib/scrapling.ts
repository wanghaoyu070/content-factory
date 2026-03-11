/**
 * Scrapling Integration — Node.js wrapper for Python Scrapling StealthyFetcher.
 *
 * Used to scrape WeChat articles that block standard HTTP requests and
 * headless browsers with slider captcha verification.
 *
 * @see scripts/scrape_wechat.py for the Python implementation
 */

import { exec } from 'child_process';
import path from 'path';

export interface ScrapedArticle {
    title: string;
    text: string;
    images: string[];
    htmlLength: number;
}

/**
 * Scrape a WeChat article using Scrapling's StealthyFetcher.
 *
 * This calls a Python subprocess because Scrapling is a Python library.
 * The Python script handles WeChat's nested <span> quirk by extracting
 * html_content and stripping tags with regex.
 *
 * @param url - WeChat article URL (mp.weixin.qq.com/s/...)
 * @param timeoutMs - Maximum time to wait (default: 60s)
 * @returns Scraped article content with title, text, and image URLs
 */
export async function scrapeWechatArticle(
    url: string,
    timeoutMs: number = 60000
): Promise<ScrapedArticle> {
    const scriptPath = path.resolve(
        process.cwd(),
        'scripts/scrape_wechat.py'
    );

    return new Promise((resolve, reject) => {
        const child = exec(
            `python3 "${scriptPath}" "${url}"`,
            {
                timeout: timeoutMs,
                maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large articles
                env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
            },
            (error, stdout, stderr) => {
                if (error) {
                    console.error('[scrapling] Process error:', error.message);
                    if (stderr) console.error('[scrapling] stderr:', stderr);
                    reject(new Error(`Scrapling failed: ${error.message}`));
                    return;
                }

                try {
                    const result = JSON.parse(stdout.trim());
                    if (result.error) {
                        reject(new Error(`Scrapling error: ${result.error}`));
                        return;
                    }
                    resolve({
                        title: result.title || '',
                        text: result.text || '',
                        images: result.images || [],
                        htmlLength: result.html_length || 0,
                    });
                } catch (parseError) {
                    console.error('[scrapling] Failed to parse output:', stdout.substring(0, 500));
                    reject(new Error('Failed to parse Scrapling output'));
                }
            }
        );

        // Log the PID for debugging
        console.log(`[scrapling] Started Python process (PID: ${child.pid}) for ${url}`);
    });
}

/**
 * Check if a URL is a WeChat article that needs Scrapling.
 */
export function isWechatArticleUrl(url: string): boolean {
    return url.includes('mp.weixin.qq.com');
}

/**
 * Scrape any URL — dispatches to Scrapling for WeChat, or returns null for other URLs.
 * Other URL types should use firecrawl or read_url_content instead.
 */
export async function scrapeUrl(url: string): Promise<ScrapedArticle | null> {
    if (isWechatArticleUrl(url)) {
        try {
            return await scrapeWechatArticle(url);
        } catch (error) {
            console.error(`[scrapling] Failed to scrape ${url}:`, error);
            return null;
        }
    }
    return null;
}
