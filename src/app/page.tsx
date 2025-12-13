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
        return <Search className="w-4 h-4 text-indigo-400" />;
      case 'article':
        return <PenTool className="w-4 h-4 text-purple-400" />;
      case 'publish':
        return <Send className="w-4 h-4 text-emerald-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  if (!isAuthenticated && status !== 'loading') {
    return (
      <div className="min-h-screen bg-[#0f0f23]">
        <Header title="仪表盘" />
        <div className="p-6">
          <LoginPrompt description="登录后即可查看专属仪表盘与数据统计" />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f23]">
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
            <div className="bg-[#16162a] rounded-2xl p-6 border border-[#2d2d44]">
              <div className="h-6 w-24 bg-[#1a1a2e] rounded mb-4" />
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
  };

  return (
    <div className="min-h-screen bg-[#0f0f23]">
      <Header title="仪表盘" />

      <div className="p-6">
        {/* 一键创作入口 */}
        <QuickCreate className="mb-6" />

        {/* 统计卡片 */}
        <div className="grid grid-cols-4 gap-6 mb-6">
          <StatCard
            title="分析次数"
            value={stats.totalAnalysis}
            icon={<BarChart3 className="w-5 h-5" />}
            color="indigo"
            trend={12}
          />
          <StatCard
            title="生成文章"
            value={stats.totalArticles}
            icon={<FileText className="w-5 h-5" />}
            color="purple"
            trend={8}
          />
          <StatCard
            title="已发布"
            value={stats.publishedArticles}
            icon={<Send className="w-5 h-5" />}
            color="emerald"
            trend={15}
          />
          <StatCard
            title="待处理"
            value={stats.pendingArticles}
            icon={<Clock className="w-5 h-5" />}
            color="amber"
            trend={-5}
          />
        </div>

        {/* 图表区域 */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* 近7天分析趋势 - 使用新组件 */}
          <TrendChart data={data?.trend || []} />

          {/* 文章状态分布 - 使用新组件 */}
          <StatusDistributionChart data={data?.statusDistribution || []} />
        </div>

        {/* 下方区域 */}
        <div className="grid grid-cols-3 gap-6">
          {/* 热门关键词 - 使用新组件 */}
          <TopKeywordsChart
            data={data?.topKeywords || []}
            className="col-span-2"
          />

          {/* 最近活动 */}
          <div className="bg-[#16162a] rounded-2xl p-6 border border-[#2d2d44]">
            <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-400" />
              最近活动
            </h3>
            {(data?.recentActivities || []).length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {(data?.recentActivities || []).map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#1a1a2e] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#1a1a2e] flex items-center justify-center flex-shrink-0">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-300 truncate">{activity.title}</p>
                      <p className="text-xs text-slate-500">{formatTime(activity.time)}</p>
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
        <div className="mt-6 grid grid-cols-3 gap-6">
          <Link
            href="/analysis"
            className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-2xl p-6 border border-indigo-500/30 hover:border-indigo-500/50 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold text-slate-200 mb-1">选题分析</h4>
                <p className="text-sm text-slate-400">搜索关键词，发现热门选题</p>
              </div>
              <Search className="w-8 h-8 text-indigo-400 group-hover:scale-110 transition-transform" />
            </div>
          </Link>
          <Link
            href="/create"
            className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-2xl p-6 border border-purple-500/30 hover:border-purple-500/50 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold text-slate-200 mb-1">内容创作</h4>
                <p className="text-sm text-slate-400">AI一键生成高质量文章</p>
              </div>
              <PenTool className="w-8 h-8 text-purple-400 group-hover:scale-110 transition-transform" />
            </div>
          </Link>
          <Link
            href="/articles"
            className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-2xl p-6 border border-emerald-500/30 hover:border-emerald-500/50 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold text-slate-200 mb-1">发布管理</h4>
                <p className="text-sm text-slate-400">管理和发布你的文章</p>
              </div>
              <Send className="w-8 h-8 text-emerald-400 group-hover:scale-110 transition-transform" />
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
  color,
  trend,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'indigo' | 'purple' | 'emerald' | 'amber';
  trend?: number;
}) {
  const colorClasses = {
    indigo: 'from-indigo-600/20 to-indigo-600/5 border-indigo-500/30 text-indigo-400',
    purple: 'from-purple-600/20 to-purple-600/5 border-purple-500/30 text-purple-400',
    emerald: 'from-emerald-600/20 to-emerald-600/5 border-emerald-500/30 text-emerald-400',
    amber: 'from-amber-600/20 to-amber-600/5 border-amber-500/30 text-amber-400',
  };

  return (
    <div
      className={`bg-gradient-to-br ${colorClasses[color]} rounded-2xl p-6 border`}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-slate-400">{title}</span>
        <div className={`w-10 h-10 rounded-xl bg-[#1a1a2e] flex items-center justify-center ${colorClasses[color].split(' ').pop()}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-3xl font-bold text-slate-100">{value}</span>
        {trend !== undefined && (
          <div
            className={`flex items-center gap-1 text-sm ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'
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
