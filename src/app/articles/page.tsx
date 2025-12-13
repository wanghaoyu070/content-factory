'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import LoginPrompt from '@/components/ui/LoginPrompt';
import { useLoginGuard } from '@/hooks/useLoginGuard';
import { useArticles } from '@/hooks/useArticles';
import { usePublish } from '@/hooks/usePublish';
import {
  Plus,
  LayoutGrid,
  List,
  CheckSquare,
  Square,
  FileText,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  ArticleFilters,
  ArticleCardGrid,
  ArticleRow,
  WechatPublishModal,
  XiaohongshuPublishModal,
  BatchActionsBar,
} from '@/components/articles';
import { type ArticleStatus, STATUS_CONFIG, formatDate } from '@/lib/utils';

type ViewMode = 'table' | 'card';

export default function ArticlesPage() {
  const { ensureLogin, isAuthenticated, status } = useLoginGuard('请登录后管理文章');

  // 视图模式
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // 使用自定义 Hooks
  const {
    filteredArticles,
    statusCounts,
    loading,
    statusFilter,
    searchQuery,
    setStatusFilter,
    setSearchQuery,
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    selectAll,
    deleteArticle,
    updateStatus,
    copyArticle,
    archiveArticle,
    batchDelete,
    batchArchive,
    batchExport,
  } = useArticles({ autoFetch: isAuthenticated });

  const {
    wechatAccounts,
    loadingAccounts,
    showWechatModal,
    wechatConfig,
    setWechatConfig,
    openWechatPublishModal,
    closeWechatPublishModal,
    publishToWechat,
    showXhsModal,
    xhsPublishing,
    xhsResult,
    openXhsPublishModal,
    closeXhsPublishModal,
    publishingId,
  } = usePublish();

  // 下拉菜单状态
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // 处理删除
  const handleDelete = useCallback(async (id: string) => {
    if (!ensureLogin()) return;
    if (!confirm('确定要删除这篇文章吗？')) return;
    await deleteArticle(id);
    setOpenDropdownId(null);
  }, [ensureLogin, deleteArticle]);

  // 处理状态变更
  const handleStatusChange = useCallback(async (id: string, newStatus: ArticleStatus) => {
    if (!ensureLogin()) return;
    await updateStatus(id, newStatus);
  }, [ensureLogin, updateStatus]);

  // 处理复制
  const handleCopy = useCallback(async (id: string) => {
    if (!ensureLogin()) return;
    await copyArticle(id);
    setOpenDropdownId(null);
  }, [ensureLogin, copyArticle]);

  // 处理归档
  const handleArchive = useCallback(async (id: string) => {
    if (!ensureLogin()) return;
    await archiveArticle(id);
    setOpenDropdownId(null);
  }, [ensureLogin, archiveArticle]);

  // 处理导出
  const handleExport = useCallback(async (id: string, format: 'markdown' | 'html') => {
    const response = await fetch(`/api/articles/export?id=${id}&format=${format}`);
    if (response.ok) {
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename\*=UTF-8''(.+)/);
      const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : `article.${format === 'markdown' ? 'md' : 'html'}`;

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
    setOpenDropdownId(null);
  }, []);

  // 处理批量删除
  const handleBatchDelete = useCallback(async (ids: number[]) => {
    await batchDelete(ids.map(String));
  }, [batchDelete]);

  // 处理批量归档
  const handleBatchArchive = useCallback(async (ids: number[]) => {
    await batchArchive(ids.map(String));
  }, [batchArchive]);

  // 处理批量导出
  const handleBatchExport = useCallback(async (ids: number[]) => {
    await batchExport(ids.map(String), 'markdown');
  }, [batchExport]);

  // 未登录状态
  if (status !== 'loading' && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <Header title="发布管理" />
        <div className="p-6">
          <LoginPrompt description="登录后即可查看、编辑和发布文章" />
        </div>
      </div>
    );
  }

  // 加载状态
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <Header
          title="发布管理"
          action={
            <Link
              href="/articles/new"
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20 btn-primary"
            >
              <Plus className="w-4 h-4" />
              新建文章
            </Link>
          }
        />
        <div className="p-6 space-y-6">
          <div className="glass-card rounded-2xl p-4 space-y-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-full" />
            <div className="flex gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9 flex-1" />
              ))}
            </div>
          </div>
          <div className="glass-card rounded-2xl divide-y divide-white/5">
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
    <div className="min-h-screen bg-[var(--background)]">
      <Header
        title="发布管理"
        action={
          <div className="flex items-center gap-3">
            {/* 视图切换 */}
            <div className="flex items-center glass-card rounded-lg p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'table'
                    ? 'bg-indigo-500/20 text-indigo-400'
                    : 'text-slate-400 hover:text-slate-200'
                  }`}
                title="表格视图"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'card'
                    ? 'bg-indigo-500/20 text-indigo-400'
                    : 'text-slate-400 hover:text-slate-200'
                  }`}
                title="卡片视图"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            <Link
              href="/articles/new"
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20 btn-primary"
            >
              <Plus className="w-4 h-4" />
              新建文章
            </Link>
          </div>
        }
      />

      <div className="p-6">
        {/* 筛选器 */}
        <ArticleFilters
          statusFilter={statusFilter}
          searchQuery={searchQuery}
          statusCounts={statusCounts}
          onStatusChange={setStatusFilter}
          onSearchChange={setSearchQuery}
        />

        {/* 文章列表 */}
        {filteredArticles.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-6 h-6" />}
            title={statusCounts.all === 0 ? '暂无文章' : '没有符合当前筛选条件的文章'}
            description={
              statusCounts.all === 0
                ? '前往「选题分析」页面使用一键创作功能生成文章'
                : '尝试调整筛选条件或关键字以查看更多文章'
            }
            action={
              statusCounts.all === 0
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
        ) : viewMode === 'card' ? (
          /* 卡片视图 */
          <ArticleCardGrid
            articles={filteredArticles}
            selectedIds={selectedIds}
            publishingId={publishingId}
            onToggleSelect={toggleSelect}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            onCopy={handleCopy}
            onArchive={handleArchive}
            onExport={handleExport}
            onPublishToWechat={openWechatPublishModal}
            onPublishToXiaohongshu={openXhsPublishModal}
          />
        ) : (
          /* 表格视图 */
          <div className="glass-card rounded-2xl overflow-visible">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/5">
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
                  <ArticleRow
                    key={article.id}
                    article={article}
                    isSelected={selectedIds.includes(article.id)}
                    isDropdownOpen={openDropdownId === article.id}
                    isPublishing={publishingId === article.id}
                    onToggleSelect={toggleSelect}
                    onOpenDropdown={setOpenDropdownId}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                    onCopy={handleCopy}
                    onArchive={handleArchive}
                    onExport={handleExport}
                    onPublishToWechat={openWechatPublishModal}
                    onPublishToXiaohongshu={openXhsPublishModal}
                    formatDate={formatDate}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 批量操作工具栏 */}
      <BatchActionsBar
        selectedIds={selectedIds.map(id => parseInt(id))}
        totalCount={filteredArticles.length}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
        onDelete={handleBatchDelete}
        onArchive={handleBatchArchive}
        onExport={handleBatchExport}
      />

      {/* 微信发布模态框 */}
      <WechatPublishModal
        isOpen={showWechatModal}
        onClose={closeWechatPublishModal}
        onConfirm={publishToWechat}
        accounts={wechatAccounts}
        loadingAccounts={loadingAccounts}
        config={wechatConfig}
        onConfigChange={setWechatConfig}
      />

      {/* 小红书发布模态框 */}
      <XiaohongshuPublishModal
        isOpen={showXhsModal}
        onClose={closeXhsPublishModal}
        isPublishing={xhsPublishing}
        result={xhsResult}
      />
    </div>
  );
}
