import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { batchDeleteArticles, batchArchiveArticles } from '@/lib/db';
import { batchArticleSchema, validateBody } from '@/lib/validations';

// POST /api/articles/batch - 批量操作文章
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    // 使用 Zod 验证请求体
    const validation = await validateBody(request, batchArticleSchema);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const { action, ids: numericIds } = validation.data;

    let result: { success: number; failed: number };

    switch (action) {
      case 'delete':
        result = batchDeleteArticles(numericIds, session.user.id);
        return NextResponse.json({
          success: true,
          data: result,
          message: `成功删除 ${result.success} 篇文章${result.failed > 0 ? `，${result.failed} 篇失败` : ''}`,
        });

      case 'archive':
        result = batchArchiveArticles(numericIds, session.user.id);
        return NextResponse.json({
          success: true,
          data: result,
          message: `成功归档 ${result.success} 篇文章${result.failed > 0 ? `，${result.failed} 篇失败` : ''}`,
        });

      default:
        return NextResponse.json(
          { success: false, error: '未知操作类型' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('批量操作失败:', error);
    return NextResponse.json(
      { success: false, error: '批量操作失败' },
      { status: 500 }
    );
  }
}
