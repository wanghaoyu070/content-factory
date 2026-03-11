import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import {
  getActiveArticles,
  getArticlesByStatus,
  getArticleById,
  updateArticle,
  deleteArticle,
  copyArticle,
  archiveArticle,
} from '@/lib/db';
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

// GET /api/articles - 获取文章列表
export async function GET(request: NextRequest) {
  const requestId = createRequestId();
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorizedResponse('请先登录', requestId);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let articles;
    if (status && status !== 'all') {
      articles = getArticlesByStatus(status, session.user.id);
    } else {
      // 默认获取非归档文章
      articles = getActiveArticles(session.user.id);
    }

    // 转换数据格式
    const formattedArticles = articles.map((article) => ({
      id: article.id.toString(),
      title: article.title,
      content: article.content,
      coverImage: article.cover_image,
      images: safeJsonArray<string>(article.images),
      status: article.status,
      source: article.source,
      sourceInsightId: article.source_insight_id,
      sourceSearchId: article.source_search_id,
      createdAt: article.created_at,
      updatedAt: article.updated_at,
    }));

    return successResponse(formattedArticles, 200, requestId);
  } catch (error) {
    console.error(`[API ${requestId}] 获取文章列表失败:`, error);
    return serverErrorResponse('获取文章列表失败', requestId);
  }
}

// PUT /api/articles - 更新文章
export async function PUT(request: NextRequest) {
  const requestId = createRequestId();
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorizedResponse('请先登录', requestId);
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (id === undefined || id === null || id === '') {
      return badRequestResponse('缺少文章 ID', requestId);
    }

    const parsedId = positiveIdSchema.safeParse(id);
    if (!parsedId.success) {
      return badRequestResponse('无效的文章 ID', requestId);
    }
    const numericId = parsedId.data;

    const article = getArticleById(numericId, session.user.id);
    if (!article) {
      return notFoundResponse('文章不存在', requestId);
    }

    updateArticle(
      numericId,
      {
        title: updates.title,
        content: updates.content,
        coverImage: updates.coverImage,
        images: updates.images,
        status: updates.status,
      },
      session.user.id
    );

    return successResponse({ message: '更新成功' }, 200, requestId);
  } catch (error) {
    console.error(`[API ${requestId}] 更新文章失败:`, error);
    return serverErrorResponse('更新文章失败', requestId);
  }
}

// DELETE /api/articles - 删除文章
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
      return badRequestResponse('缺少文章 ID', requestId);
    }

    const parsedId = positiveIdSchema.safeParse(id);
    if (!parsedId.success) {
      return badRequestResponse('无效的文章 ID', requestId);
    }
    const numericId = parsedId.data;

    const article = getArticleById(numericId, session.user.id);
    if (!article) {
      return notFoundResponse('文章不存在', requestId);
    }

    deleteArticle(numericId, session.user.id);

    return successResponse({ message: '删除成功' }, 200, requestId);
  } catch (error) {
    console.error(`[API ${requestId}] 删除文章失败:`, error);
    return serverErrorResponse('删除文章失败', requestId);
  }
}

// POST /api/articles - 文章操作（复制、归档）
export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorizedResponse('请先登录', requestId);
    }

    const body = await request.json();
    const { action, id } = body;

    if (id === undefined || id === null || id === '') {
      return badRequestResponse('缺少文章 ID', requestId);
    }

    const parsedId = positiveIdSchema.safeParse(id);
    if (!parsedId.success) {
      return badRequestResponse('无效的文章 ID', requestId);
    }
    const numericId = parsedId.data;

    const article = getArticleById(numericId, session.user.id);
    if (!article) {
      return notFoundResponse('文章不存在', requestId);
    }

    switch (action) {
      case 'copy': {
        const newId = copyArticle(numericId, session.user.id);
        return successResponse({ newId, message: '复制成功' }, 200, requestId);
      }

      case 'archive': {
        archiveArticle(numericId, session.user.id);
        return successResponse({ message: '归档成功' }, 200, requestId);
      }

      default:
        return badRequestResponse('未知操作', requestId);
    }
  } catch (error) {
    console.error(`[API ${requestId}] 文章操作失败:`, error);
    return serverErrorResponse('操作失败', requestId);
  }
}
