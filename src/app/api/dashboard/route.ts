import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  getDashboardStats,
  getAnalysisTrend,
  getArticleStatusDistribution,
  getTopKeywords,
  getRecentActivities,
} from '@/lib/db';

// GET /api/dashboard - 获取仪表盘数据
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const userId = session.user.id;

    const stats = getDashboardStats(userId);
    const trend = getAnalysisTrend(7, userId);
    const statusDistribution = getArticleStatusDistribution(userId);
    const topKeywords = getTopKeywords(10, userId);
    const recentActivities = getRecentActivities(10, userId);

    // 补全近7天的日期数据（没有数据的日期填0）
    const today = new Date();
    const trendWithAllDays = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const existing = trend.find((t) => t.date === dateStr);
      trendWithAllDays.push({
        date: dateStr,
        count: existing ? existing.count : 0,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        stats,
        trend: trendWithAllDays,
        statusDistribution,
        topKeywords,
        recentActivities,
      },
    });
  } catch (error) {
    console.error('获取仪表盘数据失败:', error);
    return NextResponse.json(
      { success: false, error: '获取仪表盘数据失败' },
      { status: 500 }
    );
  }
}
