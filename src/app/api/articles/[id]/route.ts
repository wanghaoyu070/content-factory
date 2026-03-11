import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { getArticleById, updateArticle } from '@/lib/db';
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

// GET /api/articles/[id] - 获取单篇文章
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
      return badRequestResponse('无效的文章 ID', requestId);
    }
    const numericId = parsedId.data;

    const article = getArticleById(numericId, session.user.id);

    if (!article) {
      return notFoundResponse('文章不存在', requestId);
    }

    return successResponse({
      id: article.id.toString(),
      title: article.title,
      content: article.content,
      markdown_content: article.markdown_content,
      coverImage: article.cover_image,
      images: safeJsonArray<string>(article.images),
      status: article.status,
      source: article.source,
      sourceInsightId: article.source_insight_id,
      sourceSearchId: article.source_search_id,
      xhsTags: article.xhs_tags,
      xhsContent: article.xhs_content,
      xhsTitle: article.xhs_title,
      createdAt: article.created_at,
      updatedAt: article.updated_at,
    }, 200, requestId);
  } catch (error) {
    console.error(`[API ${requestId}] 获取文章失败:`, error);
    return serverErrorResponse('获取文章失败', requestId);
  }
}

// PUT /api/articles/[id] - 更新单篇文章
export async function PUT(
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
    const body = await request.json();
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
        title: body.title,
        content: body.content,
        markdown_content: body.markdown_content,
        coverImage: body.coverImage,
        images: body.images,
        status: body.status,
        xhsTags: body.xhsTags,
        xhsContent: body.xhsContent,
        xhsTitle: body.xhsTitle,
      },
      session.user.id
    );

    return successResponse({ message: '更新成功' }, 200, requestId);
  } catch (error) {
    console.error(`[API ${requestId}] 更新文章失败:`, error);
    return serverErrorResponse('更新文章失败', requestId);
  }
}
