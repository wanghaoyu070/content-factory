'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Search, TrendingUp, TrendingDown, Flame, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopKeyword {
    keyword: string;
    count: number;
    trend?: number; // 相比上周的变化百分比
}

interface TopKeywordsChartProps {
    data: TopKeyword[];
    className?: string;
}

// 排名徽章颜色
const rankColors = {
    1: 'from-yellow-400 to-amber-500 text-yellow-900 shadow-yellow-500/30',
    2: 'from-slate-300 to-slate-400 text-slate-700 shadow-slate-400/30',
    3: 'from-amber-600 to-amber-700 text-amber-100 shadow-amber-600/30',
};

// 进度条渐变色
const getBarGradient = (index: number) => {
    const gradients = [
        'from-indigo-500 via-purple-500 to-pink-500',
        'from-blue-500 via-indigo-500 to-purple-500',
        'from-cyan-500 via-blue-500 to-indigo-500',
        'from-teal-500 via-cyan-500 to-blue-500',
        'from-emerald-500 via-teal-500 to-cyan-500',
    ];
    return gradients[index % gradients.length];
};

export function TopKeywordsChart({ data, className }: TopKeywordsChartProps) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const maxCount = Math.max(...data.map(d => d.count), 1);

    if (data.length === 0) {
        return (
            <div className={cn('glass-card rounded-2xl p-6', className)}>
                <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-400" />
                    热门关键词 TOP10
                </h3>
                <div className="h-64 flex items-center justify-center text-slate-500">
                    暂无关键词数据
                </div>
            </div>
        );
    }

    return (
        <div className={cn('glass-card rounded-2xl p-6', className)}>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-400" />
                    热门关键词 TOP10
                </h3>
                <span className="text-xs text-slate-500">点击可快速搜索</span>
            </div>

            <div className="space-y-3">
                {data.slice(0, 10).map((item, index) => {
                    const percentage = (item.count / maxCount) * 100;
                    const isTop3 = index < 3;
                    const isHovered = hoveredIndex === index;

                    return (
                        <Link
                            key={item.keyword}
                            href={`/analysis?keyword=${encodeURIComponent(item.keyword)}&auto=true`}
                            className={cn(
                                'group flex items-center gap-3 p-2 -mx-2 rounded-xl transition-all duration-200',
                                isHovered && 'bg-white/5'
                            )}
                            onMouseEnter={() => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            {/* 排名 */}
                            <div
                                className={cn(
                                    'w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 transition-transform',
                                    isTop3
                                        ? `bg-gradient-to-br ${rankColors[index + 1 as 1 | 2 | 3]} shadow-lg`
                                        : 'bg-slate-700/50 text-slate-400',
                                    isHovered && 'scale-110'
                                )}
                            >
                                {index + 1}
                            </div>

                            {/* 关键词和进度条 */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className={cn(
                                        'text-sm font-medium truncate transition-colors',
                                        isHovered ? 'text-indigo-400' : 'text-slate-200'
                                    )}>
                                        {item.keyword}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {/* 趋势 */}
                                        {item.trend !== undefined && item.trend !== 0 && (
                                            <span className={cn(
                                                'text-xs flex items-center gap-0.5',
                                                item.trend > 0 ? 'text-emerald-400' : 'text-red-400'
                                            )}>
                                                {item.trend > 0 ? (
                                                    <TrendingUp className="w-3 h-3" />
                                                ) : (
                                                    <TrendingDown className="w-3 h-3" />
                                                )}
                                                {Math.abs(item.trend)}%
                                            </span>
                                        )}
                                        {/* 数量 */}
                                        <span className="text-sm font-semibold text-slate-300 tabular-nums">
                                            {item.count}
                                        </span>
                                    </div>
                                </div>

                                {/* 进度条 */}
                                <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                                    <div
                                        className={cn(
                                            'h-full rounded-full bg-gradient-to-r transition-all duration-500',
                                            getBarGradient(index),
                                            isHovered && 'shadow-lg'
                                        )}
                                        style={{
                                            width: `${percentage}%`,
                                            boxShadow: isHovered ? '0 0 20px rgba(99, 102, 241, 0.4)' : undefined
                                        }}
                                    />
                                </div>
                            </div>

                            {/* 搜索图标 */}
                            <Search
                                className={cn(
                                    'w-4 h-4 flex-shrink-0 transition-all duration-200',
                                    isHovered ? 'text-indigo-400 opacity-100 translate-x-0' : 'text-slate-600 opacity-0 -translate-x-2'
                                )}
                            />
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
