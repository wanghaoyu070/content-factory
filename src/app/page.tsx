'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import { useSession } from 'next-auth/react';
import LoginPrompt from '@/components/ui/LoginPrompt';
import {
  FileText,
  Send,
  Clock,
  Search,
  PenTool,
  Flame,
  Star,
  Loader2,
  ExternalLink,
  Zap,
  ArrowRight,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import { StatCardSkeleton, ListItemSkeleton } from '@/components/ui/Skeleton';
import type { ViralArticleItem } from '@/types/api';

interface DashboardStats {
  totalAnalysis: number;
  totalArticles: number;
  publishedArticles: number;
  pendingArticles: number;
}

interface RecentActivity {
  type: 'analysis' | 'article' | 'publish';
  title: string;
  time: string;
  id: number;
}

interface DraftArticle {
  id: number;
  title: string;
  status: string;
  updatedAt: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated' && !!session?.user && !session.user.isPending;

  // Dashboard data
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [dashLoading, setDashLoading] = useState(true);

  // Recommendations
  const [recArticles, setRecArticles] = useState<ViralArticleItem[]>([]);
  const [recDomains, setRecDomains] = useState<string[]>([]);
  const [recLoading, setRecLoading] = useState(true);

  // Draft articles
  const [drafts, setDrafts] = useState<DraftArticle[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(true);

  // Fetch dashboard stats
  useEffect(() => {
    if (!isAuthenticated) {
      setDashLoading(false);
      return;
    }
    const fetchDashboard = async () => {
      try {
        const res = await fetch('/api/dashboard');
        const json = await res.json();
        if (json.success) {
          setStats(json.data.stats);
          setRecentActivities(json.data.recentActivities || []);
        }
      } catch (err) {
        console.warn('Dashboard fetch failed:', err);
      } finally {
        setDashLoading(false);
      }
    };
    fetchDashboard();
  }, [isAuthenticated]);

  // Fetch recommendations
  useEffect(() => {
    if (!isAuthenticated) {
      setRecLoading(false);
      return;
    }
    const fetchRec = async () => {
      try {
        const res = await fetch('/api/viral-articles/recommend');
        const json = await res.json();
        if (json.success && json.data) {
          setRecArticles((json.data.articles || []).slice(0, 5));
          setRecDomains(json.data.domains || []);
        }
      } catch (err) {
        console.warn('Recommendations fetch failed:', err);
      } finally {
        setRecLoading(false);
      }
    };
    fetchRec();
  }, [isAuthenticated]);

  // Fetch draft articles
  useEffect(() => {
    if (!isAuthenticated) {
      setDraftsLoading(false);
      return;
    }
    const fetchDrafts = async () => {
      try {
        const res = await fetch('/api/articles?status=draft&limit=3');
        const json = await res.json();
        if (json.success) {
          setDrafts(
            (json.data || []).slice(0, 3).map((a: { id: number; title: string; status: string; updated_at?: string; created_at?: string }) => ({
              id: a.id,
              title: a.title,
              status: a.status,
              updatedAt: a.updated_at || a.created_at || '',
            }))
          );
        }
      } catch (err) {
        console.warn('Drafts fetch failed:', err);
      } finally {
        setDraftsLoading(false);
      }
    };
    fetchDrafts();
  }, [isAuthenticated]);

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

  const getStatusLabel = (s: string) => {
    switch (s) {
      case 'draft': return '草稿';
      case 'published': return '已发布';
      case 'pending': return '待发布';
      default: return s;
    }
  };

  if (!isAuthenticated && status !== 'loading') {
    return (
      <div className="min-h-screen bg-[#FDFCF6]">
        <Header title="工作台" />
        <div className="p-6">
          <LoginPrompt description="登录后即可查看个性化推荐与工作台" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCF6]">
      <Header title="工作台" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* ===== Section 1: Today's Recommendations ===== */}
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Star className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#1A1A1A]">今日推荐</h2>
                {recDomains.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {recDomains.map(d => (
                      <span key={d} className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">{d}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <Link
              href="/viral"
              className="flex items-center gap-1 text-sm text-[#666] hover:text-[#333] transition-colors"
            >
              查看更多 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {recLoading ? (
            <div className="p-8 flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
              <span className="text-sm text-[#666]">正在加载推荐...</span>
            </div>
          ) : recArticles.length > 0 ? (
            <div className="divide-y divide-[rgba(0,0,0,0.04)]">
              {recArticles.map((article, idx) => (
                <div key={`rec_${idx}`} className="px-6 py-3.5 hover:bg-[#FDFCF6] transition-colors flex items-center gap-3">
                  {/* Rank */}
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 ${idx < 3
                      ? 'bg-gradient-to-br from-amber-500/30 to-orange-500/20 text-amber-600 border border-amber-500/30'
                      : 'bg-[#F7F6F0] text-[#999] border border-[rgba(0,0,0,0.06)]'
                    }`}>
                    {idx + 1}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-[#1A1A1A] line-clamp-1">{article.title}</h3>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-[#999]">
                      <span>{article.mp_nickname}</span>
                      <span className="font-semibold text-[#333]">{article.read_num?.toLocaleString()} 阅读</span>
                      <span className={`font-bold ${article.hot > 100 ? 'text-red-500' : article.hot > 30 ? 'text-orange-500' : 'text-[#666]'}`}>
                        🔥 {article.hot}x
                      </span>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href="/viral"
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 flex items-center gap-1"
                    >
                      <Zap className="w-3 h-3" /> AI拆解
                    </Link>
                    {article.url && (
                      <a href={article.url} target="_blank" rel="noopener noreferrer"
                        className="text-[#999] hover:text-[#333] transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-[#999]">
              <Star className="w-8 h-8 mx-auto mb-2 text-[#ddd]" />
              <p>暂无推荐内容</p>
              <p className="text-xs mt-1">请在 .env.local 中配置 CREATOR_DOMAINS</p>
            </div>
          )}
        </div>

        {/* ===== Section 2: Drafts + Stats ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Drafts */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-[rgba(0,0,0,0.06)]">
            <div className="px-6 py-4 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#1A1A1A] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#666]" />
                我的草稿
              </h2>
              <Link
                href="/articles"
                className="flex items-center gap-1 text-sm text-[#666] hover:text-[#333] transition-colors"
              >
                全部文章 <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {draftsLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => <ListItemSkeleton key={i} />)}
              </div>
            ) : drafts.length > 0 ? (
              <div className="divide-y divide-[rgba(0,0,0,0.04)]">
                {drafts.map((draft) => (
                  <Link
                    key={draft.id}
                    href={`/articles/${draft.id}`}
                    className="px-6 py-4 flex items-center justify-between hover:bg-[#FDFCF6] transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-[#1A1A1A] group-hover:text-[#333] line-clamp-1">{draft.title}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[#999]">
                        <span className={`px-1.5 py-0.5 rounded ${draft.status === 'draft' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                            draft.status === 'published' ? 'bg-green-50 text-green-600 border border-green-200' :
                              'bg-[#F7F6F0] text-[#666] border border-[rgba(0,0,0,0.06)]'
                          }`}>
                          {getStatusLabel(draft.status)}
                        </span>
                        {draft.updatedAt && <span>{formatTime(draft.updatedAt)}</span>}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#ccc] group-hover:text-[#666] transition-colors flex-shrink-0" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <PenTool className="w-8 h-8 mx-auto mb-2 text-[#ddd]" />
                <p className="text-sm text-[#999]">还没有草稿</p>
                <Link
                  href="/create"
                  className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-[#333] text-white rounded-xl text-sm hover:bg-[#444] transition-colors"
                >
                  <Sparkles className="w-4 h-4" /> 开始创作
                </Link>
              </div>
            )}
          </div>

          {/* Stats + Quick Actions */}
          <div className="space-y-6">
            {/* Compact Stats */}
            <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] p-5">
              <h2 className="text-base font-semibold text-[#1A1A1A] flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-[#666]" />
                数据概览
              </h2>
              {dashLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <StatCardSkeleton key={i} />)}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[#F7F6F0] rounded-xl">
                    <span className="text-sm text-[#666]">分析次数</span>
                    <span className="text-lg font-bold text-[#1A1A1A]">{stats?.totalAnalysis || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#F7F6F0] rounded-xl">
                    <span className="text-sm text-[#666]">生成文章</span>
                    <span className="text-lg font-bold text-[#1A1A1A]">{stats?.totalArticles || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#F7F6F0] rounded-xl">
                    <span className="text-sm text-[#666]">已发布</span>
                    <span className="text-lg font-bold text-emerald-600">{stats?.publishedArticles || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#F7F6F0] rounded-xl">
                    <span className="text-sm text-[#666]">待处理</span>
                    <span className="text-lg font-bold text-amber-600">{stats?.pendingArticles || 0}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] p-5">
              <h2 className="text-sm font-medium text-[#666] mb-3">快捷操作</h2>
              <div className="space-y-2">
                <Link
                  href="/analysis"
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#F7F6F0] hover:bg-[#EFEDE7] transition-colors group"
                >
                  <Search className="w-5 h-5 text-[#333]" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[#1A1A1A]">选题分析</div>
                    <div className="text-xs text-[#999]">搜索关键词，发现新选题</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#ccc] group-hover:text-[#999]" />
                </Link>
                <Link
                  href="/viral"
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#F7F6F0] hover:bg-[#EFEDE7] transition-colors group"
                >
                  <Flame className="w-5 h-5 text-[#333]" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[#1A1A1A]">爆文发现</div>
                    <div className="text-xs text-[#999]">AI 推荐热门爆文</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#ccc] group-hover:text-[#999]" />
                </Link>
                <Link
                  href="/create"
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#F7F6F0] hover:bg-[#EFEDE7] transition-colors group"
                >
                  <PenTool className="w-5 h-5 text-[#333]" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[#1A1A1A]">内容创作</div>
                    <div className="text-xs text-[#999]">AI 一键生成高质量文章</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#ccc] group-hover:text-[#999]" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ===== Section 3: Recent Activity ===== */}
        {recentActivities.length > 0 && (
          <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)]">
            <div className="px-6 py-4 border-b border-[rgba(0,0,0,0.06)]">
              <h2 className="text-base font-semibold text-[#1A1A1A] flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#666]" />
                最近动态
              </h2>
            </div>
            <div className="divide-y divide-[rgba(0,0,0,0.04)]">
              {recentActivities.slice(0, 5).map((activity, index) => (
                <div key={index} className="px-6 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F7F6F0] flex items-center justify-center flex-shrink-0">
                    {activity.type === 'analysis' ? <Search className="w-4 h-4 text-[#333]" /> :
                      activity.type === 'article' ? <PenTool className="w-4 h-4 text-[#333]" /> :
                        <Send className="w-4 h-4 text-[#333]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#333] truncate">{activity.title}</p>
                  </div>
                  <span className="text-xs text-[#999] flex-shrink-0">{formatTime(activity.time)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
