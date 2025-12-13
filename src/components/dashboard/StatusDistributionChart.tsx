'use client';

import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusData {
    status: string;
    count: number;
}

interface StatusDistributionChartProps {
    data: StatusData[];
    className?: string;
}

const statusLabels: Record<string, string> = {
    draft: '草稿',
    pending_review: '待审核',
    approved: '已审核',
    published: '已发布',
    failed: '发布失败',
};

const statusColors: Record<string, { color: string; gradient: string }> = {
    draft: {
        color: '#64748b',
        gradient: 'from-slate-400 to-slate-600'
    },
    pending_review: {
        color: '#f59e0b',
        gradient: 'from-amber-400 to-amber-600'
    },
    approved: {
        color: '#10b981',
        gradient: 'from-emerald-400 to-emerald-600'
    },
    published: {
        color: '#6366f1',
        gradient: 'from-indigo-400 to-indigo-600'
    },
    failed: {
        color: '#ef4444',
        gradient: 'from-red-400 to-red-600'
    },
};

export function StatusDistributionChart({ data, className }: StatusDistributionChartProps) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    // 处理数据
    const chartData = useMemo(() => {
        return data.map(item => ({
            ...item,
            name: statusLabels[item.status] || item.status,
            color: statusColors[item.status]?.color || '#64748b',
        }));
    }, [data]);

    // 计算总数
    const total = useMemo(() => {
        return data.reduce((sum, item) => sum + item.count, 0);
    }, [data]);

    if (data.length === 0 || total === 0) {
        return (
            <div className={cn('glass-card rounded-2xl p-6', className)}>
                <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-400" />
                    文章状态分布
                </h3>
                <div className="h-64 flex items-center justify-center text-slate-500">
                    暂无文章数据
                </div>
            </div>
        );
    }

    return (
        <div className={cn('glass-card rounded-2xl p-6', className)}>
            <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                文章状态分布
            </h3>

            <div className="flex items-center h-64">
                {/* 饼图 */}
                <div className="flex-1 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <defs>
                                {Object.entries(statusColors).map(([status, { color }]) => (
                                    <linearGradient key={status} id={`gradient-${status}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={color} stopOpacity={1} />
                                        <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={85}
                                paddingAngle={3}
                                dataKey="count"
                                onMouseEnter={(_, index) => setActiveIndex(index)}
                                onMouseLeave={() => setActiveIndex(null)}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={`url(#gradient-${entry.status})`}
                                        stroke={activeIndex === index ? entry.color : 'none'}
                                        strokeWidth={activeIndex === index ? 3 : 0}
                                        style={{
                                            filter: activeIndex === index ? 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.5))' : 'none',
                                            cursor: 'pointer',
                                            transform: activeIndex === index ? 'scale(1.05)' : 'scale(1)',
                                            transformOrigin: 'center',
                                            transition: 'transform 0.2s ease-out',
                                        }}
                                    />
                                ))}
                            </Pie>
                            {/* 中心总数（无激活时显示） */}
                            {activeIndex === null && (
                                <>
                                    <text x="50%" y="45%" textAnchor="middle" fill="#f8fafc" fontSize={28} fontWeight="bold">
                                        {total}
                                    </text>
                                    <text x="50%" y="58%" textAnchor="middle" fill="#64748b" fontSize={12}>
                                        篇文章
                                    </text>
                                </>
                            )}
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* 图例 */}
                <div className="w-36 space-y-3">
                    {chartData.map((item, index) => {
                        const percentage = ((item.count / total) * 100).toFixed(0);
                        const isActive = activeIndex === index;

                        return (
                            <div
                                key={item.status}
                                className={cn(
                                    'flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-200',
                                    isActive && 'bg-white/5'
                                )}
                                onMouseEnter={() => setActiveIndex(index)}
                                onMouseLeave={() => setActiveIndex(null)}
                            >
                                {/* 色块 */}
                                <div
                                    className={cn(
                                        'w-3 h-3 rounded-full transition-transform duration-200',
                                        isActive && 'scale-125'
                                    )}
                                    style={{ backgroundColor: item.color }}
                                />

                                {/* 标签和数值 */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className={cn(
                                            'text-sm truncate transition-colors',
                                            isActive ? 'text-slate-100' : 'text-slate-400'
                                        )}>
                                            {item.name}
                                        </span>
                                        <span className={cn(
                                            'text-sm font-medium transition-colors',
                                            isActive ? 'text-slate-100' : 'text-slate-300'
                                        )}>
                                            {item.count}
                                        </span>
                                    </div>
                                    {/* 进度条 */}
                                    <div className="h-1 bg-slate-700/50 rounded-full mt-1 overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-300"
                                            style={{
                                                width: `${percentage}%`,
                                                backgroundColor: item.color,
                                                boxShadow: isActive ? `0 0 8px ${item.color}80` : 'none'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
