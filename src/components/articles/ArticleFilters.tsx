'use client';

import { Search, ChevronDown } from 'lucide-react';
import { type ArticleStatus } from '@/lib/utils';

interface StatusCount {
    all: number;
    draft: number;
    pending_review: number;
    approved: number;
    published: number;
    failed: number;
    archived: number;
}

interface ArticleFiltersProps {
    statusFilter: ArticleStatus | 'all';
    searchQuery: string;
    statusCounts: StatusCount;
    onStatusChange: (status: ArticleStatus | 'all') => void;
    onSearchChange: (query: string) => void;
}

const statusTabs = [
    { key: 'all', label: '全部' },
    { key: 'draft', label: '草稿' },
    { key: 'pending_review', label: '待审核' },
    { key: 'approved', label: '已审核' },
    { key: 'published', label: '已发布' },
] as const;

export function ArticleFilters({
    statusFilter,
    searchQuery,
    statusCounts,
    onStatusChange,
    onSearchChange,
}: ArticleFiltersProps) {
    return (
        <div className="glass-card rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    {/* 状态下拉选择 */}
                    <div className="relative">
                        <select
                            value={statusFilter}
                            onChange={(e) => onStatusChange(e.target.value as ArticleStatus | 'all')}
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

                {/* 搜索框 */}
                <div className="relative flex-1 max-w-md group">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="搜索标题..."
                        className="relative w-full pl-10 pr-4 py-2 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                </div>
            </div>

            {/* 状态标签页 */}
            <div className="flex items-center gap-1 mt-4 border-t border-white/5 pt-4">
                {statusTabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => onStatusChange(tab.key as ArticleStatus | 'all')}
                        className={`px-4 py-2 text-sm rounded-xl transition-colors ${statusFilter === tab.key
                                ? 'bg-indigo-500/20 text-indigo-400 font-medium'
                                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                            }`}
                    >
                        {tab.label} ({statusCounts[tab.key as keyof StatusCount]})
                    </button>
                ))}
            </div>
        </div>
    );
}
