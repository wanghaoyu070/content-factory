'use client';

import { useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart,
    ReferenceLine,
} from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrendDataPoint {
    date: string;
    count: number;
}

interface TrendChartProps {
    data: TrendDataPoint[];
    className?: string;
}

// 自定义 Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.[0]) return null;

    const date = new Date(label);
    const formattedDate = date.toLocaleDateString('zh-CN', {
        month: 'long',
        day: 'numeric',
        weekday: 'short',
    });

    return (
        <div className="bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3 shadow-xl">
            <p className="text-slate-400 text-xs mb-1">{formattedDate}</p>
            <p className="text-slate-100 font-semibold text-lg">
                {payload[0].value} <span className="text-sm text-slate-400 font-normal">次分析</span>
            </p>
        </div>
    );
};

// 自定义数据点
const CustomDot = (props: any) => {
    const { cx, cy, payload, index, dataLength } = props;
    const isLast = index === dataLength - 1;

    return (
        <g>
            {/* 外圈光晕 */}
            <circle
                cx={cx}
                cy={cy}
                r={isLast ? 8 : 5}
                fill="none"
                stroke="url(#dotGradient)"
                strokeWidth={2}
                opacity={0.5}
            />
            {/* 内圈实心 */}
            <circle
                cx={cx}
                cy={cy}
                r={isLast ? 5 : 3}
                fill="url(#dotGradient)"
            />
            {/* 最后一个点的脉冲动画 */}
            {isLast && (
                <circle
                    cx={cx}
                    cy={cy}
                    r={12}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth={2}
                    opacity={0.3}
                    className="animate-ping"
                />
            )}
        </g>
    );
};

export function TrendChart({ data, className }: TrendChartProps) {
    // 计算统计数据
    const stats = useMemo(() => {
        if (data.length === 0) return { total: 0, average: 0, max: 0, min: 0 };

        const counts = data.map(d => d.count);
        return {
            total: counts.reduce((a, b) => a + b, 0),
            average: Math.round(counts.reduce((a, b) => a + b, 0) / counts.length),
            max: Math.max(...counts),
            min: Math.min(...counts),
        };
    }, [data]);

    // 格式化日期
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return `${date.getMonth() + 1}/${date.getDate()}`;
    };

    if (data.length === 0) {
        return (
            <div className={cn('glass-card rounded-2xl p-6', className)}>
                <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-400" />
                    近7天分析趋势
                </h3>
                <div className="h-64 flex items-center justify-center text-slate-500">
                    暂无趋势数据
                </div>
            </div>
        );
    }

    return (
        <div className={cn('glass-card rounded-2xl p-6', className)}>
            {/* 头部 */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-400" />
                    近7天分析趋势
                </h3>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-2xl font-bold text-slate-100">{stats.total}</p>
                        <p className="text-xs text-slate-500">总计分析</p>
                    </div>
                </div>
            </div>

            {/* 统计摘要 */}
            <div className="flex items-center gap-6 mb-4 pb-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-sm text-slate-400">日均</span>
                    <span className="text-sm font-semibold text-slate-200">{stats.average}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-400" />
                    <span className="text-sm text-slate-400">最高</span>
                    <span className="text-sm font-semibold text-slate-200">{stats.max}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-500" />
                    <span className="text-sm text-slate-400">最低</span>
                    <span className="text-sm font-semibold text-slate-200">{stats.min}</span>
                </div>
            </div>

            {/* 图表 */}
            <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                            {/* 渐变填充 */}
                            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                                <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.15} />
                                <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                            </linearGradient>
                            {/* 线条渐变 */}
                            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#6366f1" />
                                <stop offset="50%" stopColor="#8b5cf6" />
                                <stop offset="100%" stopColor="#a855f7" />
                            </linearGradient>
                            {/* 圆点渐变 */}
                            <linearGradient id="dotGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#a855f7" />
                                <stop offset="100%" stopColor="#6366f1" />
                            </linearGradient>
                        </defs>

                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#ffffff08"
                            vertical={false}
                        />
                        <XAxis
                            dataKey="date"
                            tickFormatter={formatDate}
                            stroke="#64748b"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                        />
                        <YAxis
                            stroke="#64748b"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            dx={-5}
                        />
                        <Tooltip content={<CustomTooltip />} />

                        {/* 平均线 */}
                        <ReferenceLine
                            y={stats.average}
                            stroke="#10b981"
                            strokeDasharray="5 5"
                            strokeOpacity={0.5}
                            label={{
                                value: '平均',
                                position: 'right',
                                fill: '#10b981',
                                fontSize: 10,
                            }}
                        />

                        {/* 渐变区域 */}
                        <Area
                            type="monotone"
                            dataKey="count"
                            stroke="url(#lineGradient)"
                            strokeWidth={3}
                            fill="url(#areaGradient)"
                            dot={(props) => <CustomDot {...props} dataLength={data.length} />}
                            activeDot={{
                                r: 6,
                                fill: '#a855f7',
                                stroke: '#ffffff',
                                strokeWidth: 2,
                            }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
