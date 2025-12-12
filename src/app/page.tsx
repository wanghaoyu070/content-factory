'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import {
  BarChart3,
  FileText,
  Send,
  Clock,
  TrendingUp,
  Search,
  PenTool,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

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

const statusLabels: Record<string, string> = {
  draft: '草稿',
  pending_review: '待审核',
  approved: '已审核',
  published: '已发布',
  failed: '发布失败',
};

const statusColors: Record<string, string> = {
  draft: '#64748b',
  pending_review: '#f59e0b',
  approved: '#10b981',
  published: '#6366f1',
  failed: '#ef4444',
};

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f23]">
        <Header title="仪表盘" />
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
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

  const pieData = (data?.statusDistribution || []).map((item) => ({
    name: statusLabels[item.status] || item.status,
    value: item.count,
    color: statusColors[item.status] || '#64748b',
  }));

  return (
    <div className="min-h-screen bg-[#0f0f23]">
      <Header title="仪表盘" />

      <div className="p-6">
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
          {/* 近7天分析趋势 */}
          <div className="bg-[#16162a] rounded-2xl p-6 border border-[#2d2d44]">
            <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              近7天分析趋势
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.trend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d2d44" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    stroke="#64748b"
                    fontSize={12}
                  />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a2e',
                      border: '1px solid #2d2d44',
                      borderRadius: '8px',
                    }}
                    labelFormatter={formatDate}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ fill: '#6366f1', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#6366f1' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 文章状态分布 */}
          <div className="bg-[#16162a] rounded-2xl p-6 border border-[#2d2d44]">
            <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              文章状态分布
            </h3>
            <div className="h-64 flex items-center">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a1a2e',
                        border: '1px solid #2d2d44',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full text-center text-slate-500">暂无数据</div>
              )}
              <div className="space-y-2 ml-4">
                {pieData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-slate-400">{item.name}</span>
                    <span className="text-sm text-slate-300 font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 下方区域 */}
        <div className="grid grid-cols-3 gap-6">
          {/* 热门关键词 */}
          <div className="col-span-2 bg-[#16162a] rounded-2xl p-6 border border-[#2d2d44]">
            <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-amber-400" />
              热门关键词 TOP10
            </h3>
            {(data?.topKeywords || []).length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data?.topKeywords || []}
                    layout="vertical"
                    margin={{ left: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d2d44" />
                    <XAxis type="number" stroke="#64748b" fontSize={12} />
                    <YAxis
                      type="category"
                      dataKey="keyword"
                      stroke="#64748b"
                      fontSize={12}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a1a2e',
                        border: '1px solid #2d2d44',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-500">
                暂无数据，开始分析关键词吧
              </div>
            )}
          </div>

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
              <div className="h-64 flex items-center justify-center text-slate-500">
                暂无活动记录
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
            className={`flex items-center gap-1 text-sm ${
              trend >= 0 ? 'text-emerald-400' : 'text-red-400'
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
