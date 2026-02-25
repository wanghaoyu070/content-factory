'use client';

import { useState, useEffect } from 'react';
import { Smartphone, ChevronDown } from 'lucide-react';
import { WECHAT_THEMES, type Theme } from '@/lib/theme';
import { htmlToThemedHtml } from '@/lib/wechatMarkdown';

interface WechatStylePreviewProps {
    content: string;
    title?: string;
    className?: string;
}

export default function WechatStylePreview({
    content,
    title,
    className = ''
}: WechatStylePreviewProps) {
    const [themeName, setThemeName] = useState<string>('极客黑');
    const [renderedHtml, setRenderedHtml] = useState<string>('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // 当内容或主题变化时，重新渲染
    useEffect(() => {
        const theme = WECHAT_THEMES[themeName];
        if (theme && content) {
            const html = htmlToThemedHtml(content, theme);
            setRenderedHtml(html);
        } else {
            setRenderedHtml('');
        }
    }, [content, themeName]);

    const themeNames = Object.keys(WECHAT_THEMES);

    return (
        <div className={`bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] overflow-hidden ${className}`}>
            {/* 头部 - 主题选择 */}
            <div className="p-4 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#666]">
                    <Smartphone className="w-4 h-4" />
                    <span className="text-sm font-medium">微信预览</span>
                </div>

                {/* 主题选择器 */}
                <div className="relative">
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#F7F6F0] rounded-lg text-sm text-[#333] hover:text-[#1A1A1A] transition-colors"
                    >
                        <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: WECHAT_THEMES[themeName]?.mainColor || '#fa8c16' }}
                        />
                        {themeName}
                        <ChevronDown className="w-4 h-4" />
                    </button>

                    {isDropdownOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setIsDropdownOpen(false)}
                            />
                            <div className="absolute right-0 mt-2 py-1 bg-[#F7F6F0] rounded-lg border border-[rgba(0,0,0,0.06)] shadow-xl z-20 min-w-[120px]">
                                {themeNames.map((name) => (
                                    <button
                                        key={name}
                                        onClick={() => {
                                            setThemeName(name);
                                            setIsDropdownOpen(false);
                                        }}
                                        className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${themeName === name
                                                ? 'text-[#1A1A1A] bg-[rgba(0,0,0,0.06)]'
                                                : 'text-[#666] hover:text-[#1A1A1A] hover:bg-white/5'
                                            }`}
                                    >
                                        <span
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: WECHAT_THEMES[name]?.mainColor }}
                                        />
                                        {name}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* 手机壳预览区域 */}
            <div className="p-6 flex justify-center bg-[#0d0d1a]">
                <div
                    className="w-[375px] bg-white rounded-[2rem] shadow-2xl overflow-hidden relative"
                    style={{ minHeight: '667px' }}
                >
                    {/* 手机顶部刘海 */}
                    <div className="h-8 bg-black flex items-center justify-center">
                        <div className="w-24 h-5 bg-black rounded-b-xl" />
                    </div>

                    {/* 微信文章头部 */}
                    <div className="px-4 py-3 border-b border-gray-100">
                        <h1 className="text-lg font-bold text-gray-900 leading-tight">
                            {title || '文章预览'}
                        </h1>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <span>内容工厂</span>
                            <span>·</span>
                            <span>{new Date().toLocaleDateString('zh-CN')}</span>
                        </div>
                    </div>

                    {/* 文章内容 */}
                    <div
                        className="overflow-y-auto"
                        style={{ maxHeight: 'calc(667px - 120px)' }}
                    >
                        {renderedHtml ? (
                            <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
                        ) : (
                            <div className="p-4 text-gray-400 text-center text-sm">
                                暂无内容
                            </div>
                        )}
                    </div>

                    {/* 手机底部 */}
                    <div className="absolute bottom-0 left-0 right-0 h-6 bg-white flex justify-center items-center">
                        <div className="w-32 h-1 bg-gray-300 rounded-full" />
                    </div>
                </div>
            </div>

            {/* 提示信息 */}
            <div className="px-4 py-3 border-t border-[rgba(0,0,0,0.06)] bg-[#F7F6F0]/50">
                <p className="text-xs text-[#999] text-center">
                    💡 预览效果与发布到微信后的实际效果一致
                </p>
            </div>
        </div>
    );
}
