'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import LoginPrompt from '@/components/ui/LoginPrompt';
import { useLoginGuard } from '@/hooks/useLoginGuard';
import {
  Plus, Search, MoreHorizontal, Edit, Eye, Trash2, ChevronDown, CheckSquare, Square, Loader2,
  Copy, Download, Archive, Send, FileText, ExternalLink
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import BatchActionsBar, { BatchSelectCheckbox } from '@/components/articles/BatchActionsBar';

type ArticleStatus = 'draft' | 'pending_review' | 'approved' | 'published' | 'failed' | 'archived';

interface Article {
  id: string;
  title: string;
  content: string;
  coverImage: string;
  images: string[];
  status: ArticleStatus;
  source: string;
  createdAt: string;
  updatedAt: string;
}

const statusConfig: Record<ArticleStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: '草稿', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  pending_review: { label: '待审核', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  approved: { label: '已审核', color: 'text-green-600', bgColor: 'bg-green-100' },
  published: { label: '已发布', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  failed: { label: '发布失败', color: 'text-red-600', bgColor: 'bg-red-100' },
  archived: { label: '已归档', color: 'text-purple-600', bgColor: 'bg-purple-100' },
};

interface WechatAccount {
  name: string;
  wechatAppid: string;
  username: string;
  avatar: string;
  type: string;
  verified: boolean;
  status: string;
}

interface PublishConfig {
  wechatAppid: string;
  author: string;
  articleType: 'news' | 'newspic';
  contentFormat: 'html' | 'markdown';
}

const PUBLISH_CONFIG_STORAGE_KEY = 'wechat_publish_config';

export default function ArticlesPage() {
  const { ensureLogin, isAuthenticated, status } = useLoginGuard('请登录后管理文章');
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<ArticleStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [wechatAccounts, setWechatAccounts] = useState<WechatAccount[]>([]);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [selectedArticleForPublish, setSelectedArticleForPublish] = useState<string | null>(null);
  const [publishConfig, setPublishConfig] = useState<PublishConfig>({
    wechatAppid: '',
    author: '',
    articleType: 'news',
    contentFormat: 'html',
  });
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // 小红书发布相关状态
  const [showXhsModal, setShowXhsModal] = useState(false);
  const [xhsPublishing, setXhsPublishing] = useState(false);
  const [xhsResult, setXhsResult] = useState<{
    publishUrl: string;
    title: string;
    imageCount: number;
  } | null>(null);
  const [selectedArticleForXhs, setSelectedArticleForXhs] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // 加载文章列表
  useEffect(() => {
    if (!isAuthenticated) {
      setArticles([]);
      setLoading(false);
      return;
    }
    fetchArticles();
    const savedConfig = localStorage.getItem(PUBLISH_CONFIG_STORAGE_KEY);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setPublishConfig(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Failed to parse saved publish config:', e);
      }
    }
  }, [isAuthenticated]);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownId]);

  const fetchArticles = async () => {
    if (!isAuthenticated) return;
    try {
      const response = await fetch('/api/articles');
      const result = await response.json();
      if (result.success) {
        setArticles(result.data);
      }
    } catch (err) {
      console.error('加载文章失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = articles.filter((article) => {
    const matchesStatus = statusFilter === 'all' || article.status === statusFilter;
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const statusCounts = {
    all: articles.length,
    draft: articles.filter((a) => a.status === 'draft').length,
    pending_review: articles.filter((a) => a.status === 'pending_review').length,
    approved: articles.filter((a) => a.status === 'approved').length,
    published: articles.filter((a) => a.status === 'published').length,
    failed: articles.filter((a) => a.status === 'failed').length,
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredArticles.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredArticles.map((a) => a.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleDelete = async (id: string) => {
    if (!ensureLogin()) return;
    if (!confirm('确定要删除这篇文章吗？')) return;

    try {
      const response = await fetch(`/api/articles?id=${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        setArticles((prev) => prev.filter((a) => a.id !== id));
        setSelectedIds((prev) => prev.filter((i) => i !== id));
      } else {
        toast.error('删除失败', {
          description: result.error || '请稍后重试',
        });
      }
    } catch (err) {
      console.error('删除文章失败:', err);
      toast.error('删除失败', {
        description: '网络异常，请稍后重试',
      });
    }
  };

  // 批量删除
  const handleBatchDelete = async (ids: number[]) => {
    let successCount = 0;
    let failCount = 0;

    for (const id of ids) {
      try {
        const response = await fetch(`/api/articles?id=${id}`, {
          method: 'DELETE',
        });
        const result = await response.json();
        if (result.success) {
          successCount++;
          setArticles((prev) => prev.filter((a) => a.id !== String(id)));
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`成功删除 ${successCount} 篇文章`);
    }
    if (failCount > 0) {
      toast.error(`${failCount} 篇文章删除失败`);
    }
    setSelectedIds([]);
  };

  // 批量归档
  const handleBatchArchive = async (ids: number[]) => {
    let successCount = 0;
    let failCount = 0;

    for (const id of ids) {
      try {
        const response = await fetch('/api/articles', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status: 'archived' }),
        });
        const result = await response.json();
        if (result.success) {
          successCount++;
          setArticles((prev) =>
            prev.map((a) => (a.id === String(id) ? { ...a, status: 'archived' as ArticleStatus } : a))
          );
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`成功归档 ${successCount} 篇文章`);
    }
    if (failCount > 0) {
      toast.error(`${failCount} 篇文章归档失败`);
    }
    setSelectedIds([]);
  };

  // 批量导出
  const handleBatchExport = async (ids: number[]) => {
    let successCount = 0;

    for (const id of ids) {
      try {
        const response = await fetch('/api/articles/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, format: 'markdown' }),
        });
        const result = await response.json();
        if (result.success) {
          // 创建下载
          const blob = new Blob([result.data.content], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${result.data.title || 'article'}.md`;
          a.click();
          URL.revokeObjectURL(url);
          successCount++;
        }
      } catch (err) {
        console.error('导出失败:', err);
      }
    }

    if (successCount > 0) {
      toast.success(`成功导出 ${successCount} 篇文章`);
    }
    setSelectedIds([]);
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    setSelectedIds(filteredArticles.map(a => a.id));
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleStatusChange = async (id: string, newStatus: ArticleStatus) => {
    if (!ensureLogin()) return;
    try {
      const response = await fetch('/api/articles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const result = await response.json();
      if (result.success) {
        setArticles((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
        );
      } else {
        toast.error('更新失败', {
          description: result.error || '请稍后重试',
        });
      }
    } catch (err) {
      console.error('更新状态失败:', err);
      toast.error('更新失败', {
        description: '网络异常，请稍后重试',
      });
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // 获取公众号列表
  const fetchWechatAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const response = await fetch('/api/publish/wechat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_accounts' }),
      });
      const result = await response.json();
      if (result.success && result.data?.accounts) {
        const activeAccounts = result.data.accounts.filter((a: WechatAccount) => a.status === 'active');
        setWechatAccounts(activeAccounts);
        // 如果之前保存的公众号不在列表中，清除选择
        if (publishConfig.wechatAppid && !activeAccounts.find((a: WechatAccount) => a.wechatAppid === publishConfig.wechatAppid)) {
          setPublishConfig(prev => ({ ...prev, wechatAppid: '' }));
        }
      }
    } catch (err) {
      console.error('获取公众号列表失败:', err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // 发布到小红书 - 直接调用API并显示二维码
  const handlePublishToXiaohongshu = async (articleId: string) => {
    if (!ensureLogin()) return;

    setSelectedArticleForXhs(articleId);
    setOpenDropdownId(null);
    setXhsResult(null);
    setXhsPublishing(true);
    setShowXhsModal(true);

    try {
      const response = await fetch('/api/publish/xiaohongshu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: parseInt(articleId),
        }),
      });
      const result = await response.json();

      if (result.success) {
        setXhsResult({
          publishUrl: result.data.publishUrl,
          title: result.data.title,
          imageCount: result.data.imageCount,
        });
        // 更新文章状态
        setArticles((prev) =>
          prev.map((a) => (a.id === articleId ? { ...a, status: 'published' as ArticleStatus } : a))
        );
      } else {
        toast.error('生成发布链接失败', {
          description: result.error || '请稍后重试',
        });
        setShowXhsModal(false);
      }
    } catch (err) {
      console.error('发布失败:', err);
      toast.error('生成发布链接失败', {
        description: '请检查API配置是否正确',
      });
      setShowXhsModal(false);
    } finally {
      setXhsPublishing(false);
    }
  };

  // 复制文章
  const handleCopy = async (id: string) => {
    if (!ensureLogin()) return;
    try {
      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'copy', id }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success('复制成功');
        fetchArticles();
      } else {
        toast.error('复制失败', {
          description: result.error || '请稍后重试',
        });
      }
    } catch (err) {
      console.error('复制文章失败:', err);
      toast.error('复制失败', {
        description: '网络异常，请稍后重试',
      });
    }
    setOpenDropdownId(null);
  };

  // 归档文章
  const handleArchive = async (id: string) => {
    if (!ensureLogin()) return;
    if (!confirm('确定要归档这篇文章吗？归档后将不在列表中显示。')) return;
    try {
      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive', id }),
      });
      const result = await response.json();
      if (result.success) {
        setArticles((prev) => prev.filter((a) => a.id !== id));
        toast.success('归档成功');
      } else {
        toast.error('归档失败', {
          description: result.error || '请稍后重试',
        });
      }
    } catch (err) {
      console.error('归档文章失败:', err);
      toast.error('归档失败', {
        description: '网络异常，请稍后重试',
      });
    }
    setOpenDropdownId(null);
  };

  // 导出文章
  const handleExport = (id: string, format: 'markdown' | 'html') => {
    window.open(`/api/articles/export?id=${id}&format=${format}`, '_blank');
    setOpenDropdownId(null);
  };

  // 发布到公众号
  const handlePublishToWechat = async (articleId: string) => {
    if (!ensureLogin()) return;
    setSelectedArticleForPublish(articleId);
    setOpenDropdownId(null);
    await fetchWechatAccounts();
    setShowAccountModal(true);
  };

  // 确认发布到选定的公众号
  const confirmPublishToWechat = async () => {
    if (!ensureLogin()) return;
    if (!selectedArticleForPublish || !publishConfig.wechatAppid) {
      toast.error('请选择要发布的公众号');
      return;
    }

    setPublishingId(selectedArticleForPublish);
    setShowAccountModal(false);

    // 保存配置到localStorage
    localStorage.setItem(PUBLISH_CONFIG_STORAGE_KEY, JSON.stringify(publishConfig));

    try {
      const response = await fetch('/api/publish/wechat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'publish',
          articleId: parseInt(selectedArticleForPublish),
          wechatAppid: publishConfig.wechatAppid,
          contentFormat: publishConfig.contentFormat,
          articleType: publishConfig.articleType,
          author: publishConfig.author || undefined,
        }),
      });
      const result = await response.json();

      if (result.success) {
        toast.success('发布成功', {
          description: result.data?.message || '文章已添加到公众号草稿箱',
        });
        // 更新文章状态
        setArticles((prev) =>
          prev.map((a) => (a.id === selectedArticleForPublish ? { ...a, status: 'published' as ArticleStatus } : a))
        );
      } else {
        toast.error('发布失败', {
          description: result.error || '请稍后重试',
        });
      }
    } catch (err) {
      console.error('发布失败:', err);
      toast.error('发布失败', {
        description: '请检查API配置是否正确',
      });
    } finally {
      setPublishingId(null);
      setSelectedArticleForPublish(null);
    }
  };

  if (status !== 'loading' && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f0f23]">
        <Header title="发布管理" />
        <div className="p-6">
          <LoginPrompt description="登录后即可查看、编辑和发布文章" />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f23]">
        <Header
          title="发布管理"
          action={
            <Link
              href="/articles/new"
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
            >
              <Plus className="w-4 h-4" />
              新建文章
            </Link>
          }
        />
        <div className="p-6 space-y-6">
          <div className="bg-[#16162a] rounded-2xl p-4 border border-[#2d2d44] space-y-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-full" />
            <div className="flex gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9 flex-1" />
              ))}
            </div>
          </div>
          <div className="bg-[#16162a] rounded-2xl border border-[#2d2d44] divide-y divide-[#2d2d44]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-12 w-16 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-32 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f23]">
      <Header
        title="发布管理"
        action={
          <Link
            href="/articles/new"
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            新建文章
          </Link>
        }
      />

      <div className="p-6">
        {/* Filters */}
        <div className="bg-[#16162a] rounded-2xl p-4 border border-[#2d2d44] mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as ArticleStatus | 'all')}
                  className="appearance-none pl-4 pr-10 py-2 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="all">全部状态</option>
                  <option value="draft">草稿</option>
                  <option value="pending_review">待审核</option>
                  <option value="approved">已审核</option>
                  <option value="published">已发布</option>
                  <option value="failed">发布失败</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索标题..."
                className="w-full pl-10 pr-4 py-2 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 mt-4 border-t border-[#2d2d44] pt-4">
            {[
              { key: 'all', label: '全部' },
              { key: 'draft', label: '草稿' },
              { key: 'pending_review', label: '待审核' },
              { key: 'approved', label: '已审核' },
              { key: 'published', label: '已发布' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key as ArticleStatus | 'all')}
                className={`px-4 py-2 text-sm rounded-xl transition-colors ${statusFilter === tab.key
                  ? 'bg-indigo-500/20 text-indigo-400 font-medium'
                  : 'text-slate-400 hover:bg-[#1a1a2e] hover:text-slate-200'
                  }`}
              >
                {tab.label} ({statusCounts[tab.key as keyof typeof statusCounts]})
              </button>
            ))}
          </div>
        </div>

        {/* Articles Table */}
        <div className="bg-[#16162a] rounded-2xl border border-[#2d2d44] overflow-visible">
          <table className="w-full">
            <thead className="bg-[#1a1a2e] border-b border-[#2d2d44]">
              <tr>
                <th className="w-12 px-4 py-3">
                  <button onClick={toggleSelectAll} className="text-slate-500 hover:text-slate-300">
                    {selectedIds.length === filteredArticles.length && filteredArticles.length > 0 ? (
                      <CheckSquare className="w-5 h-5 text-indigo-400" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">标题</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400 w-28">状态</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400 w-32">创建时间</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400 w-40">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredArticles.map((article) => (
                <tr key={article.id} className="border-b border-[#2d2d44] hover:bg-[#1a1a2e] transition-colors">
                  <td className="px-4 py-4">
                    <button
                      onClick={() => toggleSelect(article.id)}
                      className="text-slate-500 hover:text-slate-300"
                    >
                      {selectedIds.includes(article.id) ? (
                        <CheckSquare className="w-5 h-5 text-indigo-400" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-start gap-3">
                      {article.coverImage ? (
                        <img
                          src={article.coverImage}
                          alt=""
                          className="w-16 h-12 object-cover rounded-lg flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-12 bg-[#1a1a2e] rounded-lg flex-shrink-0 flex items-center justify-center text-slate-500 text-xs">
                          无图
                        </div>
                      )}
                      <div className="min-w-0">
                        <Link
                          href={`/articles/${article.id}`}
                          className="text-sm font-medium text-slate-200 hover:text-indigo-400 line-clamp-2"
                        >
                          {article.title}
                        </Link>
                        <p className="text-xs text-slate-500 mt-1">来源: {article.source || '手动创建'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${statusConfig[article.status].bgColor} ${statusConfig[article.status].color}`}>
                      {statusConfig[article.status].label}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-500">{formatDate(article.createdAt)}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {/* 编辑按钮 */}
                      <Link
                        href={`/articles/${article.id}`}
                        className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>

                      {/* 主操作按钮 - 根据状态显示 */}
                      {article.status === 'draft' && (
                        <button
                          onClick={() => handleStatusChange(article.id, 'pending_review')}
                          className="px-3 py-1.5 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                        >
                          提交审核
                        </button>
                      )}

                      {article.status === 'pending_review' && (
                        <button
                          onClick={() => handleStatusChange(article.id, 'approved')}
                          className="px-3 py-1.5 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                        >
                          通过审核
                        </button>
                      )}

                      {article.status === 'failed' && (
                        <button
                          onClick={() => handleStatusChange(article.id, 'draft')}
                          className="px-3 py-1.5 text-sm bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-colors"
                        >
                          重新编辑
                        </button>
                      )}

                      {/* 统一的更多操作下拉菜单 */}
                      <div className="relative" ref={openDropdownId === article.id ? dropdownRef : null}>
                        <button
                          onClick={() => setOpenDropdownId(openDropdownId === article.id ? null : article.id)}
                          disabled={publishingId === article.id}
                          className="p-2 text-slate-500 hover:text-slate-300 hover:bg-[#2d2d44] rounded-lg transition-colors"
                          title="更多操作"
                        >
                          {publishingId === article.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="w-4 h-4" />
                          )}
                        </button>
                        {openDropdownId === article.id && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-[#1a1a2e] rounded-xl shadow-xl border border-[#2d2d44] py-1 z-50">
                            {/* 发布选项 - 已审核、已发布、发布失败状态可用 */}
                            {['approved', 'published', 'failed'].includes(article.status) && (
                              <>
                                <button
                                  onClick={() => handlePublishToXiaohongshu(article.id)}
                                  className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-[#2d2d44] flex items-center gap-2"
                                >
                                  <Send className="w-4 h-4 text-red-400" />
                                  发布到小红书
                                </button>
                                <button
                                  onClick={() => handlePublishToWechat(article.id)}
                                  className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-[#2d2d44] flex items-center gap-2"
                                >
                                  <Send className="w-4 h-4 text-green-400" />
                                  发布到公众号
                                </button>
                                <div className="border-t border-[#2d2d44] my-1" />
                              </>
                            )}

                            {/* 复制文章 - 所有状态可用 */}
                            <button
                              onClick={() => handleCopy(article.id)}
                              className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-[#2d2d44] flex items-center gap-2"
                            >
                              <Copy className="w-4 h-4 text-blue-400" />
                              复制文章
                            </button>

                            {/* 导出选项 - 所有状态可用 */}
                            <button
                              onClick={() => handleExport(article.id, 'markdown')}
                              className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-[#2d2d44] flex items-center gap-2"
                            >
                              <FileText className="w-4 h-4 text-purple-400" />
                              导出 Markdown
                            </button>
                            <button
                              onClick={() => handleExport(article.id, 'html')}
                              className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-[#2d2d44] flex items-center gap-2"
                            >
                              <Download className="w-4 h-4 text-cyan-400" />
                              导出 HTML
                            </button>

                            <div className="border-t border-[#2d2d44] my-1" />

                            {/* 归档 - 所有状态可用 */}
                            <button
                              onClick={() => handleArchive(article.id)}
                              className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-[#2d2d44] flex items-center gap-2"
                            >
                              <Archive className="w-4 h-4 text-amber-400" />
                              归档
                            </button>

                            {/* 删除 - 草稿和失败状态可用 */}
                            {['draft', 'failed'].includes(article.status) && (
                              <button
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  handleDelete(article.id);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                删除
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredArticles.length === 0 && (
            <EmptyState
              icon={<FileText className="w-6 h-6" />}
              title={articles.length === 0 ? '暂无文章' : '没有符合当前筛选条件的文章'}
              description={
                articles.length === 0
                  ? '前往「选题分析」页面使用一键创作功能生成文章'
                  : '尝试调整筛选条件或关键字以查看更多文章'
              }
              action={
                articles.length === 0
                  ? { label: '前往选题分析', href: '/analysis' }
                  : {
                    label: '重置筛选',
                    onClick: () => {
                      setStatusFilter('all');
                      setSearchQuery('');
                    },
                  }
              }
            />
          )}
        </div>

        {/* Batch Actions */}
        {selectedIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 ml-30 bg-[#16162a] border border-[#2d2d44] text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-4">
            <span className="text-sm text-slate-300">已选择 {selectedIds.length} 篇文章</span>
            <div className="w-px h-4 bg-[#2d2d44]" />
            <button
              onClick={() => {
                if (confirm(`确定要删除选中的 ${selectedIds.length} 篇文章吗？`)) {
                  selectedIds.forEach((id) => handleDelete(id));
                }
              }}
              className="text-sm text-slate-300 hover:text-red-400 transition-colors"
            >
              批量删除
            </button>
          </div>
        )}

        {/* 公众号发布配置弹窗 */}
        {showAccountModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#16162a] rounded-2xl p-6 border border-[#2d2d44] w-[480px] max-h-[85vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-slate-200 mb-6">发布到微信公众号</h3>

              {/* 公众号选择 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-3">选择公众号</label>
                {loadingAccounts ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                    <span className="ml-2 text-slate-400">加载中...</span>
                  </div>
                ) : wechatAccounts.length === 0 ? (
                  <div className="text-center py-6 bg-[#1a1a2e] rounded-xl border border-[#2d2d44]">
                    <p className="text-slate-400">暂无可用的公众号</p>
                    <p className="text-sm text-slate-500 mt-2">请先在设置页面配置公众号发布API</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {wechatAccounts.map((account) => (
                      <button
                        key={account.wechatAppid}
                        onClick={() => setPublishConfig(prev => ({ ...prev, wechatAppid: account.wechatAppid }))}
                        className={`w-full p-3 rounded-xl border transition-all flex items-center gap-3 text-left ${publishConfig.wechatAppid === account.wechatAppid
                          ? 'bg-indigo-500/20 border-indigo-500'
                          : 'bg-[#1a1a2e] border-[#2d2d44] hover:border-indigo-500/50'
                          }`}
                      >
                        {account.avatar ? (
                          <img src={account.avatar} alt="" className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                            📗
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-200 truncate">{account.name}</p>
                          <p className="text-xs text-slate-500">
                            {account.type === 'subscription' ? '订阅号' : '服务号'}
                            {account.verified && ' · 已认证'}
                          </p>
                        </div>
                        {publishConfig.wechatAppid === account.wechatAppid && (
                          <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 分隔线 */}
              <div className="border-t border-[#2d2d44] my-6" />

              {/* 发布配置 */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-slate-300">发布配置</h4>

                {/* 作者名称 */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">作者名称（选填）</label>
                  <input
                    type="text"
                    value={publishConfig.author}
                    onChange={(e) => setPublishConfig(prev => ({ ...prev, author: e.target.value }))}
                    placeholder="留空则不显示作者"
                    className="w-full px-3 py-2 bg-[#1a1a2e] border border-[#2d2d44] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                {/* 文章类型 */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">文章类型</label>
                  <div className="flex gap-3">
                    <label className={`flex-1 p-3 rounded-lg border cursor-pointer transition-all ${publishConfig.articleType === 'news'
                      ? 'bg-indigo-500/20 border-indigo-500'
                      : 'bg-[#1a1a2e] border-[#2d2d44] hover:border-indigo-500/50'
                      }`}>
                      <input
                        type="radio"
                        name="articleType"
                        value="news"
                        checked={publishConfig.articleType === 'news'}
                        onChange={(e) => setPublishConfig(prev => ({ ...prev, articleType: e.target.value as 'news' | 'newspic' }))}
                        className="sr-only"
                      />
                      <div className="text-sm font-medium text-slate-200">普通文章</div>
                      <div className="text-xs text-slate-500 mt-0.5">适合图文混排内容</div>
                    </label>
                    <label className={`flex-1 p-3 rounded-lg border cursor-pointer transition-all ${publishConfig.articleType === 'newspic'
                      ? 'bg-indigo-500/20 border-indigo-500'
                      : 'bg-[#1a1a2e] border-[#2d2d44] hover:border-indigo-500/50'
                      }`}>
                      <input
                        type="radio"
                        name="articleType"
                        value="newspic"
                        checked={publishConfig.articleType === 'newspic'}
                        onChange={(e) => setPublishConfig(prev => ({ ...prev, articleType: e.target.value as 'news' | 'newspic' }))}
                        className="sr-only"
                      />
                      <div className="text-sm font-medium text-slate-200">小绿书</div>
                      <div className="text-xs text-slate-500 mt-0.5">图片为主的内容</div>
                    </label>
                  </div>
                </div>

                {/* 内容格式 */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">内容格式</label>
                  <div className="flex gap-3">
                    <label className={`flex-1 p-3 rounded-lg border cursor-pointer transition-all ${publishConfig.contentFormat === 'html'
                      ? 'bg-indigo-500/20 border-indigo-500'
                      : 'bg-[#1a1a2e] border-[#2d2d44] hover:border-indigo-500/50'
                      }`}>
                      <input
                        type="radio"
                        name="contentFormat"
                        value="html"
                        checked={publishConfig.contentFormat === 'html'}
                        onChange={(e) => setPublishConfig(prev => ({ ...prev, contentFormat: e.target.value as 'html' | 'markdown' }))}
                        className="sr-only"
                      />
                      <div className="text-sm font-medium text-slate-200">HTML</div>
                      <div className="text-xs text-slate-500 mt-0.5">推荐，保留样式</div>
                    </label>
                    <label className={`flex-1 p-3 rounded-lg border cursor-pointer transition-all ${publishConfig.contentFormat === 'markdown'
                      ? 'bg-indigo-500/20 border-indigo-500'
                      : 'bg-[#1a1a2e] border-[#2d2d44] hover:border-indigo-500/50'
                      }`}>
                      <input
                        type="radio"
                        name="contentFormat"
                        value="markdown"
                        checked={publishConfig.contentFormat === 'markdown'}
                        onChange={(e) => setPublishConfig(prev => ({ ...prev, contentFormat: e.target.value as 'html' | 'markdown' }))}
                        className="sr-only"
                      />
                      <div className="text-sm font-medium text-slate-200">Markdown</div>
                      <div className="text-xs text-slate-500 mt-0.5">自动转换格式</div>
                    </label>
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAccountModal(false);
                    setSelectedArticleForPublish(null);
                  }}
                  className="flex-1 py-2.5 text-sm text-slate-400 hover:text-slate-200 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={confirmPublishToWechat}
                  disabled={!publishConfig.wechatAppid}
                  className="flex-1 py-2.5 text-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  确认发布
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 小红书发布弹窗 */}
        {showXhsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#16162a] rounded-2xl p-6 border border-[#2d2d44] w-[420px]">
              {/* 加载状态 */}
              {xhsPublishing ? (
                <div className="py-12 flex flex-col items-center">
                  <Loader2 className="w-12 h-12 animate-spin text-red-400 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-200 mb-2">
                    正在生成发布链接...
                  </h3>
                  <p className="text-sm text-slate-400">
                    请稍候，正在准备发布内容
                  </p>
                </div>
              ) : xhsResult ? (
                /* 二维码显示 */
                <>
                  <h3 className="text-lg font-semibold text-slate-200 mb-2 text-center flex items-center justify-center gap-2">
                    📕 扫码发布到小红书
                  </h3>
                  <p className="text-sm text-slate-400 text-center mb-6">
                    请使用小红书APP扫描二维码完成发布
                  </p>

                  {/* 二维码 */}
                  <div className="flex justify-center mb-6">
                    <div className="bg-white p-4 rounded-xl">
                      {xhsResult.publishUrl ? (
                        <QRCodeSVG
                          value={xhsResult.publishUrl}
                          size={192}
                          level="M"
                          includeMargin={false}
                        />
                      ) : (
                        <div className="w-48 h-48 flex flex-col items-center justify-center text-slate-500 text-sm">
                          <svg className="w-12 h-12 mb-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <p>二维码生成失败</p>
                          <p className="text-xs mt-1">发布链接未返回</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 文章信息 */}
                  <div className="bg-[#1a1a2e] rounded-xl p-4 mb-4 border border-[#2d2d44]">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-slate-400">文章标题</span>
                      <span className="text-slate-200 truncate max-w-[200px]">{xhsResult.title}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">图片数量</span>
                      <span className="text-slate-200">{xhsResult.imageCount} 张</span>
                    </div>
                  </div>

                  {/* 发布链接 */}
                  <div className="mb-6">
                    <p className="text-xs text-slate-500 mb-2">或复制链接在浏览器中打开：</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={xhsResult.publishUrl}
                        readOnly
                        className="flex-1 px-3 py-2 bg-[#1a1a2e] border border-[#2d2d44] rounded-lg text-slate-400 text-xs"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(xhsResult.publishUrl);
                          toast.success('链接已复制');
                        }}
                        className="px-3 py-2 bg-[#1a1a2e] border border-[#2d2d44] rounded-lg text-slate-400 hover:text-slate-200 text-xs"
                      >
                        复制
                      </button>
                    </div>
                  </div>

                  {/* 关闭按钮 */}
                  <button
                    onClick={() => {
                      setShowXhsModal(false);
                      setSelectedArticleForXhs(null);
                      setXhsResult(null);
                    }}
                    className="w-full py-2.5 text-sm text-white bg-gradient-to-r from-red-500 to-pink-500 rounded-xl hover:from-red-400 hover:to-pink-400 transition-all"
                  >
                    完成
                  </button>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* 批量操作工具栏 */}
      <BatchActionsBar
        selectedIds={selectedIds.map(id => parseInt(id))}
        totalCount={filteredArticles.length}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onDelete={handleBatchDelete}
        onArchive={handleBatchArchive}
        onExport={handleBatchExport}
      />
    </div>
  );
}
