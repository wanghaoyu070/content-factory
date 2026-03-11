import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { getAIConfig } from '@/lib/config';
import {
    badRequestResponse,
    createRequestId,
    errorResponse,
    successResponseWithMeta,
    unauthorizedResponse,
} from '@/lib/api-response';
import { parseArticleViaCoze } from '@/lib/coze-service';

/**
 * POST /api/viral-articles/analyze
 *
 * Accepts a single article's URL + title + metadata,
 * fetches the full text via Coze, then runs an AI deep-analysis.
 */
export async function POST(request: NextRequest) {
    const requestId = createRequestId();

    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorizedResponse('请先登录', requestId);
        }

        const body = await request.json();
        const { url, title, readNum, avgReads, fans, hot } = body as {
            url?: string;
            title?: string;
            readNum?: number;
            avgReads?: number;
            fans?: number;
            hot?: number;
        };

        if (!url || url === '#') {
            return badRequestResponse('缺少文章链接', requestId);
        }

        // Step 1: Fetch full text via Coze workflow
        let fullText = '';
        try {
            const parsed = await parseArticleViaCoze(url);
            if (parsed?.content) {
                fullText = parsed.content;
            }
        } catch (err) {
            console.warn(`[analyze ${requestId}] Coze parsing failed, continuing without full text:`, err);
        }

        // Step 2: Get AI config
        const userId = session.user.id ? Number(session.user.id) : undefined;
        const aiConfig = getAIConfig(userId);
        if (!aiConfig) {
            return errorResponse('未配置 AI 服务，请在设置中配置 OpenAI/DeepSeek Key', 503, 'AI_NOT_CONFIGURED', requestId);
        }

        // Step 3: Build analysis prompt
        const articleContext = [
            `标题：${title || '未知'}`,
            `阅读量：${readNum?.toLocaleString() || '未知'}`,
            `日常平均阅读：${avgReads?.toLocaleString() || '未知'}`,
            `爆文指数（hot）：${hot || '未知'}x`,
            `粉丝数：${fans?.toLocaleString() || '未知'}`,
        ].join('\n');

        const contentSection = fullText
            ? `\n\n文章正文（前2000字）：\n${fullText.slice(0, 2000)}`
            : '\n\n（未能获取到文章正文，仅基于标题和数据分析）';

        const systemPrompt = `你是一位资深的内容策略分析师，擅长拆解微信公众号爆款文章。请从以下维度深度分析这篇爆文，并给出可复制的写作建议。

输出格式必须是纯 JSON 对象（不要包含 \`\`\`json 标记），结构如下：
{
  "viralReason": "这篇文章能爆的核心原因（2-3句话）",
  "titleAnalysis": "标题策略拆解（用了什么套路，如反常识、数字、悬念等）",
  "structureBreakdown": "内容结构拆解（开头、中段、结尾分别是怎么写的）",
  "writingTechniques": ["写作技巧1", "写作技巧2", "写作技巧3"],
  "replicableFormula": "可复制的写作公式（一句话总结这篇文章的套路）",
  "suggestedTopics": ["基于此爆文可以衍生的选题1", "选题2", "选题3"]
}`;

        const userPrompt = `请拆解以下爆款文章：\n\n${articleContext}${contentSection}`;

        // Step 4: Call AI
        const aiResponse = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${aiConfig.apiKey}`,
            },
            body: JSON.stringify({
                model: aiConfig.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.7,
            }),
        });

        if (!aiResponse.ok) {
            const errText = await aiResponse.text().catch(() => 'unknown');
            console.error(`[analyze ${requestId}] AI API error: ${aiResponse.status} ${errText}`);
            return errorResponse('AI 分析失败，请稍后重试', 502, 'AI_ERROR', requestId);
        }

        const aiData = await aiResponse.json();
        const rawContent = aiData.choices?.[0]?.message?.content || '';

        // Parse the JSON response from AI
        let analysis;
        try {
            const cleaned = rawContent.trim();
            const firstBrace = cleaned.indexOf('{');
            const lastBrace = cleaned.lastIndexOf('}');
            const jsonStr = (firstBrace !== -1 && lastBrace !== -1)
                ? cleaned.substring(firstBrace, lastBrace + 1)
                : cleaned;
            analysis = JSON.parse(jsonStr);
        } catch {
            // If JSON parsing fails, return the raw text as a fallback
            analysis = {
                viralReason: rawContent.slice(0, 200),
                titleAnalysis: '解析失败，请查看原始分析文本',
                structureBreakdown: rawContent,
                writingTechniques: [],
                replicableFormula: '',
                suggestedTopics: [],
            };
        }

        return successResponseWithMeta(
            {
                analysis,
                hasFullText: fullText.length > 0,
                fullTextLength: fullText.length,
            },
            { source: 'ai' as const },
            200,
            requestId
        );

    } catch (error) {
        console.error(`[API ${requestId}] Error in viral-articles/analyze:`, error);
        return errorResponse('分析失败', 500, 'INTERNAL_ERROR', requestId);
    }
}
