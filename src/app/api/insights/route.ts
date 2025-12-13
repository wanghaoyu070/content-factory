import { NextResponse } from 'next/server';
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

interface InsightRequest {
  searchId: number;
  keyword: string;
  forceRegenerate?: boolean;
}

// POST /api/insights - 生成选题洞察
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const body: InsightRequest = await request.json();
    const { searchId, keyword, forceRegenerate = false } = body;

    if (!searchId || !keyword) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 检查是否已有洞察（非强制重新生成时）
    if (!forceRegenerate) {
      const existingInsights = getTopicInsightsBySearchId(searchId);
      if (existingInsights.length > 0) {
        const existingSummaries = getArticleSummariesBySearchId(searchId);
        return NextResponse.json({
          success: true,
          data: {
            summaries: existingSummaries.map((s) => ({
              articleId: s.article_id.toString(),
              title: s.title,
              summary: s.summary,
              keyPoints: JSON.parse(s.key_points || '[]'),
              keywords: JSON.parse(s.keywords || '[]'),
              highlights: JSON.parse(s.highlights || '[]'),
              contentType: s.content_type,
            })),
            insights: existingInsights.map((i) => ({
              id: i.id.toString(),
              title: i.title,
              description: i.description,
              evidence: i.evidence,
              suggestedTopics: JSON.parse(i.suggested_topics || '[]'),
              relatedArticles: JSON.parse(i.related_articles || '[]'),
            })),
            cached: true,
          },
        });
      }
    } else {
      // 强制重新生成时，删除旧数据
      deleteInsightsBySearchId(searchId);
      deleteSummariesBySearchId(searchId);
    }

    // 获取 AI 配置（优先环境变量）
    const aiConfig = getAIConfig(session.user.id);
    if (!aiConfig) {
      return NextResponse.json(
        { success: false, error: '请先配置 AI 接口（环境变量或设置页面）' },
        { status: 400 }
      );
    }

    if (!aiConfig.baseUrl || !aiConfig.apiKey || !aiConfig.model) {
      return NextResponse.json(
        { success: false, error: 'AI 配置不完整，请检查 Base URL、API Key 和 Model' },
        { status: 400 }
      );
    }

    // 获取文章
    const articles = getArticlesBySearchId(searchId);
    if (articles.length === 0) {
      return NextResponse.json(
        { success: false, error: '未找到相关文章' },
        { status: 404 }
      );
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
      saveArticleSummary(searchId, parseInt(summary.articleId), {
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
        searchId,
        insights.map((i) => ({
          title: i.title,
          description: i.description,
          evidence: i.evidence,
          suggestedTopics: i.suggestedTopics,
          relatedArticles: i.relatedArticles,
        }))
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        summaries,
        insights,
        cached: false,
      },
    });
  } catch (error) {
    console.error('生成洞察失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '生成洞察失败',
      },
      { status: 500 }
    );
  }
}

// GET /api/insights?searchId=xxx - 获取已有洞察
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const searchId = searchParams.get('searchId');

    if (!searchId) {
      return NextResponse.json(
        { success: false, error: '缺少 searchId 参数' },
        { status: 400 }
      );
    }

    const ownerSearch = getSearchById(parseInt(searchId), session.user.id);
    if (!ownerSearch) {
      return NextResponse.json(
        { success: false, error: '搜索记录不存在或无权访问' },
        { status: 404 }
      );
    }

    const insights = getTopicInsightsBySearchId(parseInt(searchId));
    const summaries = getArticleSummariesBySearchId(parseInt(searchId));

    return NextResponse.json({
      success: true,
      data: {
        summaries: summaries.map((s) => ({
          articleId: s.article_id.toString(),
          title: s.title,
          summary: s.summary,
          keyPoints: JSON.parse(s.key_points || '[]'),
          keywords: JSON.parse(s.keywords || '[]'),
          highlights: JSON.parse(s.highlights || '[]'),
          contentType: s.content_type,
        })),
        insights: insights.map((i) => ({
          id: i.id.toString(),
          title: i.title,
          description: i.description,
          evidence: i.evidence,
          suggestedTopics: JSON.parse(i.suggested_topics || '[]'),
          relatedArticles: JSON.parse(i.related_articles || '[]'),
        })),
      },
    });
  } catch (error) {
    console.error('获取洞察失败:', error);
    return NextResponse.json(
      { success: false, error: '获取洞察失败' },
      { status: 500 }
    );
  }
}
