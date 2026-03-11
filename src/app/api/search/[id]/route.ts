import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { getSearchById, getArticlesBySearchId } from '@/lib/db';
import { badRequestResponse, createRequestId, notFoundResponse, serverErrorResponse, successResponse, unauthorizedResponse } from '@/lib/api-response';
import { positiveIdSchema } from '@/lib/validations';

// GET - 获取搜索详情和关联文章
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = createRequestId();
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorizedResponse('请先登录', requestId);
    }

    const { id } = await params;
    const parsedId = positiveIdSchema.safeParse(id);
    if (!parsedId.success) {
      return badRequestResponse('无效的 ID', requestId);
    }
    const searchId = parsedId.data;

    const searchRecord = getSearchById(searchId, session.user.id);

    if (!searchRecord) {
      return notFoundResponse('搜索记录不存在', requestId);
    }

    const articles = getArticlesBySearchId(searchId, session.user.id);

    // Transform articles to frontend format
    const transformedArticles = articles.map((article) => ({
      id: article.id,
      title: article.title,
      content: article.content,
      coverImage: article.cover_image,
      readCount: article.read_count,
      likeCount: article.like_count,
      wowCount: article.wow_count,
      publishTime: article.publish_time,
      sourceUrl: article.source_url,
      wxName: article.wx_name,
      wxId: article.wx_id,
      isOriginal: article.is_original === 1,
    }));

    return successResponse({
      search: searchRecord,
      articles: transformedArticles,
    }, 200, requestId);
  } catch (error) {
    console.error(`[API ${requestId}] Error fetching search detail:`, error);
    return serverErrorResponse('获取搜索详情失败', requestId);
  }
}
