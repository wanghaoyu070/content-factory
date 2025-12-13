'use client';

import Link from 'next/link';
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
    Calendar,
    Image as ImageIcon,
} from 'lucide-react';
import { type ArticleStatus, STATUS_CONFIG, formatRelativeTime, stripHtml, truncateText } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';

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

interface ArticleCardProps {
    article: Article;
    isSelected: boolean;
    isPublishing: boolean;
    onToggleSelect: (id: string) => void;
    onStatusChange: (id: string, status: ArticleStatus) => void;
    onDelete: (id: string) => void;
    onCopy: (id: string) => void;
    onArchive: (id: string) => void;
    onExport: (id: string, format: 'markdown' | 'html') => void;
    onPublishToWechat: (id: string) => void;
    onPublishToXiaohongshu: (id: string) => void;
}

export function ArticleCard({
    article,
    isSelected,
    isPublishing,
    onToggleSelect,
    onStatusChange,
    onDelete,
    onCopy,
    onArchive,
    onExport,
    onPublishToWechat,
    onPublishToXiaohongshu,
}: ArticleCardProps) {
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const statusConfig = STATUS_CONFIG[article.status];

    // 点击外部关闭下拉菜单
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        if (showDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showDropdown]);

    // 提取纯文本摘要
    const summary = truncateText(stripHtml(article.content), 100);

    return (
        <div
            className={`glass-card rounded-2xl overflow-hidden transition-all group ${isSelected ? 'ring-2 ring-indigo-500' : ''
                }`}
        >
            {/* 封面图 */}
            <div className="relative aspect-video bg-[#1a1a2e]">
                {article.coverImage ? (
                    <img
                        src={article.coverImage}
                        alt={article.title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500">
                        <ImageIcon className="w-12 h-12" />
                    </div>
                )}

                {/* 选择按钮 */}
                <button
                    onClick={() => onToggleSelect(article.id)}
                    className="absolute top-3 left-3 p-1.5 rounded-lg bg-black/40 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-indigo-400" />
                    ) : (
                        <Square className="w-5 h-5" />
                    )}
                </button>

                {/* 状态标签 */}
                <div className="absolute top-3 right-3">
                    <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${statusConfig.bgColor} ${statusConfig.textColor}`}
                    >
                        {statusConfig.label}
                    </span>
                </div>

                {/* 图片数量 */}
                {article.images.length > 0 && (
                    <div className="absolute bottom-3 right-3 px-2 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white text-xs flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" />
                        {article.images.length}
                    </div>
                )}
            </div>

            {/* 内容区 */}
            <div className="p-4">
                {/* 标题 */}
                <Link href={`/articles/${article.id}`}>
                    <h3 className="font-medium text-slate-100 line-clamp-2 hover:text-indigo-400 transition-colors mb-2">
                        {article.title}
                    </h3>
                </Link>

                {/* 摘要 */}
                <p className="text-sm text-slate-400 line-clamp-2 mb-3">{summary}</p>

                {/* 底部信息 */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Calendar className="w-3 h-3" />
                        {formatRelativeTime(article.createdAt)}
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-1">
                        <Link
                            href={`/articles/${article.id}`}
                            className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                        >
                            <Edit className="w-4 h-4" />
                        </Link>

                        {/* 更多操作 */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setShowDropdown(!showDropdown)}
                                disabled={isPublishing}
                                className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-lg transition-colors"
                            >
                                {isPublishing ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <MoreHorizontal className="w-4 h-4" />
                                )}
                            </button>

                            {showDropdown && (
                                <div className="absolute right-0 top-full mt-1 w-40 bg-[#1a1a2e] rounded-xl shadow-xl border border-[#2d2d44] py-1 z-50">
                                    {/* 发布选项 */}
                                    {['approved', 'published', 'failed'].includes(article.status) && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setShowDropdown(false);
                                                    onPublishToXiaohongshu(article.id);
                                                }}
                                                className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/5 flex items-center gap-2"
                                            >
                                                <Send className="w-4 h-4 text-red-400" />
                                                发布到小红书
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowDropdown(false);
                                                    onPublishToWechat(article.id);
                                                }}
                                                className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/5 flex items-center gap-2"
                                            >
                                                <Send className="w-4 h-4 text-green-400" />
                                                发布到公众号
                                            </button>
                                            <div className="border-t border-white/5 my-1" />
                                        </>
                                    )}

                                    <button
                                        onClick={() => {
                                            setShowDropdown(false);
                                            onCopy(article.id);
                                        }}
                                        className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/5 flex items-center gap-2"
                                    >
                                        <Copy className="w-4 h-4 text-blue-400" />
                                        复制
                                    </button>

                                    <button
                                        onClick={() => {
                                            setShowDropdown(false);
                                            onExport(article.id, 'markdown');
                                        }}
                                        className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/5 flex items-center gap-2"
                                    >
                                        <FileText className="w-4 h-4 text-purple-400" />
                                        导出 MD
                                    </button>

                                    <button
                                        onClick={() => {
                                            setShowDropdown(false);
                                            onExport(article.id, 'html');
                                        }}
                                        className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/5 flex items-center gap-2"
                                    >
                                        <Download className="w-4 h-4 text-cyan-400" />
                                        导出 HTML
                                    </button>

                                    <div className="border-t border-white/5 my-1" />

                                    <button
                                        onClick={() => {
                                            setShowDropdown(false);
                                            onArchive(article.id);
                                        }}
                                        className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/5 flex items-center gap-2"
                                    >
                                        <Archive className="w-4 h-4 text-amber-400" />
                                        归档
                                    </button>

                                    {['draft', 'failed'].includes(article.status) && (
                                        <button
                                            onClick={() => {
                                                setShowDropdown(false);
                                                onDelete(article.id);
                                            }}
                                            className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            删除
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// 卡片视图网格
interface ArticleCardGridProps {
    articles: Article[];
    selectedIds: string[];
    publishingId: string | null;
    onToggleSelect: (id: string) => void;
    onStatusChange: (id: string, status: ArticleStatus) => void;
    onDelete: (id: string) => void;
    onCopy: (id: string) => void;
    onArchive: (id: string) => void;
    onExport: (id: string, format: 'markdown' | 'html') => void;
    onPublishToWechat: (id: string) => void;
    onPublishToXiaohongshu: (id: string) => void;
}

export function ArticleCardGrid({
    articles,
    selectedIds,
    publishingId,
    onToggleSelect,
    onStatusChange,
    onDelete,
    onCopy,
    onArchive,
    onExport,
    onPublishToWechat,
    onPublishToXiaohongshu,
}: ArticleCardGridProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {articles.map((article, index) => (
                <div
                    key={article.id}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                >
                    <ArticleCard
                        article={article}
                        isSelected={selectedIds.includes(article.id)}
                        isPublishing={publishingId === article.id}
                        onToggleSelect={onToggleSelect}
                        onStatusChange={onStatusChange}
                        onDelete={onDelete}
                        onCopy={onCopy}
                        onArchive={onArchive}
                        onExport={onExport}
                        onPublishToWechat={onPublishToWechat}
                        onPublishToXiaohongshu={onPublishToXiaohongshu}
                    />
                </div>
            ))}
        </div>
    );
}
