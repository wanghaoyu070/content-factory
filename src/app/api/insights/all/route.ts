import { NextResponse } from 'next/server';
import {
  getAllSearchesWithInsightCounts,
  getTopicInsightsBySearchIdOrdered,
} from '@/lib/db';

// GET /api/insights/all - 获取所有搜索记录及其洞察
export async function GET() {
  try {
    // 获取所有搜索记录及洞察数量
    const searches = getAllSearchesWithInsightCounts();

    // 过滤出有洞察的搜索记录
    const searchesWithInsights = searches.filter((s) => s.insight_count > 0);

    // 获取每个搜索的洞察详情
    const result = searchesWithInsights.map((search) => {
      const insights = getTopicInsightsBySearchIdOrdered(search.id);
      return {
        searchId: search.id,
        keyword: search.keyword,
        articleCount: search.article_count,
        insightCount: search.insight_count,
        createdAt: search.created_at,
        searchType: search.search_type || 'keyword',
        accountName: search.account_name,
        accountAvatar: search.account_avatar,
        insights: insights.map((i) => ({
          id: i.id,
          title: i.title,
          description: i.description,
          evidence: i.evidence,
          suggestedTopics: JSON.parse(i.suggested_topics || '[]'),
          relatedArticles: JSON.parse(i.related_articles || '[]'),
          createdAt: i.created_at,
        })),
      };
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('获取洞察列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取洞察列表失败' },
      { status: 500 }
    );
  }
}
