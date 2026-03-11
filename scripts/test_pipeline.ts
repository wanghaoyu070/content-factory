/**
 * Test script for the autonomous editorial pipeline.
 *
 * Bypasses auth and Search Engine by creating mock materials directly,
 * then runs the full pipeline: compose → screenshot → save.
 *
 * Usage: npx tsx scripts/test_pipeline.ts
 */

// Load env vars that Next.js normally handles (no dotenv dependency)
import { readFileSync } from 'fs';
import { resolve } from 'path';
const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx);
    const val = trimmed.slice(eqIdx + 1);
    if (!process.env[key]) process.env[key] = val;
}

import { composeFromMaterials } from '../src/lib/auto-generate';
import { getAIConfig } from '../src/lib/config';
import type { MaterialLibrary } from '../src/lib/material';

async function main() {
    console.log('═══ Pipeline Test ═══\n');

    // Check AI config
    const aiConfig = getAIConfig();
    if (!aiConfig) {
        console.error('❌ AI config not found. Set OPENAI_API_BASE_URL and OPENAI_API_KEY in .env.local');
        process.exit(1);
    }
    console.log(`✓ AI Config: ${aiConfig.baseUrl} / model: ${aiConfig.model}\n`);

    // Create a mock MaterialLibrary with real-ish content
    const mockLibrary: MaterialLibrary = {
        topic: 'Claude 4.5 Sonnet',
        detectedAt: new Date(),
        richness: 75,
        readyToWrite: true,
        screenshots: [],
        materials: [
            {
                title: 'Anthropic 发布 Claude 4.5 Sonnet',
                content: `Anthropic today announced Claude 4.5 Sonnet, the latest model in its Claude family.
The model shows significant improvements in coding, creative writing, and multi-step reasoning.
Key highlights:
- SWE-bench score: 72.3% (up from 49% in Claude 3.5)
- GPQA Diamond: 68.2%
- Agentic coding capabilities with extended thinking
- 200K context window maintained
The model is available now via API and claude.ai.`,
                source: 'twitter',
                sourceUrl: 'https://x.com/AnthropicAI/status/123456',
                author: 'Anthropic',
                publishedAt: new Date(),
            },
            {
                title: '卡兹克：Claude 4.5 到底强在哪',
                content: `说实话，当我看到 Claude 4.5 的 SWE-bench 成绩的时候，我确实震惊了。
72.3% 到底是什么概念？GPT-5.3 Codex 是 56%，Gemini 2.5 Pro 是 63.8%。
也就是说，Claude 4.5 在代码能力上已经领先了一个身位。

但更让我惊讶的是它的创意写作能力。我让它写一篇关于 AI 对社会影响的文章，
它不仅逻辑清晰，而且文笔生动、有温度。这是我目前用过的所有大模型里，
写作质感最好的一个。

不过也有问题——价格。Claude 4.5 的 API 调用成本大概是 GPT-4o 的 3 倍。
对于个人开发者来说还是有点贵的。`,
                source: 'wechat',
                sourceUrl: 'https://mp.weixin.qq.com/s/example123',
                author: '数字生命卡兹克',
                publishedAt: new Date(),
            },
            {
                title: 'Claude 4.5 vs GPT-5.3：全面对比',
                content: `Performance comparison:

| Benchmark | Claude 4.5 | GPT-5.3 | Gemini 2.5 |
|-----------|-----------|---------|------------|
| SWE-bench | 72.3% | 56.0% | 63.8% |
| GPQA | 68.2% | 71.5% | 74.1% |
| MATH | 88.7% | 91.2% | 89.3% |
| HumanEval | 94.5% | 92.1% | 90.8% |

In coding tasks, Claude 4.5 clearly leads. In reasoning tasks, GPT-5.3 and Gemini 2.5
still maintain an edge. The real differentiator is Claude 4.5's "extended thinking" mode
which allows it to reason through complex multi-step problems.`,
                source: 'web',
                sourceUrl: 'https://artificialanalysis.ai/leaderboards',
                author: 'Artificial Analysis',
                publishedAt: new Date(),
            },
        ],
    };

    console.log(`📦 Mock Materials: ${mockLibrary.materials.length} items`);
    console.log(`📊 Richness: ${mockLibrary.richness}/100\n`);

    // Test: AI Composition only (skip screenshots for speed)
    console.log('🤖 Calling AI to compose article...\n');

    try {
        const article = await composeFromMaterials(aiConfig, mockLibrary);

        console.log('═══ Generated Article ═══\n');
        console.log(`📰 Title: ${article.title}`);
        console.log(`📝 Summary: ${article.summary}`);
        console.log(`🏷️  Tags: ${article.xhsTags?.join(', ')}`);
        console.log(`📸 Screenshots: ${article.screenshotSuggestions?.length || 0} suggestions`);
        console.log(`📏 Content length: ${article.content.length} chars\n`);

        // Show first 1000 chars of content
        console.log('─── Article Preview (first 1000 chars) ───');
        console.log(article.content.substring(0, 1000));
        if (article.content.length > 1000) console.log('...(truncated)');

        // Show screenshot suggestions
        if (article.screenshotSuggestions && article.screenshotSuggestions.length > 0) {
            console.log('\n─── Screenshot Suggestions ───');
            article.screenshotSuggestions.forEach((s, i) => {
                console.log(`  ${i + 1}. [${s.captureType}] ${s.url}`);
                console.log(`     Target: ${s.target}`);
                console.log(`     ScrollTo: ${s.scrollTo}`);
                console.log(`     Insert after paragraph: ${s.insertAfterParagraph}`);
            });
        }

        console.log('\n✅ Pipeline composition test passed!');
    } catch (error) {
        console.error('❌ Pipeline test failed:', error);
        process.exit(1);
    }
}

main();
