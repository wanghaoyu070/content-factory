import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getArticleById, updateArticle } from '@/lib/db';

// GET /api/articles/[id] - 获取单篇文章
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const { id } = await params;
    const article = getArticleById(parseInt(id), session.user.id);

    if (!article) {
      return NextResponse.json(
        { success: false, error: '文章不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: article.id.toString(),
        title: article.title,
        content: article.content,
        coverImage: article.cover_image,
        images: JSON.parse(article.images || '[]'),
        status: article.status,
        source: article.source,
        sourceInsightId: article.source_insight_id,
        sourceSearchId: article.source_search_id,
        createdAt: article.created_at,
        updatedAt: article.updated_at,
      },
    });
  } catch (error) {
    console.error('获取文章失败:', error);
    return NextResponse.json(
      { success: false, error: '获取文章失败' },
      { status: 500 }
    );
  }
}

// PUT /api/articles/[id] - 更新单篇文章
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const article = getArticleById(parseInt(id), session.user.id);
    if (!article) {
      return NextResponse.json(
        { success: false, error: '文章不存在' },
        { status: 404 }
      );
    }

    updateArticle(
      parseInt(id),
      {
        title: body.title,
        content: body.content,
        coverImage: body.coverImage,
        images: body.images,
        status: body.status,
      },
      session.user.id
    );

    return NextResponse.json({
      success: true,
      message: '更新成功',
    });
  } catch (error) {
    console.error('更新文章失败:', error);
    return NextResponse.json(
      { success: false, error: '更新文章失败' },
      { status: 500 }
    );
  }
}
