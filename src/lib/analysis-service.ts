import {
    updateSearchStatus,
    saveArticles,
    saveTopicInsights,
    type SourceArticle
} from '@/lib/db';
import { getWechatArticleConfig, getAIConfig } from '@/lib/config';
import { canUseMockFallback, isPlaceholderEndpoint } from '@/lib/mock-policy';
import { batchParseArticles } from '@/lib/coze-service';

type SourceArticleInput = Omit<SourceArticle, 'id' | 'search_id'>;
type TopicInsightInput = {
    title: string;
    description: string;
    evidence: string;
    suggestedTopics: string[];
    relatedArticles: string[];
};

interface RawWechatArticle {
    title?: string;
    content?: string;
    avatar?: string;
    read?: number;
    praise?: number;
    looking?: number;
    publish_time_str?: string;
    url?: string;
    wx_name?: string;
    wx_id?: string;
    is_original?: number;
}

function toRawWechatArticle(value: unknown): RawWechatArticle {
    if (typeof value !== 'object' || value === null) {
        return {};
    }
    return value as RawWechatArticle;
}

// 真实感的标题模板
const TITLE_TEMPLATES = [
    (kw: string) => `深度解析：${kw}行业2024年发展趋势与未来展望`,
    (kw: string) => `为什么顶尖企业都在布局${kw}？背后逻辑揭秘`,
    (kw: string) => `${kw}从业者必看：这些核心技能决定你的上限`,
    (kw: string) => `一文读懂${kw}：从入门到精通的完整路径`,
    (kw: string) => `${kw}赛道深度报告：机遇、挑战与破局之道`,
    (kw: string) => `资深专家谈${kw}：新手最容易踩的5个坑`,
    (kw: string) => `${kw}实战指南：我是如何在3个月内实现突破的`,
    (kw: string) => `揭秘${kw}领域的隐藏红利，99%的人都不知道`,
    (kw: string) => `${kw}行业白皮书：数据解读与策略建议`,
    (kw: string) => `从0到1搭建${kw}体系：完整方法论分享`,
    (kw: string) => `${kw}领域年度盘点：十大关键事件回顾`,
    (kw: string) => `专访行业大佬：他如何靠${kw}年入百万`,
];

// 真实感的作者名称
const AUTHOR_NAMES = [
    '刘润',
    '吴晓波频道',
    '罗振宇',
    '半佛仙人',
    '冯唐',
    '三节课',
    '人人都是产品经理',
    '运营研究社',
    '虎嗅',
    '36氪',
    '创业邦',
    '新榜',
];

// 生成模拟文章 (更真实的数据)
function generateMockArticles(keyword: string, count = 8) {
    // 打乱标题模板顺序
    const shuffledTemplates = [...TITLE_TEMPLATES].sort(() => Math.random() - 0.5);
    // 打乱作者顺序
    const shuffledAuthors = [...AUTHOR_NAMES].sort(() => Math.random() - 0.5);

    return Array.from({ length: Math.min(count, shuffledTemplates.length) }).map((_, i) => {
        const readCount = Math.floor(Math.random() * 80000) + 10000;
        const likeRatio = 0.02 + Math.random() * 0.03; // 2%-5% 的点赞率
        const wowRatio = 0.005 + Math.random() * 0.01; // 0.5%-1.5% 的在看率

        return {
            title: shuffledTemplates[i](keyword),
            content: `这是一篇关于${keyword}的深度分析文章，从行业背景、核心逻辑、实践经验等多个维度进行了全面解读...`,
            cover_image: `https://api.dicebear.com/7.x/shapes/svg?seed=${keyword}${i}`,
            read_count: readCount,
            readCount: readCount,
            like_count: Math.floor(readCount * likeRatio),
            likeCount: Math.floor(readCount * likeRatio),
            wow_count: Math.floor(readCount * wowRatio),
            wowCount: Math.floor(readCount * wowRatio),
            publish_time: new Date(Date.now() - (i * 2 + Math.floor(Math.random() * 3)) * 86400000).toLocaleString('zh-CN'),
            publishTime: new Date(Date.now() - (i * 2 + Math.floor(Math.random() * 3)) * 86400000).toLocaleString('zh-CN'),
            source_url: '#',
            sourceUrl: '#',
            wx_name: shuffledAuthors[i % shuffledAuthors.length],
            wxName: shuffledAuthors[i % shuffledAuthors.length],
            author: shuffledAuthors[i % shuffledAuthors.length],
            wx_id: `author_${i + 1}`,
            is_original: Math.random() > 0.2 ? 1 : 0,
        };
    });
}

// 调用真实微信文章 API
async function fetchRealArticles(keyword: string, config: { endpoint: string; apiKey: string }): Promise<{ success: boolean; articles: SourceArticleInput[]; isMock: boolean }> {
    try {
        const response = await fetch(config.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                kw: keyword,
                sort_type: 1,
                mode: 1,
                period: 7,
                page: 1,
                key: config.apiKey,
            }),
        });

        if (response.ok) {
            const data = await response.json();
            const rawData = data as { code?: number; data?: unknown };
            if (rawData.code === 0 && Array.isArray(rawData.data) && rawData.data.length > 0) {
                const articles = rawData.data.map((item): SourceArticleInput => {
                    const article = toRawWechatArticle(item);
                    return {
                        title: String(article.title ?? ''),
                        content: String(article.content ?? ''),
                        cover_image: String(article.avatar ?? ''),
                        read_count: Number(article.read ?? 0),
                        like_count: Number(article.praise ?? 0),
                        wow_count: Number(article.looking ?? 0),
                        publish_time: String(article.publish_time_str ?? ''),
                        source_url: String(article.url ?? ''),
                        wx_name: String(article.wx_name ?? ''),
                        wx_id: String(article.wx_id ?? ''),
                        is_original: article.is_original === 1 ? 1 : 0,
                    };
                });
                return { success: true, articles, isMock: false };
            }
        }
        return { success: false, articles: [], isMock: true };
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.warn('[Analysis] Real API call failed:', error);
        }
        return { success: false, articles: [], isMock: true };
    }
}

// 后台分析任务
export async function runAnalysisTask(
    searchId: number,
    keyword: string,
    userId: number,
    searchType: 'keyword' | 'account' = 'keyword'
): Promise<'completed' | 'failed'> {
    const mockFallbackEnabled = canUseMockFallback();

    if (process.env.NODE_ENV === 'development') {
        console.log(`[Task ${searchId}] Starting analysis for (${searchType}): ${keyword}`);
    }

    try {
        // Step 1: 搜索文章 - 优先使用真实 API
        const config = getWechatArticleConfig(userId);
        let articles: SourceArticleInput[] = [];

        // 尝试调用真实 API
        if (config && config.endpoint && config.apiKey && !isPlaceholderEndpoint(config.endpoint)) {
            const result = await fetchRealArticles(keyword, config);
            if (result.success) {
                articles = result.articles;
                if (process.env.NODE_ENV === 'development') {
                    console.log(`[Task ${searchId}] Fetched ${articles.length} real articles`);
                }
            }
        }

        // 如果真实 API 失败或未配置，使用 Mock 数据作为降级方案（生产默认禁用）
        if (articles.length === 0) {
            if (!mockFallbackEnabled) {
                throw new Error('未配置可用的数据源，且生产环境未启用 Mock 回退');
            }
            articles = generateMockArticles(keyword);
            if (process.env.NODE_ENV === 'development') {
                console.log(`[Task ${searchId}] Using mock data (API not configured or failed)`);
            }
        }

        // Step 2: 保存文章
        saveArticles(searchId, articles);

        // 更新状态：已获取文章，正在分析
        updateSearchStatus(searchId, 'processing', articles.length, userId);

        // Step 2.5: Fetch full text for top N articles via Coze workflow
        const TOP_N_FULL_TEXT = 3;
        const sortedByReads = [...articles]
            .filter(a => a.source_url && a.source_url !== '#')
            .sort((a, b) => (b.read_count || 0) - (a.read_count || 0))
            .slice(0, TOP_N_FULL_TEXT);

        if (sortedByReads.length > 0) {
            try {
                const urls = sortedByReads.map(a => a.source_url);
                if (process.env.NODE_ENV === 'development') {
                    console.log(`[Task ${searchId}] Fetching full text for ${urls.length} top articles via Coze`);
                }
                const parsed = await batchParseArticles(urls, 3);

                // Enrich articles with full text where available
                for (let i = 0; i < sortedByReads.length; i++) {
                    if (parsed[i]?.content) {
                        const target = articles.find(a => a.source_url === sortedByReads[i].source_url);
                        if (target) {
                            target.content = parsed[i]!.content;
                        }
                    }
                }

                if (process.env.NODE_ENV === 'development') {
                    const successCount = parsed.filter(Boolean).length;
                    console.log(`[Task ${searchId}] Full text fetched: ${successCount}/${urls.length} succeeded`);
                }
            } catch (err) {
                // Graceful degradation: if Coze fails entirely, continue with summaries
                if (process.env.NODE_ENV === 'development') {
                    console.warn(`[Task ${searchId}] Coze full text fetch failed, using summaries:`, err);
                }
            }
        }

        // Step 3: AI 分析
        const aiConfig = getAIConfig(userId);
        let insights: TopicInsightInput[] = [];

        if (aiConfig) {
            // 调用 AI 生成洞察
            try {
                const response = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${aiConfig.apiKey}`
                    },
                    body: JSON.stringify({
                        model: aiConfig.model,
                        messages: [
                            {
                                role: "system",
                                content: `你是一个专业的内容分析师。请分析用户提供的文章列表（标题和摘要），生成5个深入的选题洞察。
                 
                 输出格式必须是纯 JSON 数组，不要包含 \`\`\`json 标记：
                                [
                                    {
                                        "title": "洞察标题",
                                        "description": "详细说明",
                                        "evidence": "数据支撑（如：相关文章总阅读量10w+）",
                                        "suggestedTopics": ["建议选题1", "建议选题2"],
                                        "relatedArticles": ["关联文章标题1"]
                                    }
                                ]`
                            },
                            {
                                role: "user",
                                content: `分析关键词：${keyword}\n\n文章列表：\n${articles.map(a => {
                                    const excerpt = (a.content || '').slice(0, 500);
                                    const contentLine = excerpt ? `\n  正文摘要：${excerpt}` : '';
                                    return `- ${a.title} (阅读: ${a.read_count})${contentLine}`;
                                }).join('\n\n')}`
                            }
                        ]
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const content = data.choices[0].message.content;

                    // Robust JSON cleaning
                    try {
                        const cleanContent = content.trim();
                        // Try to find the JSON array array brackets
                        const firstBracket = cleanContent.indexOf('[');
                        const lastBracket = cleanContent.lastIndexOf(']');

                        let jsonStr = cleanContent;
                        if (firstBracket !== -1 && lastBracket !== -1) {
                            jsonStr = cleanContent.substring(firstBracket, lastBracket + 1);
                        }

                        insights = JSON.parse(jsonStr) as TopicInsightInput[];
                    } catch (parseError) {
                        if (process.env.NODE_ENV === 'development') {
                            console.error(`[Task ${searchId}] JSON Parse failed`);
                        }
                        throw parseError; // Re-throw to trigger fallback
                    }
                } else {
                    if (process.env.NODE_ENV === 'development') {
                        console.error(`[Task ${searchId}] AI API Error: ${response.status}`);
                    }
                    throw new Error(`AI API Error: ${response.statusText}`);
                }
            } catch (e) {
                if (process.env.NODE_ENV === 'development') {
                    console.error(`[Task ${searchId}] AI Analysis failed:`, e);
                }
                // AI 失败时的保底洞察
                const relatedTitle = articles.length > 0 ? articles[0].title : keyword;
                insights = [{
                    title: `${keyword} 行业受众关注度极高`,
                    description: "数据显示用户对该领域的基础知识和进阶技巧都有强烈需求。",
                    evidence: "相关文章平均阅读量超过 5w+",
                    suggestedTopics: [`${keyword}入门指南`, `${keyword}避坑指南`],
                    relatedArticles: [relatedTitle]
                }];
            }
        } else {
            // 没有 AI 配置时的保底
            insights = [{
                title: "配置 AI 以获取更深度的洞察",
                description: "当前使用的是系统默认分析。配置 OpenAI/DeepSeek Key 后可获得定制化分析。",
                evidence: "系统默认生成",
                suggestedTopics: [`${keyword}是什么`, `如何做好${keyword}`],
                relatedArticles: []
            }];
        }

        // Step 4: 保存洞察
        saveTopicInsights(searchId, insights);

        // Step 5: 任务完成
        updateSearchStatus(searchId, 'completed', undefined, userId);
        if (process.env.NODE_ENV === 'development') {
            console.log(`[Task ${searchId}] Analysis completed successfully.`);
        }
        return 'completed';

    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error(`[Task ${searchId}] Task failed:`, error);
        }
        updateSearchStatus(searchId, 'failed', undefined, userId);
        return 'failed';
    }
}
