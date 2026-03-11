'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, Smartphone, Monitor } from 'lucide-react';
import { cn, safeJsonArray } from '@/lib/utils';
import { sanitizeHtml } from '@/lib/sanitize';
import PlatformPreview from '@/components/preview/PlatformPreview';

interface Article {
    id: number | string;
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

    // 处理封面图
    let coverImage = article.coverImage;
    if (!coverImage && article.images && article.images.length > 0) {
        try {
            const images = safeJsonArray<string>(article.images);
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
            <div className="relative bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl animate-slide-up">
                {/* 头部 */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(0,0,0,0.06)]">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-semibold text-[#1A1A1A]">预览文章</h2>
                        <div className="flex items-center gap-1 bg-[#F7F6F0] rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('mobile')}
                                className={cn(
                                    'px-3 py-1.5 text-xs rounded-md transition-all flex items-center gap-1',
                                    viewMode === 'mobile'
                                        ? 'bg-[rgba(0,0,0,0.06)] text-[#333]'
                                        : 'text-[#666] hover:text-[#1A1A1A]'
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
                                        ? 'bg-[rgba(0,0,0,0.06)] text-[#333]'
                                        : 'text-[#666] hover:text-[#1A1A1A]'
                                )}
                            >
                                <Monitor className="w-4 h-4" />
                                网页视图
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-[#666] hover:text-[#1A1A1A] hover:bg-[#F7F6F0] rounded-lg transition-colors"
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
                                <div className="mb-6 rounded-xl overflow-hidden h-64 relative">
                                    <Image
                                        src={coverImage}
                                        alt="封面"
                                        fill
                                        sizes="(max-width: 768px) 100vw, 768px"
                                        unoptimized
                                        className="w-full h-64 object-cover"
                                    />
                                </div>
                            )}

                            {/* 标题 */}
                            <h1 className="text-2xl font-bold text-[#1A1A1A] mb-4">
                                {article.title || '无标题'}
                            </h1>

                            {/* 元信息 */}
                            <div className="flex items-center gap-4 text-sm text-[#999] mb-6 pb-4 border-b border-[rgba(0,0,0,0.06)]">
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
                                    <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }} />
                                ) : (
                                    <p className="text-[#999] italic">暂无内容</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* 底部提示 */}
                <div className="px-6 py-3 border-t border-[rgba(0,0,0,0.06)] bg-[#F7F6F0]/50">
                    <p className="text-xs text-[#999] text-center">
                        💡 预览效果仅供参考，实际发布效果以各平台最终展示为准
                    </p>
                </div>
            </div>
        </div>
    );
}
