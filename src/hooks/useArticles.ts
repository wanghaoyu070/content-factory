'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { type ArticleStatus } from '@/lib/utils';

// ===== 类型定义 =====
export interface Article {
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

export interface StatusCounts {
    all: number;
    draft: number;
    pending_review: number;
    approved: number;
    published: number;
    failed: number;
    archived: number;
}

export interface UseArticlesOptions {
    autoFetch?: boolean;
}

export interface UseArticlesReturn {
    // 数据
    articles: Article[];
    filteredArticles: Article[];
    statusCounts: StatusCounts;

    // 状态
    loading: boolean;
    error: string | null;

    // 筛选
    statusFilter: ArticleStatus | 'all';
    searchQuery: string;
    setStatusFilter: (status: ArticleStatus | 'all') => void;
    setSearchQuery: (query: string) => void;

    // 选择
    selectedIds: string[];
    toggleSelect: (id: string) => void;
    toggleSelectAll: () => void;
    clearSelection: () => void;
    selectAll: () => void;

    // 操作
    fetchArticles: () => Promise<void>;
    deleteArticle: (id: string) => Promise<boolean>;
    updateStatus: (id: string, status: ArticleStatus) => Promise<boolean>;
    copyArticle: (id: string) => Promise<boolean>;
    archiveArticle: (id: string) => Promise<boolean>;

    // 批量操作
    batchDelete: (ids: string[]) => Promise<{ success: number; failed: number }>;
    batchArchive: (ids: string[]) => Promise<{ success: number; failed: number }>;
    batchExport: (ids: string[], format: 'markdown' | 'html') => Promise<void>;
}

// ===== Hook 实现 =====
export function useArticles(options: UseArticlesOptions = {}): UseArticlesReturn {
    const { autoFetch = true } = options;

    // 核心状态
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 筛选状态
    const [statusFilter, setStatusFilter] = useState<ArticleStatus | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // 选择状态
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // ===== 数据获取 =====
    const fetchArticles = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/articles');
            const result = await response.json();

            if (result.success) {
                setArticles(result.data);
            } else {
                setError(result.error || '获取文章失败');
            }
        } catch (err) {
            setError('网络异常，请稍后重试');
            console.error('获取文章失败:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // 自动获取
    useEffect(() => {
        if (autoFetch) {
            fetchArticles();
        }
    }, [autoFetch, fetchArticles]);

    // ===== 筛选逻辑 =====
    const filteredArticles = useMemo(() => {
        return articles.filter((article) => {
            const matchesStatus = statusFilter === 'all' || article.status === statusFilter;
            const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesStatus && matchesSearch;
        });
    }, [articles, statusFilter, searchQuery]);

    // ===== 状态统计 =====
    const statusCounts = useMemo((): StatusCounts => ({
        all: articles.length,
        draft: articles.filter((a) => a.status === 'draft').length,
        pending_review: articles.filter((a) => a.status === 'pending_review').length,
        approved: articles.filter((a) => a.status === 'approved').length,
        published: articles.filter((a) => a.status === 'published').length,
        failed: articles.filter((a) => a.status === 'failed').length,
        archived: articles.filter((a) => a.status === 'archived').length,
    }), [articles]);

    // ===== 选择操作 =====
    const toggleSelect = useCallback((id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    }, []);

    const toggleSelectAll = useCallback(() => {
        if (selectedIds.length === filteredArticles.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredArticles.map((a) => a.id));
        }
    }, [selectedIds.length, filteredArticles]);

    const clearSelection = useCallback(() => {
        setSelectedIds([]);
    }, []);

    const selectAll = useCallback(() => {
        setSelectedIds(filteredArticles.map((a) => a.id));
    }, [filteredArticles]);

    // ===== 单个操作 =====
    const deleteArticle = useCallback(async (id: string): Promise<boolean> => {
        try {
            const response = await fetch(`/api/articles?id=${id}`, {
                method: 'DELETE',
            });
            const result = await response.json();

            if (result.success) {
                setArticles((prev) => prev.filter((a) => a.id !== id));
                setSelectedIds((prev) => prev.filter((i) => i !== id));
                toast.success('删除成功');
                return true;
            } else {
                toast.error('删除失败', { description: result.error });
                return false;
            }
        } catch (err) {
            toast.error('删除失败', { description: '网络异常' });
            console.error('删除文章失败:', err);
            return false;
        }
    }, []);

    const updateStatus = useCallback(async (id: string, status: ArticleStatus): Promise<boolean> => {
        try {
            const response = await fetch('/api/articles', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status }),
            });
            const result = await response.json();

            if (result.success) {
                setArticles((prev) =>
                    prev.map((a) => (a.id === id ? { ...a, status } : a))
                );
                toast.success('状态更新成功');
                return true;
            } else {
                toast.error('更新失败', { description: result.error });
                return false;
            }
        } catch (err) {
            toast.error('更新失败', { description: '网络异常' });
            console.error('更新状态失败:', err);
            return false;
        }
    }, []);

    const copyArticle = useCallback(async (id: string): Promise<boolean> => {
        try {
            const response = await fetch('/api/articles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'copy', id }),
            });
            const result = await response.json();

            if (result.success) {
                await fetchArticles(); // 重新获取列表
                toast.success('复制成功');
                return true;
            } else {
                toast.error('复制失败', { description: result.error });
                return false;
            }
        } catch (err) {
            toast.error('复制失败', { description: '网络异常' });
            console.error('复制文章失败:', err);
            return false;
        }
    }, [fetchArticles]);

    const archiveArticle = useCallback(async (id: string): Promise<boolean> => {
        try {
            const response = await fetch('/api/articles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'archive', id }),
            });
            const result = await response.json();

            if (result.success) {
                setArticles((prev) =>
                    prev.map((a) => (a.id === id ? { ...a, status: 'archived' as ArticleStatus } : a))
                );
                toast.success('归档成功');
                return true;
            } else {
                toast.error('归档失败', { description: result.error });
                return false;
            }
        } catch (err) {
            toast.error('归档失败', { description: '网络异常' });
            console.error('归档文章失败:', err);
            return false;
        }
    }, []);

    // ===== 批量操作 =====
    const batchDelete = useCallback(async (ids: string[]): Promise<{ success: number; failed: number }> => {
        try {
            const response = await fetch('/api/articles/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', ids }),
            });
            const result = await response.json();

            if (result.success) {
                const { success, failed } = result.data;
                // 从本地状态中移除已删除的文章
                setArticles((prev) => prev.filter((a) => !ids.includes(a.id)));
                setSelectedIds([]);

                if (success > 0) toast.success(`成功删除 ${success} 篇文章`);
                if (failed > 0) toast.error(`${failed} 篇文章删除失败`);

                return { success, failed };
            } else {
                toast.error('批量删除失败', { description: result.error });
                return { success: 0, failed: ids.length };
            }
        } catch (err) {
            toast.error('批量删除失败', { description: '网络异常' });
            console.error('批量删除失败:', err);
            return { success: 0, failed: ids.length };
        }
    }, []);

    const batchArchive = useCallback(async (ids: string[]): Promise<{ success: number; failed: number }> => {
        try {
            const response = await fetch('/api/articles/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'archive', ids }),
            });
            const result = await response.json();

            if (result.success) {
                const { success, failed } = result.data;
                // 更新本地状态中的文章状态
                setArticles((prev) =>
                    prev.map((a) =>
                        ids.includes(a.id) ? { ...a, status: 'archived' as ArticleStatus } : a
                    )
                );
                setSelectedIds([]);

                if (success > 0) toast.success(`成功归档 ${success} 篇文章`);
                if (failed > 0) toast.error(`${failed} 篇文章归档失败`);

                return { success, failed };
            } else {
                toast.error('批量归档失败', { description: result.error });
                return { success: 0, failed: ids.length };
            }
        } catch (err) {
            toast.error('批量归档失败', { description: '网络异常' });
            console.error('批量归档失败:', err);
            return { success: 0, failed: ids.length };
        }
    }, []);

    const batchExport = useCallback(async (ids: string[], format: 'markdown' | 'html'): Promise<void> => {
        let success = 0;

        for (const id of ids) {
            try {
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
                    success++;
                }
            } catch (err) {
                console.error('导出失败:', err);
            }
        }

        if (success > 0) toast.success(`成功导出 ${success} 篇文章`);
        setSelectedIds([]);
    }, []);

    return {
        // 数据
        articles,
        filteredArticles,
        statusCounts,

        // 状态
        loading,
        error,

        // 筛选
        statusFilter,
        searchQuery,
        setStatusFilter,
        setSearchQuery,

        // 选择
        selectedIds,
        toggleSelect,
        toggleSelectAll,
        clearSelection,
        selectAll,

        // 操作
        fetchArticles,
        deleteArticle,
        updateStatus,
        copyArticle,
        archiveArticle,

        // 批量操作
        batchDelete,
        batchArchive,
        batchExport,
    };
}
