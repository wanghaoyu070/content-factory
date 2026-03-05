'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import { useSession } from 'next-auth/react';
import LoginPrompt from '@/components/ui/LoginPrompt';
import {
  BarChart3,
  FileText,
  Send,
  Clock,
  Search,
  PenTool,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { StatCardSkeleton, ChartSkeleton, ListItemSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import dynamic from 'next/dynamic';

// 动态导入组件
const QuickCreate = dynamic(() => import('@/components/dashboard/QuickCreate'), {
  ssr: false,
});
const TopKeywordsChart = dynamic(
  () => import('@/components/dashboard/TopKeywordsChart').then(mod => ({ default: mod.TopKeywordsChart })),
  { ssr: false }
);
const TrendChart = dynamic(
  () => import('@/components/dashboard/TrendChart').then(mod => ({ default: mod.TrendChart })),
  { ssr: false }
);
const StatusDistributionChart = dynamic(
  () => import('@/components/dashboard/StatusDistributionChart').then(mod => ({ default: mod.StatusDistributionChart })),
  { ssr: false }
);

interface DashboardData {
  stats: {
    totalAnalysis: number;
    totalArticles: number;
    publishedArticles: number;
    pendingArticles: number;
    // 趋势百分比（本周 vs 上周）
    analysisTrend: number;
    articlesTrend: number;
    publishedTrend: number;
    pendingTrend: number;
  };
  trend: { date: string; count: number }[];
  statusDistribution: { status: string; count: number }[];
  topKeywords: { keyword: string; count: number }[];
  recentActivities: {
    type: 'analysis' | 'article' | 'publish';
    title: string;
    time: string;
    id: number;
  }[];
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated' && !!session?.user && !session.user.isPending;
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      setData(null);
      return;
    }
    fetchDashboardData();
  }, [isAuthenticated]);

  const fetchDashboardData = async () => {
    if (!isAuthenticated) return;
    try {
      const response = await fetch('/api/dashboard');
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (err) {
      console.error('获取仪表盘数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'analysis':
        return <Search className="w-4 h-4 text-[#333]" />;
      case 'article':
        return <PenTool className="w-4 h-4 text-[#333]" />;
      case 'publish':
        return <Send className="w-4 h-4 text-[#333]" />;
      default:
        return <Clock className="w-4 h-4 text-[#999]" />;
    }
  };

  if (!isAuthenticated && status !== 'loading') {
    return (
      <div className="min-h-screen bg-[#FDFCF6]">
        <Header title="仪表盘" />
        <div className="p-6">
          <LoginPrompt description="登录后即可查看专属仪表盘与数据统计" />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFCF6]">
        <Header title="仪表盘" />
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ChartSkeleton />
            </div>
            <div className="bg-white rounded-2xl p-6 border border-[rgba(0,0,0,0.06)]">
              <div className="h-6 w-24 bg-[#F7F6F0] rounded mb-4" />
              {Array.from({ length: 5 }).map((_, i) => (
                <ListItemSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stats = data?.stats || {
    totalAnalysis: 0,
    totalArticles: 0,
    publishedArticles: 0,
    pendingArticles: 0,
    analysisTrend: 0,
    articlesTrend: 0,
    publishedTrend: 0,
    pendingTrend: 0,
  };

  return (
    <div className="min-h-screen bg-[#FDFCF6]">
      <Header title="仪表盘" />

      <div className="p-6">
        {/* 一键创作入口 */}
        <QuickCreate className="mb-6" />

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
          <StatCard
            title="分析次数"
            value={stats.totalAnalysis}
            icon={<BarChart3 className="w-5 h-5" />}
            color="indigo"
            trend={stats.analysisTrend}
          />
          <StatCard
            title="生成文章"
            value={stats.totalArticles}
            icon={<FileText className="w-5 h-5" />}
            color="purple"
            trend={stats.articlesTrend}
          />
          <StatCard
            title="已发布"
            value={stats.publishedArticles}
            icon={<Send className="w-5 h-5" />}
            color="emerald"
            trend={stats.publishedTrend}
          />
          <StatCard
            title="待处理"
            value={stats.pendingArticles}
            icon={<Clock className="w-5 h-5" />}
            color="amber"
            trend={stats.pendingTrend}
          />
        </div>

        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6">
          {/* 近7天分析趋势 - 使用新组件 */}
          <TrendChart data={data?.trend || []} />

          {/* 文章状态分布 - 使用新组件 */}
          <StatusDistributionChart data={data?.statusDistribution || []} />
        </div>

        {/* 下方区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* 热门关键词 - 使用新组件 */}
          <TopKeywordsChart
            data={data?.topKeywords || []}
            className="lg:col-span-2"
          />

          {/* 最近活动 */}
          <div className="bg-white rounded-2xl p-6 border border-[rgba(0,0,0,0.06)]">
            <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#666]" />
              最近活动
            </h3>
            {(data?.recentActivities || []).length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {(data?.recentActivities || []).map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#F7F6F0] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#F7F6F0] flex items-center justify-center flex-shrink-0">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#333] truncate">{activity.title}</p>
                      <p className="text-xs text-[#999]">{formatTime(activity.time)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <EmptyState
                  icon={<Clock className="w-6 h-6" />}
                  title="暂无活动记录"
                  description="完成一次分析或创作后即可在此查看动态"
                  action={{ label: '新建任务', href: '/create' }}
                />
              </div>
            )}
          </div>
        </div>

        {/* 快捷入口 */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          <Link
            href="/analysis"
            className="bg-white rounded-2xl p-6 border border-[rgba(0,0,0,0.06)] hover:border-[rgba(0,0,0,0.12)] transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold text-[#1A1A1A] mb-1">选题分析</h4>
                <p className="text-sm text-[#666]">搜索关键词，发现热门选题</p>
              </div>
              <Search className="w-8 h-8 text-[#333] group-hover:scale-110 transition-transform" />
            </div>
          </Link>
          <Link
            href="/create"
            className="bg-white rounded-2xl p-6 border border-[rgba(0,0,0,0.06)] hover:border-[rgba(0,0,0,0.12)] transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold text-[#1A1A1A] mb-1">内容创作</h4>
                <p className="text-sm text-[#666]">AI一键生成高质量文章</p>
              </div>
              <PenTool className="w-8 h-8 text-[#333] group-hover:scale-110 transition-transform" />
            </div>
          </Link>
          <Link
            href="/articles"
            className="bg-white rounded-2xl p-6 border border-[rgba(0,0,0,0.06)] hover:border-[rgba(0,0,0,0.12)] transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold text-[#1A1A1A] mb-1">发布管理</h4>
                <p className="text-sm text-[#666]">管理和发布你的文章</p>
              </div>
              <Send className="w-8 h-8 text-[#333] group-hover:scale-110 transition-transform" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  trend,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color?: string;
  trend?: number;
}) {
  return (
    <div
      className="bg-white rounded-2xl p-6 border border-[rgba(0,0,0,0.06)]"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-[#666]">{title}</span>
        <div className="w-10 h-10 rounded-xl bg-[#F7F6F0] flex items-center justify-center text-[#333]">
          {icon}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-3xl font-bold text-[#1A1A1A]">{value}</span>
        {trend !== undefined && (
          <div
            className={`flex items-center gap-1 text-sm ${trend >= 0 ? 'text-[#333]' : 'text-red-400'
              }`}
          >
            {trend >= 0 ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <ArrowDownRight className="w-4 h-4" />
            )}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
