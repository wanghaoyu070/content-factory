'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import {
    Edit,
    MoreHorizontal,
    Send,
    Copy,
    FileText,
    Download,
    Archive,
    Trash2,
    Loader2,
    CheckSquare,
    Square,
} from 'lucide-react';
import { type ArticleStatus, STATUS_CONFIG } from '@/lib/utils';

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

interface ArticleRowProps {
    article: Article;
    isSelected: boolean;
    isDropdownOpen: boolean;
    isPublishing: boolean;
    onToggleSelect: (id: string) => void;
    onOpenDropdown: (id: string | null) => void;
    onStatusChange: (id: string, status: ArticleStatus) => void;
    onDelete: (id: string) => void;
    onCopy: (id: string) => void;
    onArchive: (id: string) => void;
    onExport: (id: string, format: 'markdown' | 'html') => void;
    onPublishToWechat: (id: string) => void;
    onPublishToXiaohongshu: (id: string) => void;
    formatDate: (date: string) => string;
}

export function ArticleRow({
    article,
    isSelected,
    isDropdownOpen,
    isPublishing,
    onToggleSelect,
    onOpenDropdown,
    onStatusChange,
    onDelete,
    onCopy,
    onArchive,
    onExport,
    onPublishToWechat,
    onPublishToXiaohongshu,
    formatDate,
}: ArticleRowProps) {
    const dropdownRef = useRef<HTMLDivElement>(null);
    const statusConfig = STATUS_CONFIG[article.status];

    return (
        <tr className="border-b border-[#2d2d44] hover:bg-[#1a1a2e] transition-colors">
            {/* 选择框 */}
            <td className="px-4 py-4">
                <button
                    onClick={() => onToggleSelect(article.id)}
                    className="text-slate-500 hover:text-slate-300"
                >
                    {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-indigo-400" />
                    ) : (
                        <Square className="w-5 h-5" />
                    )}
                </button>
            </td>

            {/* 标题和封面 */}
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
                        <p className="text-xs text-slate-500 mt-1">
                            来源: {article.source || '手动创建'}
                        </p>
                    </div>
                </div>
            </td>

            {/* 状态 */}
            <td className="px-4 py-4">
                <span
                    className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${statusConfig.bgColor} ${statusConfig.textColor}`}
                >
                    {statusConfig.label}
                </span>
            </td>

            {/* 创建时间 */}
            <td className="px-4 py-4 text-sm text-slate-500">
                {formatDate(article.createdAt)}
            </td>

            {/* 操作 */}
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
                            onClick={() => onStatusChange(article.id, 'pending_review')}
                            className="px-3 py-1.5 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                        >
                            提交审核
                        </button>
                    )}

                    {article.status === 'pending_review' && (
                        <button
                            onClick={() => onStatusChange(article.id, 'approved')}
                            className="px-3 py-1.5 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                        >
                            通过审核
                        </button>
                    )}

                    {article.status === 'failed' && (
                        <button
                            onClick={() => onStatusChange(article.id, 'draft')}
                            className="px-3 py-1.5 text-sm bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-colors"
                        >
                            重新编辑
                        </button>
                    )}

                    {/* 更多操作下拉菜单 */}
                    <div className="relative" ref={isDropdownOpen ? dropdownRef : null}>
                        <button
                            onClick={() => onOpenDropdown(isDropdownOpen ? null : article.id)}
                            disabled={isPublishing}
                            className="p-2 text-slate-500 hover:text-slate-300 hover:bg-[#2d2d44] rounded-lg transition-colors"
                            title="更多操作"
                        >
                            {isPublishing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <MoreHorizontal className="w-4 h-4" />
                            )}
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute right-0 top-full mt-1 w-44 bg-[#1a1a2e] rounded-xl shadow-xl border border-[#2d2d44] py-1 z-50">
                                {/* 发布选项 */}
                                {['approved', 'published', 'failed'].includes(article.status) && (
                                    <>
                                        <button
                                            onClick={() => onPublishToXiaohongshu(article.id)}
                                            className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-[#2d2d44] flex items-center gap-2"
                                        >
                                            <Send className="w-4 h-4 text-red-400" />
                                            发布到小红书
                                        </button>
                                        <button
                                            onClick={() => onPublishToWechat(article.id)}
                                            className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-[#2d2d44] flex items-center gap-2"
                                        >
                                            <Send className="w-4 h-4 text-green-400" />
                                            发布到公众号
                                        </button>
                                        <div className="border-t border-[#2d2d44] my-1" />
                                    </>
                                )}

                                {/* 复制 */}
                                <button
                                    onClick={() => onCopy(article.id)}
                                    className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-[#2d2d44] flex items-center gap-2"
                                >
                                    <Copy className="w-4 h-4 text-blue-400" />
                                    复制文章
                                </button>

                                {/* 导出 */}
                                <button
                                    onClick={() => onExport(article.id, 'markdown')}
                                    className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-[#2d2d44] flex items-center gap-2"
                                >
                                    <FileText className="w-4 h-4 text-purple-400" />
                                    导出 Markdown
                                </button>
                                <button
                                    onClick={() => onExport(article.id, 'html')}
                                    className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-[#2d2d44] flex items-center gap-2"
                                >
                                    <Download className="w-4 h-4 text-cyan-400" />
                                    导出 HTML
                                </button>

                                <div className="border-t border-[#2d2d44] my-1" />

                                {/* 归档 */}
                                <button
                                    onClick={() => onArchive(article.id)}
                                    className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-[#2d2d44] flex items-center gap-2"
                                >
                                    <Archive className="w-4 h-4 text-amber-400" />
                                    归档
                                </button>

                                {/* 删除 */}
                                {['draft', 'failed'].includes(article.status) && (
                                    <button
                                        onClick={() => {
                                            onOpenDropdown(null);
                                            onDelete(article.id);
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
    );
}
