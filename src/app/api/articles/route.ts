import { NextRequest, NextResponse } from 'next/server';
import {
  getActiveArticles,
  getArticlesByStatus,
  getArticleById,
  updateArticle,
  deleteArticle,
  copyArticle,
  archiveArticle,
} from '@/lib/db';

// GET /api/articles - 获取文章列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let articles;
    if (status && status !== 'all') {
      articles = getArticlesByStatus(status);
    } else {
      // 默认获取非归档文章
      articles = getActiveArticles();
    }

    // 转换数据格式
    const formattedArticles = articles.map((article) => ({
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
    }));

    return NextResponse.json({
      success: true,
      data: formattedArticles,
    });
  } catch (error) {
    console.error('获取文章列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取文章列表失败' },
      { status: 500 }
    );
  }
}

// PUT /api/articles - 更新文章
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少文章 ID' },
        { status: 400 }
      );
    }

    const article = getArticleById(parseInt(id));
    if (!article) {
      return NextResponse.json(
        { success: false, error: '文章不存在' },
        { status: 404 }
      );
    }

    updateArticle(parseInt(id), {
      title: updates.title,
      content: updates.content,
      coverImage: updates.coverImage,
      images: updates.images,
      status: updates.status,
    });

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

// DELETE /api/articles - 删除文章
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少文章 ID' },
        { status: 400 }
      );
    }

    const article = getArticleById(parseInt(id));
    if (!article) {
      return NextResponse.json(
        { success: false, error: '文章不存在' },
        { status: 404 }
      );
    }

    deleteArticle(parseInt(id));

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('删除文章失败:', error);
    return NextResponse.json(
      { success: false, error: '删除文章失败' },
      { status: 500 }
    );
  }
}

// POST /api/articles - 文章操作（复制、归档）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少文章 ID' },
        { status: 400 }
      );
    }

    const article = getArticleById(parseInt(id));
    if (!article) {
      return NextResponse.json(
        { success: false, error: '文章不存在' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'copy': {
        const newId = copyArticle(parseInt(id));
        return NextResponse.json({
          success: true,
          data: { newId },
          message: '复制成功',
        });
      }

      case 'archive': {
        archiveArticle(parseInt(id));
        return NextResponse.json({
          success: true,
          message: '归档成功',
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: '未知操作' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('文章操作失败:', error);
    return NextResponse.json(
      { success: false, error: '操作失败' },
      { status: 500 }
    );
  }
}
