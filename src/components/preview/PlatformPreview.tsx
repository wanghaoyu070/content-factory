'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

type Platform = 'wechat' | 'xiaohongshu';

interface PlatformPreviewProps {
    title: string;
    content: string;
    coverImage?: string;
    author?: string;
}

export default function PlatformPreview({
    title,
    content,
    coverImage,
    author = '内容工厂',
}: PlatformPreviewProps) {
    const [platform, setPlatform] = useState<Platform>('wechat');

    // 清理 HTML 标签，获取纯文本，用于预览
    const getPlainText = (html: string) => {
        return html.replace(/<[^>]+>/g, '').trim();
    };

    // 截取摘要
    const getSummary = (html: string, maxLength: number) => {
        const text = getPlainText(html);
        return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
    };

    return (
        <div className="bg-[#16162a] rounded-2xl border border-[#2d2d44] overflow-hidden">
            {/* 平台切换 */}
            <div className="p-4 border-b border-[#2d2d44] flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-400">平台预览</h3>
                <div className="flex items-center gap-1 bg-[#1a1a2e] rounded-lg p-1">
                    <button
                        onClick={() => setPlatform('wechat')}
                        className={cn(
                            'px-3 py-1.5 text-xs rounded-md transition-all',
                            platform === 'wechat'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'text-slate-400 hover:text-slate-200'
                        )}
                    >
                        微信公众号
                    </button>
                    <button
                        onClick={() => setPlatform('xiaohongshu')}
                        className={cn(
                            'px-3 py-1.5 text-xs rounded-md transition-all',
                            platform === 'xiaohongshu'
                                ? 'bg-red-500/20 text-red-400'
                                : 'text-slate-400 hover:text-slate-200'
                        )}
                    >
                        小红书
                    </button>
                </div>
            </div>

            {/* 预览内容 */}
            <div className="p-4">
                {platform === 'wechat' ? (
                    <WechatPreview
                        title={title}
                        summary={getSummary(content, 100)}
                        coverImage={coverImage}
                        author={author}
                    />
                ) : (
                    <XiaohongshuPreview
                        title={title}
                        summary={getSummary(content, 60)}
                        coverImage={coverImage}
                        author={author}
                    />
                )}
            </div>

            {/* 提示信息 */}
            <div className="px-4 pb-4">
                <div className="text-xs text-slate-500 text-center">
                    {platform === 'wechat'
                        ? '💡 预览效果仅供参考，实际效果以微信文章页为准'
                        : '💡 预览效果仅供参考，建议使用真机预览'}
                </div>
            </div>
        </div>
    );
}

// 微信公众号预览
function WechatPreview({
    title,
    summary,
    coverImage,
    author,
}: {
    title: string;
    summary: string;
    coverImage?: string;
    author: string;
}) {
    return (
        <div className="max-w-[340px] mx-auto">
            {/* 微信卡片样式 */}
            <div className="bg-white rounded-lg overflow-hidden shadow-lg">
                {/* 封面图 */}
                {coverImage ? (
                    <div className="aspect-[2.35/1] overflow-hidden">
                        <img
                            src={coverImage}
                            alt="封面"
                            className="w-full h-full object-cover"
                        />
                    </div>
                ) : (
                    <div className="aspect-[2.35/1] bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                        <span className="text-white text-2xl">📝</span>
                    </div>
                )}

                {/* 文章信息 */}
                <div className="p-3">
                    <h4 className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
                        {title || '文章标题'}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                        {summary || '文章摘要...'}
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-400">{author}</span>
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-emerald-500">阅读原文</span>
                            <span className="text-emerald-500">›</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 订阅号消息展示 */}
            <div className="mt-4 p-3 bg-[#f5f5f5] rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs">
                        CF
                    </div>
                    <div>
                        <div className="text-xs font-medium text-gray-700">{author}</div>
                        <div className="text-xs text-gray-400">刚刚</div>
                    </div>
                </div>
                <div className="flex gap-2">
                    {coverImage && (
                        <div className="w-16 h-16 rounded overflow-hidden flex-shrink-0">
                            <img
                                src={coverImage}
                                alt="封面"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <h5 className="text-xs font-medium text-gray-800 line-clamp-2">
                            {title || '文章标题'}
                        </h5>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                            {summary}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// 小红书预览
function XiaohongshuPreview({
    title,
    summary,
    coverImage,
    author,
}: {
    title: string;
    summary: string;
    coverImage?: string;
    author: string;
}) {
    return (
        <div className="max-w-[260px] mx-auto">
            {/* 小红书卡片样式 */}
            <div className="bg-white rounded-xl overflow-hidden shadow-lg">
                {/* 封面图 - 3:4 比例 */}
                {coverImage ? (
                    <div className="aspect-[3/4] overflow-hidden">
                        <img
                            src={coverImage}
                            alt="封面"
                            className="w-full h-full object-cover"
                        />
                    </div>
                ) : (
                    <div className="aspect-[3/4] bg-gradient-to-br from-red-400 to-pink-500 flex items-center justify-center">
                        <span className="text-white text-4xl">📝</span>
                    </div>
                )}

                {/* 文章信息 */}
                <div className="p-3">
                    <h4 className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
                        {title || '笔记标题'}
                    </h4>

                    <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-red-400 to-pink-500 flex items-center justify-center text-white text-[8px]">
                                CF
                            </div>
                            <span className="text-xs text-gray-500">{author}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                            <div className="flex items-center gap-0.5">
                                <span className="text-xs">❤️</span>
                                <span className="text-xs">1.2k</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 小红书话题标签 */}
            <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded-full">
                    #干货分享
                </span>
                <span className="px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded-full">
                    #自律打卡
                </span>
                <span className="px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded-full">
                    #学习笔记
                </span>
            </div>

            {/* 小红书文案预览 */}
            <div className="mt-3 p-3 bg-[#fff5f5] rounded-lg">
                <p className="text-xs text-gray-700 leading-relaxed">
                    {summary || '笔记内容预览...'}
                </p>
                <div className="mt-2 text-xs text-red-400">
                    点击阅读全文 →
                </div>
            </div>
        </div>
    );
}
