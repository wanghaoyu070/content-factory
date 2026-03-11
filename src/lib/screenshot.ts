/**
 * Playwright-based precise screenshot service for CyberZen articles.
 *
 * Strategy C: text-locator + ancestor-traversal.
 * 1. Open the target URL with headless Chromium
 * 2. Find the element matching the `scrollTo` text
 * 3. Traverse up to a meaningful container (section/figure/table/article)
 * 4. Capture an element-level screenshot of that container
 * 5. Return Base64-encoded PNG for inline embedding
 */

import { chromium, type Browser, type Page, type Locator } from 'playwright';

// Re-export the interface so route.ts can import from one place
export interface ScreenshotSuggestion {
    url: string;                    // Target page URL
    target: string;                 // Human description of what to capture
    insertAfterParagraph: number;   // Insert after which paragraph (1-indexed)
    scrollTo: string;               // Text to search for on the page
    captureType: 'element' | 'viewport'; // Capture strategy
}

export interface ScreenshotResult {
    base64: string;                 // Base64-encoded PNG (no data: prefix)
    alt: string;                    // Alt text derived from target
    insertAfterParagraph: number;   // Where to insert in the article
}

// Meaningful container tags for ancestor traversal
const CONTAINER_TAGS = ['section', 'figure', 'table', 'article', 'main'];
const MIN_CONTAINER_AREA = 200 * 100; // minimum 200x100 px to be "meaningful"

/**
 * Attempt to find a meaningful ancestor container around the target element.
 * Walks up the DOM tree looking for semantic containers or divs with
 * sufficient visual area.
 */
async function findMeaningfulContainer(
    page: Page,
    target: Locator
): Promise<Locator | null> {
    try {
        const handle = await target.elementHandle({ timeout: 3000 });
        if (!handle) return null;

        // Use page.evaluate to walk up the DOM and find a good container
        const selector = await page.evaluate((el) => {
            let current = el.parentElement;
            let depth = 0;
            const maxDepth = 8; // don't go too far up

            while (current && depth < maxDepth) {
                const tag = current.tagName.toLowerCase();
                const containerTags = ['section', 'figure', 'table', 'article', 'main'];

                // Found a semantic container
                if (containerTags.includes(tag)) {
                    // Build a unique selector via nth-of-type
                    const parent = current.parentElement;
                    if (parent) {
                        const siblings = Array.from(parent.children).filter(
                            (c) => c.tagName === current!.tagName
                        );
                        const idx = siblings.indexOf(current) + 1;
                        // Use a data attribute or generate a temporary ID
                        const tempId = `pw-screenshot-target-${Date.now()}`;
                        current.setAttribute('data-pw-id', tempId);
                        return `[data-pw-id="${tempId}"]`;
                    }
                }

                // Check div with enough visual area
                if (tag === 'div') {
                    const rect = current.getBoundingClientRect();
                    const area = rect.width * rect.height;
                    if (area >= 200 * 100 && rect.width >= 300) {
                        const tempId = `pw-screenshot-target-${Date.now()}`;
                        current.setAttribute('data-pw-id', tempId);
                        return `[data-pw-id="${tempId}"]`;
                    }
                }

                current = current.parentElement;
                depth++;
            }
            return null;
        }, handle);

        if (selector) {
            return page.locator(selector).first();
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Capture a single screenshot based on a ScreenshotSuggestion.
 * Implements fallback chain:
 * 1. Text locator → ancestor container → element screenshot
 * 2. Text locator direct → element screenshot with padding
 * 3. CSS selector fallback → element screenshot
 * 4. Full viewport fallback
 */
async function captureSingle(
    page: Page,
    suggestion: ScreenshotSuggestion
): Promise<Buffer> {
    const { scrollTo, captureType } = suggestion;

    // Strategy 1: text-based locator + ancestor traversal
    if (scrollTo && captureType === 'element') {
        // Try exact text first, then partial
        const textTarget = page.locator(`text="${scrollTo}"`).first();
        const isVisible = await textTarget.isVisible({ timeout: 3000 }).catch(() => false);

        if (isVisible) {
            await textTarget.scrollIntoViewIfNeeded({ timeout: 3000 });
            await page.waitForTimeout(500); // let animations settle

            const container = await findMeaningfulContainer(page, textTarget);
            if (container) {
                const isContainerVisible = await container.isVisible({ timeout: 2000 }).catch(() => false);
                if (isContainerVisible) {
                    console.log(`[screenshot] Element capture via container for "${scrollTo}"`);
                    return await container.screenshot({ type: 'png' });
                }
            }

            // Fallback: screenshot the text element itself with extra padding via clip
            console.log(`[screenshot] No container found, using viewport clip for "${scrollTo}"`);
            const box = await textTarget.boundingBox();
            if (box) {
                // Expand the box to capture surrounding context
                const padding = 100;
                const clip = {
                    x: Math.max(0, box.x - padding),
                    y: Math.max(0, box.y - padding * 2),
                    width: Math.min(1280, box.width + padding * 2),
                    height: Math.min(800, box.height + padding * 6),
                };
                return await page.screenshot({ type: 'png', clip });
            }
        }

        // Try partial text match
        const partialTarget = page.locator(`text=${scrollTo}`).first();
        const partialVisible = await partialTarget.isVisible({ timeout: 2000 }).catch(() => false);
        if (partialVisible) {
            await partialTarget.scrollIntoViewIfNeeded({ timeout: 3000 });
            await page.waitForTimeout(500);
            console.log(`[screenshot] Partial text match viewport capture for "${scrollTo}"`);
            return await page.screenshot({ type: 'png' });
        }
    }

    // Strategy 2: try scrollTo as CSS selector
    if (scrollTo) {
        try {
            const cssTarget = page.locator(scrollTo).first();
            const cssVisible = await cssTarget.isVisible({ timeout: 2000 }).catch(() => false);
            if (cssVisible) {
                await cssTarget.scrollIntoViewIfNeeded({ timeout: 3000 });
                await page.waitForTimeout(500);
                console.log(`[screenshot] CSS selector capture for "${scrollTo}"`);
                return await cssTarget.screenshot({ type: 'png' });
            }
        } catch {
            // Not a valid CSS selector, ignore
        }
    }

    // Strategy 3: full viewport fallback
    console.log(`[screenshot] Viewport fallback for "${scrollTo}"`);
    return await page.screenshot({ type: 'png' });
}

/**
 * Main entry point: capture screenshots for all suggestions.
 * Shares a single browser instance across all captures.
 */
export async function captureScreenshots(
    suggestions: ScreenshotSuggestion[]
): Promise<ScreenshotResult[]> {
    if (!suggestions.length) return [];

    let browser: Browser | null = null;
    const results: ScreenshotResult[] = [];

    try {
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        // Group suggestions by URL to avoid opening the same page twice
        const byUrl = new Map<string, ScreenshotSuggestion[]>();
        for (const s of suggestions) {
            const list = byUrl.get(s.url) || [];
            list.push(s);
            byUrl.set(s.url, list);
        }

        for (const [url, urlSuggestions] of byUrl) {
            const context = await browser.newContext({
                viewport: { width: 1280, height: 800 },
                locale: 'en-US',
            });
            const page = await context.newPage();

            try {
                console.log(`[screenshot] Opening ${url}`);
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

                // Smart wait: wait for any scrollTo text to appear on the page
                // This handles React SPAs that render content asynchronously
                const scrollToTexts = urlSuggestions
                    .map(s => s.scrollTo)
                    .filter(Boolean);

                if (scrollToTexts.length > 0) {
                    const waitPromises = scrollToTexts.map(text =>
                        page.locator(`text="${text}"`).first()
                            .waitFor({ state: 'visible', timeout: 15000 })
                            .then(() => {
                                console.log(`[screenshot] ✓ Text "${text}" appeared on page`);
                                return true;
                            })
                            .catch(() => false)
                    );
                    // Wait for ANY text to become visible (race)
                    const anyFound = await Promise.any(
                        waitPromises.map(p => p.then(v => { if (!v) throw new Error('not found'); return v; }))
                    ).catch(() => false);

                    if (anyFound) {
                        await page.waitForTimeout(500); // brief settle after text appears
                        console.log(`[screenshot] Page content ready`);
                    } else {
                        console.log(`[screenshot] ⚠ No scrollTo text found within 15s, proceeding with current state`);
                        await page.waitForTimeout(1000); // extra buffer
                    }
                } else {
                    await page.waitForTimeout(3000); // no scrollTo texts, fixed wait
                }

                for (const suggestion of urlSuggestions) {
                    try {
                        const buffer = await captureSingle(page, suggestion);
                        results.push({
                            base64: buffer.toString('base64'),
                            alt: suggestion.target,
                            insertAfterParagraph: suggestion.insertAfterParagraph,
                        });
                        console.log(`[screenshot] ✓ Captured: "${suggestion.target}"`);
                    } catch (err) {
                        console.error(`[screenshot] ✗ Failed for "${suggestion.target}":`, err);
                        // Take viewport screenshot as ultimate fallback
                        try {
                            const fallback = await page.screenshot({ type: 'png' });
                            results.push({
                                base64: fallback.toString('base64'),
                                alt: suggestion.target,
                                insertAfterParagraph: suggestion.insertAfterParagraph,
                            });
                        } catch {
                            // Skip this suggestion entirely
                        }
                    }
                }
            } catch (err) {
                console.error(`[screenshot] Failed to load ${url}:`, err);
            } finally {
                await context.close();
            }
        }
    } finally {
        if (browser) await browser.close();
    }

    return results;
}

/**
 * Insert screenshot results into Markdown content at the correct positions.
 * Screenshots are inserted as Base64 inline images after the specified paragraph.
 */
export function insertScreenshotsIntoMarkdown(
    markdown: string,
    screenshots: ScreenshotResult[]
): string {
    if (!screenshots.length) return markdown;

    // Sort by insertAfterParagraph descending so insertions don't shift indices
    const sorted = [...screenshots].sort(
        (a, b) => b.insertAfterParagraph - a.insertAfterParagraph
    );

    // Split into paragraphs (blocks separated by blank lines)
    const blocks = markdown.split(/\n\n/);

    for (const shot of sorted) {
        const idx = Math.min(shot.insertAfterParagraph, blocks.length);
        const imgTag = `![${shot.alt}](data:image/png;base64,${shot.base64})`;
        blocks.splice(idx, 0, imgTag);
    }

    return blocks.join('\n\n');
}
