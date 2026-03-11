import { auth } from '@/auth';
import {
  getArticlesBySearchId,
  saveArticleSummary,
  saveTopicInsights,
  getTopicInsightsBySearchId,
  getArticleSummariesBySearchId,
  deleteInsightsBySearchId,
  deleteSummariesBySearchId,
  getSearchById,
} from '@/lib/db';
import { batchExtractSummaries, generateTopicInsights, ArticleSummary, TopicInsight } from '@/lib/ai';
import { getAIConfig } from '@/lib/config';
import {
  badRequestResponse,
  createRequestId,
  notFoundResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { positiveIdSchema } from '@/lib/validations';
import { safeJsonArray } from '@/lib/utils';

interface InsightRequest {
  searchId: number;
  keyword: string;
  forceRegenerate?: boolean;
}

// POST /api/insights - 生成选题洞察
export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorizedResponse('请先登录', requestId);
    }

    const body: InsightRequest = await request.json();
    const { searchId, keyword, forceRegenerate = false } = body;
    const parsedSearchId = positiveIdSchema.safeParse(searchId);
    if (!parsedSearchId.success || !keyword) {
      return badRequestResponse('缺少必要参数', requestId);
    }
    const numericSearchId = parsedSearchId.data;

    // 强制校验 searchId 归属，防止跨用户读取/覆盖洞察数据
    const ownerSearch = getSearchById(numericSearchId, session.user.id);
    if (!ownerSearch) {
      return notFoundResponse('搜索记录不存在或无权访问', requestId);
    }

    // 检查是否已有洞察（非强制重新生成时）
    if (!forceRegenerate) {
      const existingInsights = getTopicInsightsBySearchId(numericSearchId, session.user.id);
      if (existingInsights.length > 0) {
        const existingSummaries = getArticleSummariesBySearchId(numericSearchId, session.user.id);
        return successResponse({
          summaries: existingSummaries.map((s) => ({
            articleId: s.article_id.toString(),
            title: s.title,
            summary: s.summary,
            keyPoints: safeJsonArray<string>(s.key_points),
            keywords: safeJsonArray<string>(s.keywords),
            highlights: safeJsonArray<string>(s.highlights),
            contentType: s.content_type,
          })),
          insights: existingInsights.map((i) => ({
            id: i.id.toString(),
            title: i.title,
            description: i.description,
            evidence: i.evidence,
            suggestedTopics: safeJsonArray<string>(i.suggested_topics),
            relatedArticles: safeJsonArray<string>(i.related_articles),
          })),
          cached: true,
        }, 200, requestId);
      }
    } else {
      // 强制重新生成时，删除旧数据
      deleteInsightsBySearchId(numericSearchId, session.user.id);
      deleteSummariesBySearchId(numericSearchId, session.user.id);
    }

    // 获取 AI 配置（优先环境变量）
    const aiConfig = getAIConfig(session.user.id);
    if (!aiConfig) {
      return badRequestResponse('请先配置 AI 接口（环境变量或设置页面）', requestId);
    }

    if (!aiConfig.baseUrl || !aiConfig.apiKey || !aiConfig.model) {
      return badRequestResponse('AI 配置不完整，请检查 Base URL、API Key 和 Model', requestId);
    }

    // 获取文章
    const articles = getArticlesBySearchId(numericSearchId, session.user.id);
    if (articles.length === 0) {
      return notFoundResponse('未找到相关文章', requestId);
    }

    // 阶段1: 批量提取文章摘要
    const articlesForAI = articles.map((a) => ({
      id: a.id.toString(),
      title: a.title,
      content: a.content || '',
    }));

    const summaries: ArticleSummary[] = await batchExtractSummaries(
      aiConfig,
      articlesForAI,
      3 // 并发数
    );

    // 保存摘要到数据库
    for (const summary of summaries) {
      saveArticleSummary(numericSearchId, parseInt(summary.articleId), {
        title: summary.title,
        summary: summary.summary,
        keyPoints: summary.keyPoints,
        keywords: summary.keywords,
        highlights: summary.highlights,
        contentType: summary.contentType,
      });
    }

    // 阶段2: 生成选题洞察
    const insights: TopicInsight[] = await generateTopicInsights(
      aiConfig,
      keyword,
      summaries
    );

    // 保存洞察到数据库
    if (insights.length > 0) {
      saveTopicInsights(
        numericSearchId,
        insights.map((i) => ({
          title: i.title,
          description: i.description,
          evidence: i.evidence,
          suggestedTopics: i.suggestedTopics,
          relatedArticles: i.relatedArticles,
        }))
      );
    }

    return successResponse({
      summaries,
      insights,
      cached: false,
    }, 200, requestId);
  } catch (error) {
    console.error(`[API ${requestId}] 生成洞察失败:`, error);
    return serverErrorResponse(
      error instanceof Error ? error.message : '生成洞察失败',
      requestId
    );
  }
}

// GET /api/insights?searchId=xxx - 获取已有洞察
export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorizedResponse('请先登录', requestId);
    }

    const { searchParams } = new URL(request.url);
    const searchId = searchParams.get('searchId');

    if (!searchId) {
      return badRequestResponse('缺少 searchId 参数', requestId);
    }

    const parsedSearchId = positiveIdSchema.safeParse(searchId);
    if (!parsedSearchId.success) {
      return badRequestResponse('无效的 searchId 参数', requestId);
    }
    const numericSearchId = parsedSearchId.data;

    const ownerSearch = getSearchById(numericSearchId, session.user.id);
    if (!ownerSearch) {
      return notFoundResponse('搜索记录不存在或无权访问', requestId);
    }

    const insights = getTopicInsightsBySearchId(numericSearchId, session.user.id);
    const summaries = getArticleSummariesBySearchId(numericSearchId, session.user.id);

    return successResponse({
      summaries: summaries.map((s) => ({
        articleId: s.article_id.toString(),
        title: s.title,
        summary: s.summary,
        keyPoints: safeJsonArray<string>(s.key_points),
        keywords: safeJsonArray<string>(s.keywords),
        highlights: safeJsonArray<string>(s.highlights),
        contentType: s.content_type,
      })),
      insights: insights.map((i) => ({
        id: i.id.toString(),
        title: i.title,
        description: i.description,
        evidence: i.evidence,
        suggestedTopics: safeJsonArray<string>(i.suggested_topics),
        relatedArticles: safeJsonArray<string>(i.related_articles),
      })),
    }, 200, requestId);
  } catch (error) {
    console.error(`[API ${requestId}] 获取洞察失败:`, error);
    return serverErrorResponse('获取洞察失败', requestId);
  }
}
