'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Rocket,
    Sparkles,
    Loader2,
    TrendingUp,
    ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickCreateProps {
    className?: string;
    compact?: boolean;
}

// 热门关键词推荐
const hotKeywords = [
    { keyword: 'AI人工智能', icon: '🤖' },
    { keyword: '职场成长', icon: '💼' },
    { keyword: '自媒体运营', icon: '📱' },
    { keyword: '健康养生', icon: '🏃' },
    { keyword: '理财投资', icon: '💰' },
    { keyword: '育儿教育', icon: '👶' },
];

export default function QuickCreate({ className, compact = false }: QuickCreateProps) {
    const router = useRouter();
    const [keyword, setKeyword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleQuickCreate = async (selectedKeyword?: string) => {
        const finalKeyword = selectedKeyword || keyword;
        if (!finalKeyword.trim()) return;

        setLoading(true);

        // 跳转到选题分析页面，并带上关键词参数触发自动搜索
        router.push(`/analysis?keyword=${encodeURIComponent(finalKeyword.trim())}&auto=true`);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && keyword.trim()) {
            handleQuickCreate();
        }
    };

    if (compact) {
        return (
            <div className={cn('bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-4', className)}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <Rocket className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <input
                            type="text"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="输入关键词，一键创作..."
                            className="w-full px-3 py-2 bg-[#1a1a2e] border border-[#2d2d44] rounded-lg text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            disabled={loading}
                        />
                    </div>
                    <button
                        onClick={() => handleQuickCreate()}
                        disabled={loading || !keyword.trim()}
                        className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                创作
                            </>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={cn('glass-card rounded-2xl overflow-hidden card-glow', className)}>
            {/* 头部 */}
            <div className="p-8 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-b border-[#2d2d44]">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 flex items-center justify-center animate-float">
                        <Rocket className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-slate-100">一键创作</h3>
                        <p className="text-slate-400 mt-1">输入关键词，AI 自动完成从分析到发布的创作全流程</p>
                    </div>
                </div>

                {/* 搜索框 */}
                <div className="flex items-center gap-3">
                    <div className="flex-1 relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity" />
                        <input
                            type="text"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="输入关键词，如：AI人工智能、职场成长..."
                            className="relative w-full px-5 py-4 bg-[#1a1a2e]/80 border border-[#2d2d44] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 pr-12 text-lg transition-all"
                            disabled={loading}
                        />
                        {keyword && (
                            <button
                                onClick={() => setKeyword('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 z-10"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => handleQuickCreate()}
                        disabled={loading || !keyword.trim()}
                        className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-indigo-500/20 font-medium text-lg btn-primary"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                启动中...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5" />
                                开始创作
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* 热门关键词 */}
            <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    <span className="text-sm text-slate-400">热门推荐</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {hotKeywords.map((item) => (
                        <button
                            key={item.keyword}
                            onClick={() => handleQuickCreate(item.keyword)}
                            disabled={loading}
                            className="px-3 py-2 bg-[#1a1a2e] border border-[#2d2d44] rounded-lg text-sm text-slate-300 hover:bg-[#1e1e38] hover:border-indigo-500/30 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                            <span>{item.icon}</span>
                            {item.keyword}
                        </button>
                    ))}
                </div>
            </div>

            {/* 流程说明 */}
            <div className="px-6 pb-6">
                <div className="p-4 bg-[#1a1a2e] rounded-xl">
                    <div className="flex items-center gap-6 text-sm text-slate-400">
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs">1</span>
                            搜索分析
                        </div>
                        <ArrowRight className="w-4 h-4" />
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs">2</span>
                            生成洞察
                        </div>
                        <ArrowRight className="w-4 h-4" />
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-xs">3</span>
                            AI创作
                        </div>
                        <ArrowRight className="w-4 h-4" />
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">4</span>
                            发布文章
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
