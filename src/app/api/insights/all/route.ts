import { auth } from '@/auth';
import {
  getAllSearchesWithInsightCounts,
  getTopicInsightsBySearchIdOrdered,
} from '@/lib/db';
import {
  createRequestId,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { safeJsonArray } from '@/lib/utils';

// GET /api/insights/all - 获取所有搜索记录及其洞察
export async function GET() {
  const requestId = createRequestId();
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return unauthorizedResponse('请先登录', requestId);
    }

    // 获取所有搜索记录及洞察数量
    const searches = getAllSearchesWithInsightCounts(userId);

    // 过滤出有洞察的搜索记录
    const searchesWithInsights = searches.filter((s) => s.insight_count > 0);

    // 获取每个搜索的洞察详情
    const result = searchesWithInsights.map((search) => {
      const insights = getTopicInsightsBySearchIdOrdered(search.id, userId);
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
          suggestedTopics: safeJsonArray<string>(i.suggested_topics),
          relatedArticles: safeJsonArray<string>(i.related_articles),
          createdAt: i.created_at,
        })),
      };
    });

    return successResponse(result, 200, requestId);
  } catch (error) {
    console.error(`[API ${requestId}] 获取洞察列表失败:`, error);
    return serverErrorResponse('获取洞察列表失败', requestId);
  }
}
