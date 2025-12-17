import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTopKeywords } from '@/lib/db';

// 默认热门话题（当用户没有搜索历史时使用）
const DEFAULT_HOT_TOPICS = [
  { keyword: 'AI人工智能', heat: 98 },
  { keyword: '职场成长', heat: 92 },
  { keyword: '副业赚钱', heat: 88 },
  { keyword: '自媒体运营', heat: 85 },
  { keyword: '健康养生', heat: 82 },
  { keyword: '育儿教育', heat: 78 },
  { keyword: '投资理财', heat: 75 },
  { keyword: '情感心理', heat: 72 },
];

// GET /api/hot-topics - 获取热门话题
export async function GET() {
  try {
    const session = await auth();

    // 未登录用户返回默认热门话题
    if (!session?.user?.id) {
      return NextResponse.json({
        success: true,
        data: DEFAULT_HOT_TOPICS,
        source: 'default',
      });
    }

    // 获取用户的热门搜索关键词
    const userKeywords = getTopKeywords(8, session.user.id);

    // 如果用户有搜索历史，基于搜索次数计算热度
    if (userKeywords.length > 0) {
      const maxCount = userKeywords[0].count;
      const hotTopics = userKeywords.map((item, index) => ({
        keyword: item.keyword,
        // 热度计算：基于搜索次数，最高100，最低50
        heat: Math.round(50 + (item.count / maxCount) * 50 - index * 2),
      }));

      return NextResponse.json({
        success: true,
        data: hotTopics,
        source: 'user_history',
      });
    }

    // 用户没有搜索历史，尝试获取全局热门关键词
    const globalKeywords = getTopKeywords(8);

    if (globalKeywords.length > 0) {
      const maxCount = globalKeywords[0].count;
      const hotTopics = globalKeywords.map((item, index) => ({
        keyword: item.keyword,
        heat: Math.round(50 + (item.count / maxCount) * 50 - index * 2),
      }));

      return NextResponse.json({
        success: true,
        data: hotTopics,
        source: 'global',
      });
    }

    // 没有任何搜索记录，返回默认热门话题
    return NextResponse.json({
      success: true,
      data: DEFAULT_HOT_TOPICS,
      source: 'default',
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('获取热门话题失败:', error);
    }
    // 出错时返回默认热门话题，保证用户体验
    return NextResponse.json({
      success: true,
      data: DEFAULT_HOT_TOPICS,
      source: 'default',
    });
  }
}
