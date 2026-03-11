/**
 * Auto-Generate Pipeline
 *
 * End-to-end pipeline that transforms a MaterialLibrary into a finished article:
 *   MaterialLibrary → Supplement → AI Compose → Screenshot → Assemble → Save to DB
 *
 * This is the core of the autonomous editorial pipeline.
 */

import type { AIConfig, ChatMessage, GeneratedArticle, ScreenshotSuggestion } from './ai';
import { callAI } from './ai';
import { captureScreenshots, insertScreenshotsIntoMarkdown } from './screenshot';
import { supplementMaterials, type MaterialLibrary, type Material } from './material';
import { createArticle } from './db';
import { getAIConfig } from './config';

// ─── Fused Style Prompt (CyberZen × 卡兹克) ─────────────────────

const FUSED_STYLE_GUIDE = `CyberZen 融合风格——赛博骨架 × 卡兹克血肉。严格遵守以下规则：

【排版骨架 — CyberZen】
1. 每段不超过 2 句。关键判断独占一行
2. 用小标题划分叙事节奏，段落之间不写过渡句，直接跳切
3. 大量留白，呼吸感强

【叙事血肉 — 卡兹克】
4. 第一人称，口语化。用"你我"，多用反问句
5. 真实体验驱动："我刚试了一下"、"说实话我看到这个数据的时候"
6. 有波峰有波谷——关键数据点制造冲击（"卧槽"），然后冷静分析
7. 不装逼、不端着，用大白话解释技术概念

【内容红线】
8. 所有观点和数据必须来源于提供的素材，禁止编造
9. 每个判断都要有素材支撑——截图就是论据
10. 引用数据时标注出处（哪篇文章/哪个页面说的）
11. 禁止学术体、教程体、公关稿体`;

// ─── Material Formatting ─────────────────────────────────────────

/**
 * Format materials into a structured text block for the AI prompt.
 */
function formatMaterialsForPrompt(materials: Material[]): string {
    return materials
        .map((m, i) => {
            const parts = [
                `### 素材 ${i + 1}: ${m.title}`,
                `- 来源: ${m.source} | URL: ${m.sourceUrl}`,
                m.author ? `- 作者: ${m.author}` : '',
                m.publishedAt ? `- 发布时间: ${m.publishedAt.toISOString().split('T')[0]}` : '',
                `- 内容:`,
                m.content.length > 3000 ? m.content.substring(0, 3000) + '...(truncated)' : m.content,
            ];
            return parts.filter(Boolean).join('\n');
        })
        .join('\n\n---\n\n');
}

// ─── AI Composition ──────────────────────────────────────────────

/**
 * Compose an article from a MaterialLibrary using the fused style.
 *
 * Key difference from regular generateArticle():
 * - AI sees ALL real materials before writing
 * - AI must base every claim on provided materials
 * - Screenshots are evidence, not decoration
 */
export async function composeFromMaterials(
    config: AIConfig,
    library: MaterialLibrary
): Promise<GeneratedArticle> {
    const materialsText = formatMaterialsForPrompt(library.materials);

    // Collect all URLs that could be screenshot targets
    const screenshotCandidates = library.materials
        .filter(m => m.sourceUrl && m.sourceUrl.startsWith('http'))
        .map(m => m.sourceUrl)
        .filter((url, i, arr) => arr.indexOf(url) === i); // deduplicate

    const prompt = `你是一个微信公众号的 AI 编辑。现在给你提供了关于「${library.topic}」的一组真实素材。

请基于这些 **真实素材** 编排一篇微信公众号文章。

【创作风格】
${FUSED_STYLE_GUIDE}

【素材清单】（共 ${library.materials.length} 条）
${materialsText}

【可用的截图目标 URL】
${screenshotCandidates.map((url, i) => `${i + 1}. ${url}`).join('\n')}

【输出格式】
请返回以下 JSON（不要包含 markdown 代码块标记）:
{
  "title": "文章标题——简洁有力，可以用逗号断句",
  "content": "完整的 Markdown 文章正文。段落极短，金句独占一行",
  "summary": "摘要，100字以内",
  "imageKeywords": [],
  "xhsTags": ["AI", "科技", "深度分析", "行业观察", "技术趋势"],
  "screenshotSuggestions": [
    {
      "url": "从上面的截图目标 URL 列表中选择",
      "target": "截取该页面的哪个区域（人类可读描述）",
      "scrollTo": "目标页面上实际存在的关键文本（用于定位）",
      "captureType": "element",
      "insertAfterParagraph": 5
    }
  ]
}

【重要规则】
- imageKeywords 留空数组，本风格不使用 AI 生成的装饰图
- screenshotSuggestions 选 2-4 个，从素材 URL 中选择最有价值的截图目标
- scrollTo 必须是该素材内容中真实出现过的文本片段
- 所有引用的数据和观点必须能追溯到上面的某条素材
- 不要编造任何信息`;

    const messages: ChatMessage[] = [
        {
            role: 'system',
            content: '你是一位微信公众号 AI 编辑，擅长基于真实素材编排高质量图文并茂的文章。请始终返回有效的 JSON 格式。',
        },
        {
            role: 'user',
            content: prompt,
        },
    ];

    console.log(`[auto-gen] Composing article from ${library.materials.length} materials...`);
    const response = await callAI(config, messages);

    try {
        const cleaned = response
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        const parsed = JSON.parse(cleaned);
        return {
            title: parsed.title || `${library.topic} — 深度解析`,
            content: parsed.content || '',
            summary: parsed.summary || '',
            imageKeywords: parsed.imageKeywords || [],
            xhsTags: parsed.xhsTags || [],
            screenshotSuggestions: parsed.screenshotSuggestions || [],
        };
    } catch {
        console.error('[auto-gen] Failed to parse AI response, returning raw content');
        return {
            title: `${library.topic} — 深度解析`,
            content: response,
            summary: '',
            imageKeywords: [],
            xhsTags: [],
        };
    }
}

// ─── End-to-End Pipeline ─────────────────────────────────────────

export interface PipelineResult {
    articleId: number;
    title: string;
    topic: string;
    materialCount: number;
    screenshotCount: number;
    wordCount: number;
}

/**
 * Full autonomous article generation pipeline.
 *
 * 1. Supplement materials (scrape WeChat full text, etc.)
 * 2. AI composes article based on real materials
 * 3. Capture screenshots for evidence
 * 4. Insert screenshots into Markdown
 * 5. Save to DB as pending_review
 */
export async function autoGenerateArticle(
    library: MaterialLibrary,
    userId: number = 1
): Promise<PipelineResult> {
    console.log(`[auto-gen] ═══ Starting pipeline for "${library.topic}" ═══`);
    console.log(`[auto-gen] Materials: ${library.materials.length}, Richness: ${library.richness}`);

    // Step 1: Supplement — enrich materials with full content
    console.log('[auto-gen] Step 1/5: Supplementing materials...');
    const enriched = await supplementMaterials(library);
    console.log(`[auto-gen] ✓ Materials enriched (${enriched.materials.length} items)`);

    // Step 2: AI Compose — generate article from real materials
    console.log('[auto-gen] Step 2/5: AI composing article...');
    const aiConfig = getAIConfig();
    if (!aiConfig) {
        throw new Error('AI config not found. Set OPENAI_API_BASE_URL and OPENAI_API_KEY env vars.');
    }
    const article = await composeFromMaterials(aiConfig, enriched);
    console.log(`[auto-gen] ✓ Article composed: "${article.title}" (${article.content.length} chars)`);

    // Step 3: Screenshot — capture evidence screenshots
    let finalContent = article.content;
    let screenshotCount = 0;

    if (article.screenshotSuggestions && article.screenshotSuggestions.length > 0) {
        console.log(`[auto-gen] Step 3/5: Capturing ${article.screenshotSuggestions.length} screenshots...`);
        try {
            const screenshots = await captureScreenshots(article.screenshotSuggestions);
            screenshotCount = screenshots.length;
            console.log(`[auto-gen] ✓ Captured ${screenshotCount} screenshots`);

            // Step 4: Assemble — insert screenshots into Markdown
            if (screenshots.length > 0) {
                console.log('[auto-gen] Step 4/5: Inserting screenshots into content...');
                finalContent = insertScreenshotsIntoMarkdown(finalContent, screenshots);
                console.log('[auto-gen] ✓ Screenshots inserted');
            }
        } catch (error) {
            console.warn('[auto-gen] Screenshot capture failed, continuing without:', error);
        }
    } else {
        console.log('[auto-gen] Steps 3-4: No screenshot suggestions, skipping');
    }

    // Step 5: Save to DB
    console.log('[auto-gen] Step 5/5: Saving to database...');
    const collectedImages = enriched.materials
        .flatMap(m => m.images || [])
        .filter(Boolean)
        .slice(0, 10);

    const articleId = createArticle({
        userId,
        title: article.title,
        content: finalContent,
        markdown_content: finalContent,
        coverImage: '',
        images: collectedImages,
        source: 'auto-pipeline',
        xhsTags: article.xhsTags,
    });

    console.log(`[auto-gen] ═══ Pipeline complete ═══`);
    console.log(`[auto-gen] Article ID: ${articleId}, Title: "${article.title}"`);

    return {
        articleId,
        title: article.title,
        topic: library.topic,
        materialCount: enriched.materials.length,
        screenshotCount,
        wordCount: finalContent.length,
    };
}
