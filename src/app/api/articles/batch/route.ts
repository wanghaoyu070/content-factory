import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { batchDeleteArticles, batchArchiveArticles } from '@/lib/db';

// POST /api/articles/batch - 批量操作文章
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { action, ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: '请选择要操作的文章' },
        { status: 400 }
      );
    }

    // 转换 ID 为数字
    const numericIds = ids.map((id: string | number) =>
      typeof id === 'string' ? parseInt(id, 10) : id
    ).filter((id: number) => !isNaN(id));

    if (numericIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '无效的文章 ID' },
        { status: 400 }
      );
    }

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
