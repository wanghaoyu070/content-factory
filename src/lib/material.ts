/**
 * Material Aggregation Service
 *
 * Aggregates materials from Second Brain (via Search Engine API and Feishu Bitable)
 * into a structured MaterialLibrary for article generation.
 *
 * Data flow:
 *   Search Engine (localhost:8900) → semantic search + topic clusters
 *   Feishu Bitable → raw records with full content
 *   Scrapling → WeChat article full text (supplement)
 *   Playwright → page screenshots (supplement)
 */

import { scrapeWechatArticle, isWechatArticleUrl } from './scrapling';

// ─── Core Data Structures ────────────────────────────────────────

export interface Material {
    title: string;
    content: string;
    source: string;         // "twitter" | "wechat" | "web" | "feishu" | etc.
    sourceUrl: string;
    author?: string;
    images?: string[];
    publishedAt?: Date;
    /** Similarity score from semantic search (0-1) */
    relevance?: number;
}

export interface CapturedScreenshot {
    url: string;
    imageBase64: string;
    alt: string;
    description: string;
}

export interface MaterialLibrary {
    topic: string;
    materials: Material[];
    screenshots: CapturedScreenshot[];
    richness: number;       // 0-100 maturity score
    readyToWrite: boolean;
    detectedAt: Date;
    /** Cluster ID from Search Engine, if any */
    clusterId?: string;
}

// ─── Search Engine Integration ───────────────────────────────────

const SEARCH_ENGINE_BASE = 'http://127.0.0.1:8900';

interface SearchResult {
    id: string;
    title: string;
    content: string;
    source?: string;
    url?: string;
    author?: string;
    images?: string;
    tags?: string;
    similarity: number;
    created_at?: string;
}

interface ClusterResult {
    id: number;
    label: string;
    documents: {
        id: string;
        title: string;
        content: string;
        source?: string;
        url?: string;
        tags?: string;
        created_at?: string;
    }[];
    size: number;
}

/**
 * Search Second Brain for materials related to a topic.
 */
async function searchSecondBrain(topic: string, topK: number = 20): Promise<SearchResult[]> {
    try {
        const res = await fetch(
            `${SEARCH_ENGINE_BASE}/api/search?q=${encodeURIComponent(topic)}&top_k=${topK}`
        );
        if (!res.ok) {
            console.warn(`[material] Search Engine returned ${res.status}`);
            return [];
        }
        const data = await res.json();
        return data.results || [];
    } catch (error) {
        console.warn('[material] Search Engine unavailable:', error);
        return [];
    }
}

/**
 * Get topic clusters from Second Brain.
 */
async function getTopicClusters(): Promise<ClusterResult[]> {
    try {
        const res = await fetch(`${SEARCH_ENGINE_BASE}/api/clusters`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.clusters || [];
    } catch (error) {
        console.warn('[material] Search Engine clusters unavailable:', error);
        return [];
    }
}

// ─── Material Richness Scoring ───────────────────────────────────

/**
 * Calculate how "ready" a set of materials is for article generation.
 *
 * Scoring breakdown (max 100):
 *   - Has official/primary source: 25 pts
 *   - Community voices (capped at 2): 15 pts each = 30 pts max
 *   - Has screenshottable targets: 20 pts
 *   - Total material count (capped at 5): 5 pts each = 25 pts max
 */
export function scoreMaterialRichness(materials: Material[]): number {
    if (materials.length === 0) return 0;

    const officialSources = ['openai.com', 'anthropic.com', 'google.com', 'deepmind.com', 'github.com'];
    const hasOfficialSource = materials.some(m =>
        officialSources.some(s => m.sourceUrl?.includes(s))
    );

    const uniqueAuthors = new Set(materials.filter(m => m.author).map(m => m.author));
    const communityVoices = Math.min(uniqueAuthors.size, 2);

    const hasScreenshotTarget = materials.some(m =>
        m.sourceUrl && (m.sourceUrl.startsWith('http://') || m.sourceUrl.startsWith('https://'))
    );

    const totalCount = Math.min(materials.length, 5);

    return (
        (hasOfficialSource ? 25 : 0) +
        communityVoices * 15 +
        (hasScreenshotTarget ? 20 : 0) +
        totalCount * 5
    );
}

// ─── Main Aggregation Function ───────────────────────────────────

/**
 * Aggregate materials for a given topic from all available sources.
 *
 * 1. Semantic search in Second Brain
 * 2. Convert search results to Material format
 * 3. Score richness
 * 4. Return structured MaterialLibrary
 */
export async function aggregateMaterials(topic: string): Promise<MaterialLibrary> {
    console.log(`[material] Aggregating materials for topic: "${topic}"`);

    // Step 1: Search Second Brain
    const searchResults = await searchSecondBrain(topic, 20);
    console.log(`[material] Found ${searchResults.length} results from Search Engine`);

    // Step 2: Convert to Material format
    const materials: Material[] = searchResults
        .filter(r => r.similarity > 0.3) // Only relevant results
        .map(r => ({
            title: r.title || '',
            content: r.content || '',
            source: r.source || 'unknown',
            sourceUrl: r.url || '',
            author: r.author,
            images: r.images ? r.images.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
            publishedAt: r.created_at ? new Date(r.created_at) : undefined,
            relevance: r.similarity,
        }));

    // Step 3: Score richness
    const richness = scoreMaterialRichness(materials);
    console.log(`[material] Richness score: ${richness}/100 (${materials.length} materials)`);

    return {
        topic,
        materials,
        screenshots: [],
        richness,
        readyToWrite: richness >= 60,
        detectedAt: new Date(),
    };
}

// ─── Material Supplementation ────────────────────────────────────

/**
 * Enrich a MaterialLibrary by scraping full content from WeChat articles
 * that were only partially captured in Second Brain.
 */
export async function supplementMaterials(library: MaterialLibrary): Promise<MaterialLibrary> {
    console.log(`[material] Supplementing ${library.materials.length} materials...`);

    const enrichedMaterials = [...library.materials];

    for (const material of enrichedMaterials) {
        // Supplement WeChat articles with full text via Scrapling
        if (isWechatArticleUrl(material.sourceUrl) && material.content.length < 500) {
            console.log(`[material] Scraping full WeChat article: ${material.sourceUrl}`);
            try {
                const scraped = await scrapeWechatArticle(material.sourceUrl);
                if (scraped.text.length > material.content.length) {
                    material.content = scraped.text;
                    material.title = scraped.title || material.title;
                    material.images = scraped.images;
                    console.log(`[material] ✓ Enriched with ${scraped.text.length} chars`);
                }
            } catch (error) {
                console.warn(`[material] Failed to scrape ${material.sourceUrl}:`, error);
            }
        }
    }

    return {
        ...library,
        materials: enrichedMaterials,
        richness: scoreMaterialRichness(enrichedMaterials),
    };
}

// ─── Cluster-based Topic Discovery ──────────────────────────────

/**
 * Discover mature topics by scanning Search Engine clusters.
 * Returns topics that have enough materials and are recent enough.
 */
export async function discoverMatureTopics(): Promise<MaterialLibrary[]> {
    const clusters = await getTopicClusters();
    const matureTopics: MaterialLibrary[] = [];

    for (const cluster of clusters) {
        // Skip small clusters
        if (cluster.size < 3) continue;

        // Check recency — at least one document from the last 48 hours
        const now = Date.now();
        const hasRecent = cluster.documents.some(doc => {
            if (!doc.created_at) return false;
            const docTime = new Date(doc.created_at).getTime();
            return now - docTime < 48 * 60 * 60 * 1000;
        });
        if (!hasRecent) continue;

        // Convert cluster documents to materials
        const materials: Material[] = cluster.documents.map(doc => ({
            title: doc.title || '',
            content: doc.content || '',
            source: doc.source || 'unknown',
            sourceUrl: doc.url || '',
            publishedAt: doc.created_at ? new Date(doc.created_at) : undefined,
        }));

        const richness = scoreMaterialRichness(materials);
        if (richness >= 60) {
            matureTopics.push({
                topic: cluster.label,
                materials,
                screenshots: [],
                richness,
                readyToWrite: true,
                detectedAt: new Date(),
                clusterId: String(cluster.id),
            });
        }
    }

    console.log(`[material] Discovered ${matureTopics.length} mature topics from ${clusters.length} clusters`);
    return matureTopics;
}
