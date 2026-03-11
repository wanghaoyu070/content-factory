import { auth } from '@/auth';
import { getAllDashboardData } from '@/lib/db';
import {
  createRequestId,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';

// GET /api/dashboard - 获取仪表盘数据
export async function GET() {
  const requestId = createRequestId();
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorizedResponse('请先登录', requestId);
    }

    const userId = session.user.id;

    // 使用合并查询获取所有仪表盘数据
    const { stats, trend, statusDistribution, topKeywords, recentActivities } = getAllDashboardData(userId);

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

    return successResponse({
      stats,
      trend: trendWithAllDays,
      statusDistribution,
      topKeywords,
      recentActivities,
    }, 200, requestId);
  } catch (error) {
    console.error(`[API ${requestId}] 获取仪表盘数据失败:`, error);
    return serverErrorResponse('获取仪表盘数据失败', requestId);
  }
}
