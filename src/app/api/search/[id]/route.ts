import { NextRequest, NextResponse } from 'next/server';
import { getSearchById, getArticlesBySearchId } from '@/lib/db';

// GET - 获取搜索详情和关联文章
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchId = parseInt(id);

    if (isNaN(searchId)) {
      return NextResponse.json(
        { error: '无效的 ID' },
        { status: 400 }
      );
    }

    const searchRecord = getSearchById(searchId);

    if (!searchRecord) {
      return NextResponse.json(
        { error: '搜索记录不存在' },
        { status: 404 }
      );
    }

    const articles = getArticlesBySearchId(searchId);

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

    return NextResponse.json({
      success: true,
      data: {
        search: searchRecord,
        articles: transformedArticles,
      },
    });
  } catch (error) {
    console.error('Error fetching search detail:', error);
    return NextResponse.json(
      { error: '获取搜索详情失败' },
      { status: 500 }
    );
  }
}
