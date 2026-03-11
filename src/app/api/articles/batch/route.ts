import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { batchDeleteArticles, batchArchiveArticles } from '@/lib/db';
import { batchArticleSchema, validateBody } from '@/lib/validations';
import {
  badRequestResponse,
  createRequestId,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';

// POST /api/articles/batch - 批量操作文章
export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorizedResponse('请先登录', requestId);
    }

    // 使用 Zod 验证请求体
    const validation = await validateBody(request, batchArticleSchema);
    if (!validation.success) {
      return badRequestResponse(validation.error, requestId);
    }

    const { action, ids: numericIds } = validation.data;

    let result: { success: number; failed: number };

    switch (action) {
      case 'delete':
        result = batchDeleteArticles(numericIds, session.user.id);
        return successResponse({
          ...result,
          message: `成功删除 ${result.success} 篇文章${result.failed > 0 ? `，${result.failed} 篇失败` : ''}`,
        }, 200, requestId);

      case 'archive':
        result = batchArchiveArticles(numericIds, session.user.id);
        return successResponse({
          ...result,
          message: `成功归档 ${result.success} 篇文章${result.failed > 0 ? `，${result.failed} 篇失败` : ''}`,
        }, 200, requestId);

      default:
        return badRequestResponse('未知操作类型', requestId);
    }
  } catch (error) {
    console.error(`[API ${requestId}] 批量操作失败:`, error);
    return serverErrorResponse('批量操作失败', requestId);
  }
}
