'use client';

import { useState } from 'react';
import { X, Smartphone, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import PlatformPreview from '@/components/preview/PlatformPreview';

interface Article {
    id: number;
    title: string;
    content: string;
    coverImage?: string;
    images?: string[];
}

interface ArticlePreviewModalProps {
    article: Article | null;
    isOpen: boolean;
    onClose: () => void;
}

export function ArticlePreviewModal({ article, isOpen, onClose }: ArticlePreviewModalProps) {
    const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('mobile');

    if (!isOpen || !article) return null;

    // 清理 HTML 获取纯文本
    const getPlainText = (html: string) => {
        return html
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n')
            .replace(/<\/h[1-6]>/gi, '\n\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .trim();
    };

    // 处理封面图
    let coverImage = article.coverImage;
    if (!coverImage && article.images && article.images.length > 0) {
        try {
            const images = typeof article.images === 'string'
                ? JSON.parse(article.images)
                : article.images;
            if (Array.isArray(images) && images.length > 0) {
                coverImage = images[0];
            }
        } catch {
            // ignore
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* 背景遮罩 */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* 模态框 */}
            <div className="relative bg-[#16162a] rounded-2xl border border-[#2d2d44] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl animate-slide-up">
                {/* 头部 */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#2d2d44]">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-semibold text-slate-200">预览文章</h2>
                        <div className="flex items-center gap-1 bg-[#1a1a2e] rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('mobile')}
                                className={cn(
                                    'px-3 py-1.5 text-xs rounded-md transition-all flex items-center gap-1',
                                    viewMode === 'mobile'
                                        ? 'bg-indigo-500/20 text-indigo-400'
                                        : 'text-slate-400 hover:text-slate-200'
                                )}
                            >
                                <Smartphone className="w-4 h-4" />
                                手机视图
                            </button>
                            <button
                                onClick={() => setViewMode('desktop')}
                                className={cn(
                                    'px-3 py-1.5 text-xs rounded-md transition-all flex items-center gap-1',
                                    viewMode === 'desktop'
                                        ? 'bg-indigo-500/20 text-indigo-400'
                                        : 'text-slate-400 hover:text-slate-200'
                                )}
                            >
                                <Monitor className="w-4 h-4" />
                                网页视图
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-200 hover:bg-[#1a1a2e] rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 内容区域 */}
                <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6">
                    {viewMode === 'mobile' ? (
                        /* 手机视图：使用 PlatformPreview 组件 */
                        <div className="flex justify-center">
                            <PlatformPreview
                                title={article.title}
                                content={article.content}
                                coverImage={coverImage}
                                author="内容工厂"
                            />
                        </div>
                    ) : (
                        /* 网页视图：完整文章预览 */
                        <div className="max-w-2xl mx-auto">
                            {/* 封面图 */}
                            {coverImage && (
                                <div className="mb-6 rounded-xl overflow-hidden">
                                    <img
                                        src={coverImage}
                                        alt="封面"
                                        className="w-full h-64 object-cover"
                                    />
                                </div>
                            )}

                            {/* 标题 */}
                            <h1 className="text-2xl font-bold text-slate-100 mb-4">
                                {article.title || '无标题'}
                            </h1>

                            {/* 元信息 */}
                            <div className="flex items-center gap-4 text-sm text-slate-500 mb-6 pb-4 border-b border-[#2d2d44]">
                                <span>内容工厂</span>
                                <span>•</span>
                                <span>{new Date().toLocaleDateString('zh-CN')}</span>
                            </div>

                            {/* 文章内容 */}
                            <div
                                className="prose prose-invert prose-slate max-w-none"
                                style={{
                                    '--tw-prose-body': '#94a3b8',
                                    '--tw-prose-headings': '#f1f5f9',
                                    '--tw-prose-links': '#818cf8',
                                    '--tw-prose-bold': '#e2e8f0',
                                    '--tw-prose-quotes': '#94a3b8',
                                    '--tw-prose-quote-borders': '#4f46e5',
                                } as React.CSSProperties}
                            >
                                {article.content ? (
                                    <div dangerouslySetInnerHTML={{ __html: article.content }} />
                                ) : (
                                    <p className="text-slate-500 italic">暂无内容</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* 底部提示 */}
                <div className="px-6 py-3 border-t border-[#2d2d44] bg-[#1a1a2e]/50">
                    <p className="text-xs text-slate-500 text-center">
                        💡 预览效果仅供参考，实际发布效果以各平台最终展示为准
                    </p>
                </div>
            </div>
        </div>
    );
}
