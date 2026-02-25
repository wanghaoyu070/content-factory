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
    Eye,
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
    onPreview: (article: Article) => void;
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
    onPreview,
    onPublishToWechat,
    onPublishToXiaohongshu,
    formatDate,
}: ArticleRowProps) {
    const dropdownRef = useRef<HTMLDivElement>(null);
    const statusConfig = STATUS_CONFIG[article.status];

    return (
        <tr className="border-b border-[rgba(0,0,0,0.06)] hover:bg-[#F7F6F0] transition-colors">
            {/* 选择框 */}
            <td className="px-4 py-4">
                <button
                    onClick={() => onToggleSelect(article.id)}
                    className="text-[#999] hover:text-[#333]"
                >
                    {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-[#333]" />
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
                        <div className="w-16 h-12 bg-[#F7F6F0] rounded-lg flex-shrink-0 flex items-center justify-center text-[#999] text-xs">
                            无图
                        </div>
                    )}
                    <div className="min-w-0">
                        <Link
                            href={`/articles/${article.id}`}
                            className="text-sm font-medium text-[#1A1A1A] hover:text-[#333] line-clamp-2"
                        >
                            {article.title}
                        </Link>
                        <p className="text-xs text-[#999] mt-1">
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
            <td className="px-4 py-4 text-sm text-[#999]">
                {formatDate(article.createdAt)}
            </td>

            {/* 操作 */}
            <td className="px-4 py-4">
                <div className="flex items-center justify-end gap-1">
                    {/* 1. 预览按钮 */}
                    <button
                        onClick={() => onPreview(article)}
                        className="p-2 text-[#999] hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors tooltip"
                        title="预览文章"
                    >
                        <Eye className="w-4 h-4" />
                    </button>

                    {/* 2. 编辑按钮 */}
                    <Link
                        href={`/articles/${article.id}`}
                        className="p-2 text-[#999] hover:text-[#333] hover:bg-[rgba(0,0,0,0.04)] rounded-lg transition-colors"
                        title="编辑文章"
                    >
                        <Edit className="w-4 h-4" />
                    </Link>

                    {/* 3. 更多操作下拉菜单 */}
                    <div className="relative" ref={isDropdownOpen ? dropdownRef : null}>
                        <button
                            onClick={() => onOpenDropdown(isDropdownOpen ? null : article.id)}
                            disabled={isPublishing}
                            className={`p-2 rounded-lg transition-colors ${isDropdownOpen
                                    ? 'bg-[rgba(0,0,0,0.06)] text-[#333]'
                                    : 'text-[#999] hover:text-[#333] hover:bg-[#2d2d44]'
                                }`}
                            title="更多操作"
                        >
                            {isPublishing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <MoreHorizontal className="w-4 h-4" />
                            )}
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-[#F7F6F0] rounded-xl shadow-xl shadow-black/50 border border-[rgba(0,0,0,0.06)] py-1.5 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                {/* 发布选项 */}
                                {['approved', 'published', 'failed'].includes(article.status) && (
                                    <>
                                        <div className="px-3 py-1.5 text-xs font-medium text-[#999]">发布到</div>
                                        <button
                                            onClick={() => onPublishToXiaohongshu(article.id)}
                                            className="w-full px-4 py-2 text-left text-sm text-[#333] hover:bg-[#2d2d44] hover:text-red-400 flex items-center gap-2 transition-colors"
                                        >
                                            <Send className="w-3.5 h-3.5" />
                                            小红书
                                        </button>
                                        <button
                                            onClick={() => onPublishToWechat(article.id)}
                                            className="w-full px-4 py-2 text-left text-sm text-[#333] hover:bg-[#2d2d44] hover:text-green-400 flex items-center gap-2 transition-colors"
                                        >
                                            <Send className="w-3.5 h-3.5" />
                                            微信公众号
                                        </button>
                                        <div className="border-t border-[rgba(0,0,0,0.06)] my-1" />
                                    </>
                                )}

                                {/* 普通操作 */}
                                <button
                                    onClick={() => onCopy(article.id)}
                                    className="w-full px-4 py-2 text-left text-sm text-[#333] hover:bg-[#2d2d44] flex items-center gap-2 transition-colors"
                                >
                                    <Copy className="w-3.5 h-3.5 text-blue-400" />
                                    创建副本
                                </button>
                                <button
                                    onClick={() => onExport(article.id, 'markdown')}
                                    className="w-full px-4 py-2 text-left text-sm text-[#333] hover:bg-[#2d2d44] flex items-center gap-2 transition-colors"
                                >
                                    <Download className="w-3.5 h-3.5 text-purple-400" />
                                    导出 Markdown
                                </button>

                                <div className="border-t border-[rgba(0,0,0,0.06)] my-1" />

                                {/* 危险操作 */}
                                <button
                                    onClick={() => {
                                        onOpenDropdown(null);
                                        onDelete(article.id);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    删除文章
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 4. 主流程按钮 (放在最后，作为 Call to Action) */}
                    {article.status === 'draft' && (
                        <button
                            onClick={() => onStatusChange(article.id, 'pending_review')}
                            className="ml-2 px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-[#1A1A1A] rounded-lg transition-all shadow-lg shadow-black/8 flex items-center gap-1.5 whitespace-nowrap"
                        >
                            <Send className="w-3.5 h-3.5" />
                            <span>提交审核</span>
                        </button>
                    )}

                    {article.status === 'pending_review' && (
                        <button
                            onClick={() => onStatusChange(article.id, 'approved')}
                            className="ml-2 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-[#1A1A1A] rounded-lg transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 whitespace-nowrap"
                        >
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span>通过审核</span>
                        </button>
                    )}

                    {article.status === 'failed' && (
                        <button
                            onClick={() => onStatusChange(article.id, 'draft')}
                            className="ml-2 px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-[#1A1A1A] rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap"
                        >
                            <Edit className="w-3.5 h-3.5" />
                            <span>继续编辑</span>
                        </button>
                    )}
                </div>
            </td>
        </tr >
    );
}
