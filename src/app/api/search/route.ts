import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import {
  createSearchRecord,
  saveArticles,
  getRecentSearches,
  getAllSearches,
  deleteSearch,
} from '@/lib/db';
import {
  badRequestResponse,
  createRequestId,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { positiveIdSchema } from '@/lib/validations';

interface IncomingArticle {
  title: string;
  content: string;
  coverImage: string;
  readCount: number;
  likeCount: number;
  wowCount: number;
  publishTime: string;
  sourceUrl: string;
  wxName: string;
  wxId: string;
  isOriginal: boolean;
}

function parseIncomingArticle(raw: Record<string, unknown>): IncomingArticle {
  return {
    title: String(raw.title ?? ''),
    content: String(raw.content ?? ''),
    coverImage: String(raw.coverImage ?? ''),
    readCount: Number(raw.readCount ?? 0),
    likeCount: Number(raw.likeCount ?? 0),
    wowCount: Number(raw.wowCount ?? 0),
    publishTime: String(raw.publishTime ?? ''),
    sourceUrl: String(raw.sourceUrl ?? ''),
    wxName: String(raw.wxName ?? ''),
    wxId: String(raw.wxId ?? ''),
    isOriginal: Boolean(raw.isOriginal),
  };
}

// GET - 获取搜索历史
export async function GET(request: NextRequest) {
  const requestId = createRequestId();
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorizedResponse('请先登录', requestId);
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    const all = searchParams.get('all');

    if (all === 'true') {
      const records = getAllSearches(session.user.id);
      return successResponse(records, 200, requestId);
    }

    const parsedLimit = limit ? Number(limit) : 5;
    if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
      return badRequestResponse('limit 参数无效', requestId);
    }

    const records = getRecentSearches(parsedLimit, session.user.id);
    return successResponse(records, 200, requestId);
  } catch (error) {
    console.error(`[API ${requestId}] Error fetching search records:`, error);
    return serverErrorResponse('获取搜索历史失败', requestId);
  }
}

// POST - 保存搜索记录和文章
export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorizedResponse('请先登录', requestId);
    }

    const body = await request.json() as {
      keyword?: string;
      articles?: unknown;
      searchType?: 'keyword' | 'account';
      accountInfo?: { name?: string; avatar?: string };
    };
    const { keyword, articles, searchType, accountInfo } = body;

    if (!keyword || !Array.isArray(articles)) {
      return badRequestResponse('参数不完整', requestId);
    }

    const parsedArticles = articles.map((article) =>
      parseIncomingArticle((article ?? {}) as Record<string, unknown>)
    );

    // Create search record with optional search type and account info
    const searchId = createSearchRecord(
      keyword,
      parsedArticles.length,
      session.user.id,
      {
        searchType: searchType || 'keyword',
        accountName: accountInfo?.name,
        accountAvatar: accountInfo?.avatar,
      }
    );

    // Save articles
    const articlesToSave = parsedArticles.map((article) => ({
      title: article.title,
      content: article.content,
      cover_image: article.coverImage,
      read_count: article.readCount,
      like_count: article.likeCount,
      wow_count: article.wowCount,
      publish_time: article.publishTime,
      source_url: article.sourceUrl,
      wx_name: article.wxName,
      wx_id: article.wxId,
      is_original: article.isOriginal ? 1 : 0,
    }));

    saveArticles(searchId, articlesToSave);

    return successResponse(
      {
        searchId,
        message: '保存成功',
      },
      200,
      requestId
    );
  } catch (error) {
    console.error(`[API ${requestId}] Error saving search record:`, error);
    return serverErrorResponse('保存搜索记录失败', requestId);
  }
}

// DELETE - 删除搜索记录
export async function DELETE(request: NextRequest) {
  const requestId = createRequestId();
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorizedResponse('请先登录', requestId);
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return badRequestResponse('缺少 id 参数', requestId);
    }

    const parsedId = positiveIdSchema.safeParse(id);
    if (!parsedId.success) {
      return badRequestResponse('无效的 id 参数', requestId);
    }
    const numericId = parsedId.data;

    deleteSearch(numericId, session.user.id);

    return successResponse({ message: '删除成功' }, 200, requestId);
  } catch (error) {
    console.error(`[API ${requestId}] Error deleting search record:`, error);
    return serverErrorResponse('删除失败', requestId);
  }
}
