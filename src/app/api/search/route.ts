import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  createSearchRecord,
  saveArticles,
  getRecentSearches,
  getAllSearches,
  deleteSearch,
} from '@/lib/db';

// GET - 获取搜索历史
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    const all = searchParams.get('all');

    if (all === 'true') {
      const records = getAllSearches(session.user.id);
      return NextResponse.json({ success: true, data: records });
    }

    const records = getRecentSearches(limit ? parseInt(limit) : 5, session.user.id);
    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    console.error('Error fetching search records:', error);
    return NextResponse.json(
      { error: '获取搜索历史失败' },
      { status: 500 }
    );
  }
}

// POST - 保存搜索记录和文章
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { keyword, articles, searchType, accountInfo } = body;

    if (!keyword || !articles) {
      return NextResponse.json(
        { error: '参数不完整' },
        { status: 400 }
      );
    }

    // Create search record with optional search type and account info
    const searchId = createSearchRecord(
      keyword,
      articles.length,
      {
        searchType: searchType || 'keyword',
        accountName: accountInfo?.name,
        accountAvatar: accountInfo?.avatar,
      },
      session.user.id
    );

    // Save articles
    const articlesToSave = articles.map((article: any) => ({
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

    return NextResponse.json({
      success: true,
      data: {
        searchId,
      },
      message: '保存成功',
    });
  } catch (error) {
    console.error('Error saving search record:', error);
    return NextResponse.json(
      { error: '保存搜索记录失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除搜索记录
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '缺少 id 参数' },
        { status: 400 }
      );
    }

    deleteSearch(parseInt(id), session.user.id);

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('Error deleting search record:', error);
    return NextResponse.json(
      { error: '删除失败' },
      { status: 500 }
    );
  }
}
