'use client';

import { useState, useCallback } from 'react';
import Header from '@/components/layout/Header';
import LoginPrompt from '@/components/ui/LoginPrompt';
import { useLoginGuard } from '@/hooks/useLoginGuard';
import { fetchApiSuccessOrThrow } from '@/lib/api-fetch';
import type { ViralArticleItem } from '@/types/api';
import {
    Search,
    Loader2,
    Flame,
    TrendingUp,
    ThumbsUp,
    Users,
    Clock,
    ExternalLink,
    Crown,
    Filter,
    Sparkles,
    Zap,
    ChevronUp,
    Lightbulb,
    BookOpen,
    Target,
    Copy,
} from 'lucide-react';
import { toast } from 'sonner';

// Category options from the API
const CATEGORIES = [
    { value: '0', label: '全部分类' },
    { value: '1', label: '资讯' },
    { value: '2', label: '科技' },
    { value: '3', label: '财经' },
    { value: '4', label: '教育' },
    { value: '5', label: '健康' },
    { value: '6', label: '职场' },
    { value: '7', label: '生活' },
    { value: '8', label: '国际' },
];

function getDateStr(daysAgo: number): string {
    const d = new Date(Date.now() - daysAgo * 86400000);
    return d.toISOString().split('T')[0];
}

/**
 * Return a color class based on hot value intensity
 */
function getHotColor(hot: number): string {
    if (hot >= 20) return 'text-red-600 bg-red-50 border-red-200';
    if (hot >= 10) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (hot >= 5) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-[#666] bg-[#F7F6F0] border-[rgba(0,0,0,0.06)]';
}

/**
 * Safely convert AI response values to renderable strings.
 * AI may return nested objects like { opening: "...", middle: "...", closing: "..." }
 * instead of flat strings. This prevents "Objects are not valid as React child" errors.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRenderable(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.map(toRenderable).join('\n');
    if (typeof value === 'object') {
        return Object.entries(value)
            .map(([k, v]) => `${k}：${toRenderable(v)}`)
            .join('\n');
    }
    return String(value);
}

export default function ViralPage() {
    const { ensureLogin, isAuthenticated, status } = useLoginGuard('请先登录后再使用爆文发现');

    // Search Filters
    const [keyword, setKeyword] = useState('');
    const [category, setCategory] = useState('0');
    const [dateRange, setDateRange] = useState<'3d' | '7d' | '30d'>('3d');
    const [showFilters, setShowFilters] = useState(false);

    // State
    const [loading, setLoading] = useState(false);
    const [articles, setArticles] = useState<ViralArticleItem[]>([]);
    const [page, setPage] = useState(1);
    const [totalPage, setTotalPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [source, setSource] = useState<'api' | 'mock' | null>(null);

    // AI Analysis state (per-article)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [analysisResults, setAnalysisResults] = useState<Record<string, any>>({});
    const [analyzingUrls, setAnalyzingUrls] = useState<Set<string>>(new Set());
    const [expandedUrls, setExpandedUrls] = useState<Set<string>>(new Set());

    const getDaysFromRange = useCallback(() => {
        switch (dateRange) {
            case '3d': return 3;
            case '7d': return 7;
            case '30d': return 30;
        }
    }, [dateRange]);

    const handleSearch = useCallback(async (targetPage = 1) => {
        if (!ensureLogin()) return;

        setLoading(true);
        try {
            const days = getDaysFromRange();
            const result = await fetchApiSuccessOrThrow<ViralArticleItem[]>(
                '/api/viral-articles',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        keyword,
                        category,
                        pub_type: '0',
                        page: targetPage,
                        start_time: getDateStr(days),
                        end_time: getDateStr(0),
                    }),
                },
                '获取爆文数据失败'
            );

            setArticles(result.data);
            setPage(targetPage);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const meta = result as any;
            setTotalPage(meta.totalPage || 1);
            setTotal(meta.total || result.data.length);
            setSource(meta.source || 'api');
        } catch (err) {
            console.error('Viral articles fetch failed:', err);
            toast.error('获取爆文数据失败', {
                description: err instanceof Error ? err.message : '请检查网络或 API 配置',
            });
        } finally {
            setLoading(false);
        }
    }, [ensureLogin, keyword, category, getDaysFromRange]);

    // AI Analysis handler for a single article
    const handleAnalyze = useCallback(async (article: ViralArticleItem) => {
        if (!ensureLogin()) return;
        const key = article.url || article.title;

        // If already analyzed, just toggle expand
        if (analysisResults[key]) {
            setExpandedUrls(prev => {
                const next = new Set(prev);
                if (next.has(key)) next.delete(key);
                else next.add(key);
                return next;
            });
            return;
        }

        // Start analyzing
        setAnalyzingUrls(prev => new Set(prev).add(key));
        setExpandedUrls(prev => new Set(prev).add(key));

        try {
            const result = await fetchApiSuccessOrThrow(
                '/api/viral-articles/analyze',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: article.url,
                        title: article.title,
                        readNum: article.read_num,
                        avgReads: article.avg,
                        fans: article.fans,
                        hot: article.hot,
                    }),
                },
                'AI 分析失败'
            );

            setAnalysisResults(prev => ({ ...prev, [key]: result.data }));
            toast.success('拆解完成', { description: '已生成 AI 深度分析报告' });
        } catch (err) {
            console.error('Analysis failed:', err);
            toast.error('AI 拆解失败', {
                description: err instanceof Error ? err.message : '请检查 AI 配置',
            });
        } finally {
            setAnalyzingUrls(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
        }
    }, [ensureLogin, analysisResults]);

    if (status !== 'loading' && !isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#FDFCF6]">
                <Header title="爆文发现" />
                <div className="p-6"><LoginPrompt description="登录后即可使用爆文发现功能" /></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDFCF6]">
            <Header title="爆文发现" />

            <div className="p-6 max-w-7xl mx-auto">
                {/* Search & Filter Area */}
                <div className="bg-white rounded-2xl p-6 border border-[rgba(0,0,0,0.06)] mb-6">
                    <div className="flex flex-col gap-4">
                        {/* Top Row: Search + Button */}
                        <div className="flex gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#999]" />
                                <input
                                    type="text"
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !loading && handleSearch()}
                                    placeholder="输入关键词筛选（可选，留空搜全部）..."
                                    className="w-full pl-12 pr-4 py-3 bg-[#FDFCF6] border border-[rgba(0,0,0,0.06)] rounded-xl text-[#1A1A1A] focus:ring-2 focus:ring-[rgba(0,0,0,0.1)] focus:border-transparent outline-none transition-all"
                                    disabled={loading}
                                />
                            </div>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`px-4 py-3 border rounded-xl transition-all flex items-center gap-2 ${showFilters ? 'bg-[rgba(0,0,0,0.04)] border-[rgba(0,0,0,0.12)] text-[#333]' : 'border-[rgba(0,0,0,0.06)] text-[#666] hover:text-[#333]'}`}
                            >
                                <Filter className="w-5 h-5" />
                                筛选
                            </button>
                            <button
                                onClick={() => handleSearch()}
                                disabled={loading}
                                className="px-8 py-3 bg-[#333] hover:bg-[#444] hover:scale-[1.03] active:scale-[0.97] text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Flame className="w-5 h-5" />}
                                {loading ? '搜索中...' : '发现爆文'}
                            </button>
                        </div>

                        {/* Filter Panel (collapsible) */}
                        {showFilters && (
                            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-[rgba(0,0,0,0.06)] animate-in fade-in slide-in-from-top-2 duration-200">
                                {/* Date Range */}
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-[#999]" />
                                    <span className="text-sm text-[#666]">时间范围</span>
                                    <div className="flex rounded-lg border border-[rgba(0,0,0,0.06)] overflow-hidden">
                                        {([['3d', '3天'], ['7d', '7天'], ['30d', '30天']] as const).map(([val, label]) => (
                                            <button
                                                key={val}
                                                onClick={() => setDateRange(val)}
                                                className={`px-3 py-1.5 text-sm transition-all ${dateRange === val
                                                    ? 'bg-[#333] text-white'
                                                    : 'bg-white text-[#666] hover:text-[#333] hover:bg-[rgba(0,0,0,0.02)]'
                                                    }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Category */}
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-[#999]" />
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="text-sm px-3 py-1.5 border border-[rgba(0,0,0,0.06)] rounded-lg bg-white text-[#666] focus:outline-none focus:ring-1 focus:ring-[rgba(0,0,0,0.1)]"
                                    >
                                        {CATEGORIES.map(c => (
                                            <option key={c.value} value={c.value}>{c.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Results Area */}
                {loading && (
                    <div className="bg-white/50 border border-[rgba(0,0,0,0.08)] rounded-2xl p-8 text-center animate-pulse mb-8">
                        <Loader2 className="w-10 h-10 text-[#333] mx-auto mb-4 animate-spin" />
                        <h3 className="text-xl font-semibold text-[#1A1A1A] mb-2">正在搜索全网爆文...</h3>
                        <p className="text-[#666]">正在从数据库中搜索异常高阅读量的文章</p>
                    </div>
                )}

                {/* Stats Bar */}
                {!loading && articles.length > 0 && (
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-[#666]">
                                共发现 <span className="font-semibold text-[#333]">{total}</span> 篇爆文
                            </span>
                            {source === 'mock' && (
                                <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">
                                    演示数据
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-[#999]">
                            第 {page}/{totalPage} 页
                        </div>
                    </div>
                )}

                {/* Article Cards */}
                {!loading && articles.length > 0 && (
                    <div className="space-y-4 mb-6">
                        {articles.map((article, idx) => (
                            <div
                                key={`${article.wxid}_${idx}`}
                                className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] hover:border-[rgba(0,0,0,0.12)] hover:shadow-sm transition-all p-5 group"
                            >
                                <div className="flex items-start gap-4">
                                    {/* Rank & Hot Badge */}
                                    <div className="flex flex-col items-center gap-2 flex-shrink-0">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${idx < 3
                                            ? 'bg-gradient-to-br from-amber-500/30 to-orange-500/20 text-amber-600 border border-amber-500/30'
                                            : 'bg-[#F7F6F0] text-[#999] border border-[rgba(0,0,0,0.06)]'
                                            }`}>
                                            {idx + 1}
                                        </div>
                                        <div className={`px-2 py-1 rounded-md border text-xs font-bold ${getHotColor(article.hot)}`}>
                                            🔥 {article.hot}x
                                        </div>
                                    </div>

                                    {/* Main Content */}
                                    <div className="flex-1 min-w-0">
                                        {/* Title */}
                                        <h3 className="text-base font-semibold text-[#1A1A1A] mb-2 line-clamp-2 group-hover:text-[#333] transition-colors">
                                            {article.title}
                                        </h3>

                                        {/* Metrics Row */}
                                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                                            {/* Author */}
                                            <span className="flex items-center gap-1.5 text-[#666]">
                                                <Users className="w-3.5 h-3.5" />
                                                {article.mp_nickname}
                                            </span>

                                            {/* Reads */}
                                            <span className="flex items-center gap-1.5">
                                                <TrendingUp className="w-3.5 h-3.5 text-[#333]" />
                                                <span className="font-semibold text-[#333]">{article.read_num.toLocaleString()}</span>
                                                <span className="text-[#999] text-xs">阅读</span>
                                            </span>

                                            {/* Avg Reads */}
                                            <span className="flex items-center gap-1.5 text-[#999] text-xs">
                                                <span>日常 {article.avg.toLocaleString()}</span>
                                            </span>

                                            {/* Likes */}
                                            <span className="flex items-center gap-1.5">
                                                <ThumbsUp className="w-3.5 h-3.5 text-[#333]" />
                                                <span className="text-[#333]">{article.zan_num.toLocaleString()}</span>
                                            </span>

                                            {/* Fans */}
                                            <span className="flex items-center gap-1.5 text-[#999] text-xs">
                                                <Crown className="w-3 h-3" />
                                                {article.fans >= 10000
                                                    ? `${(article.fans / 10000).toFixed(1)}万粉`
                                                    : `${article.fans.toLocaleString()}粉`
                                                }
                                            </span>

                                            {/* Time */}
                                            <span className="flex items-center gap-1.5 text-[#999] text-xs">
                                                <Clock className="w-3 h-3" />
                                                {article.pub_time.split(' ')[0]}
                                            </span>
                                        </div>

                                        {/* Tags Row */}
                                        <div className="flex flex-wrap items-center gap-2 mt-3">
                                            {article.position === 1 && (
                                                <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">头条</span>
                                            )}
                                            {article.is_original === '原创' && (
                                                <span className="text-xs px-2 py-0.5 rounded bg-green-50 text-green-600 border border-green-200">原创</span>
                                            )}
                                            <span className="text-xs px-2 py-0.5 rounded bg-[#F7F6F0] text-[#666] border border-[rgba(0,0,0,0.06)]">
                                                {article.category}
                                            </span>
                                            <span className="text-xs px-2 py-0.5 rounded bg-[#F7F6F0] text-[#666] border border-[rgba(0,0,0,0.06)]">
                                                {article.publish_type}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                        {/* AI Analyze Button */}
                                        <button
                                            onClick={() => handleAnalyze(article)}
                                            disabled={analyzingUrls.has(article.url || article.title)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${analysisResults[article.url || article.title]
                                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'
                                                : 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 shadow-sm hover:shadow'
                                                } disabled:opacity-60 disabled:cursor-wait`}
                                        >
                                            {analyzingUrls.has(article.url || article.title) ? (
                                                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 拆解中...</>
                                            ) : analysisResults[article.url || article.title] ? (
                                                <>{expandedUrls.has(article.url || article.title) ? <ChevronUp className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />} {expandedUrls.has(article.url || article.title) ? '收起' : '查看拆解'}</>
                                            ) : (
                                                <><Zap className="w-3.5 h-3.5" /> AI 拆解</>
                                            )}
                                        </button>

                                        {/* View Original Link */}
                                        {article.url && article.url !== '#' && (
                                            <a
                                                href={article.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-3 py-1.5 rounded-lg text-xs text-[#999] hover:text-[#333] hover:bg-[#F7F6F0] transition-all flex items-center gap-1.5"
                                                title="查看原文"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" /> 原文
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* Collapsible Analysis Panel */}
                                {expandedUrls.has(article.url || article.title) && analysisResults[article.url || article.title] && (() => {
                                    const result = analysisResults[article.url || article.title];
                                    const a = result.analysis || result;
                                    return (
                                        <div className="mt-4 pt-4 border-t border-dashed border-[rgba(0,0,0,0.08)] animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="text-sm font-semibold text-[#333] flex items-center gap-1.5">
                                                    <Zap className="w-4 h-4 text-purple-500" /> AI 拆解报告
                                                </h4>
                                                {result.hasFullText && (
                                                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">
                                                        基于完整正文分析
                                                    </span>
                                                )}
                                            </div>

                                            <div className="space-y-3 text-sm">
                                                {/* Viral Reason */}
                                                {a.viralReason && (
                                                    <div className="p-3 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100">
                                                        <div className="flex items-center gap-1.5 text-orange-600 font-medium mb-1">
                                                            <Flame className="w-3.5 h-3.5" /> 爆款原因
                                                        </div>
                                                        <p className="text-[#555] leading-relaxed">{toRenderable(a.viralReason)}</p>
                                                    </div>
                                                )}

                                                {/* Title Analysis */}
                                                {a.titleAnalysis && (
                                                    <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100">
                                                        <div className="flex items-center gap-1.5 text-blue-600 font-medium mb-1">
                                                            <Target className="w-3.5 h-3.5" /> 标题策略
                                                        </div>
                                                        <p className="text-[#555] leading-relaxed">{toRenderable(a.titleAnalysis)}</p>
                                                    </div>
                                                )}

                                                {/* Structure Breakdown */}
                                                {a.structureBreakdown && (
                                                    <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100">
                                                        <div className="flex items-center gap-1.5 text-purple-600 font-medium mb-1">
                                                            <BookOpen className="w-3.5 h-3.5" /> 内容结构
                                                        </div>
                                                        <p className="text-[#555] leading-relaxed whitespace-pre-line">{toRenderable(a.structureBreakdown)}</p>
                                                    </div>
                                                )}

                                                {/* Writing Techniques */}
                                                {a.writingTechniques?.length > 0 && (
                                                    <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                                                        <div className="flex items-center gap-1.5 text-emerald-600 font-medium mb-1.5">
                                                            <Lightbulb className="w-3.5 h-3.5" /> 写作技巧
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {(Array.isArray(a.writingTechniques) ? a.writingTechniques : []).map((t: unknown, i: number) => (
                                                                <span key={i} className="px-2.5 py-1 rounded-lg bg-white text-[#555] text-xs border border-emerald-200">{toRenderable(t)}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Replicable Formula */}
                                                {a.replicableFormula && (
                                                    <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200">
                                                        <div className="flex items-center gap-1.5 text-amber-700 font-medium mb-1">
                                                            <Copy className="w-3.5 h-3.5" /> 可复制公式
                                                        </div>
                                                        <p className="text-[#555] font-medium">{toRenderable(a.replicableFormula)}</p>
                                                    </div>
                                                )}

                                                {/* Suggested Topics */}
                                                {a.suggestedTopics?.length > 0 && (
                                                    <div className="p-3 rounded-xl bg-[#FDFCF6] border border-[rgba(0,0,0,0.06)]">
                                                        <div className="flex items-center gap-1.5 text-[#333] font-medium mb-1.5">
                                                            <Sparkles className="w-3.5 h-3.5" /> 衍生选题建议
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {(Array.isArray(a.suggestedTopics) ? a.suggestedTopics : []).map((t: unknown, i: number) => (
                                                                <span key={i} className="px-2.5 py-1 rounded-lg bg-white text-[#555] text-xs border border-[rgba(0,0,0,0.08)] hover:border-[rgba(0,0,0,0.15)] transition-colors cursor-default">{toRenderable(t)}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {!loading && totalPage > 1 && (
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <button
                            onClick={() => handleSearch(page - 1)}
                            disabled={page <= 1}
                            className="px-4 py-2 rounded-lg border border-[rgba(0,0,0,0.06)] text-sm text-[#666] hover:text-[#333] hover:border-[rgba(0,0,0,0.12)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            上一页
                        </button>
                        <span className="text-sm text-[#999]">{page} / {totalPage}</span>
                        <button
                            onClick={() => handleSearch(page + 1)}
                            disabled={page >= totalPage}
                            className="px-4 py-2 rounded-lg border border-[rgba(0,0,0,0.06)] text-sm text-[#666] hover:text-[#333] hover:border-[rgba(0,0,0,0.12)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            下一页
                        </button>
                    </div>
                )}

                {/* Empty State */}
                {!loading && articles.length === 0 && (
                    <div className="mt-12 text-center">
                        <div className="inline-flex w-16 h-16 rounded-full bg-white items-center justify-center mb-4 border border-[rgba(0,0,0,0.06)]">
                            <Flame className="w-8 h-8 text-orange-400" />
                        </div>
                        <h3 className="text-lg font-medium text-[#333] mb-2">发现低粉爆文选题</h3>
                        <p className="text-[#999] max-w-md mx-auto mb-6">
                            搜索最近几天内阅读量远超日常平均水平的文章，找到真正在「意外爆发」的选题。
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                            <span className="text-[#999]">热门搜索：</span>
                            {['AI人工智能', '职场成长', '自媒体', '育儿教育', '健康养生'].map(kw => (
                                <button
                                    key={kw}
                                    onClick={() => { setKeyword(kw); }}
                                    className="px-3 py-1.5 rounded-lg bg-white border border-[rgba(0,0,0,0.06)] text-[#666] hover:text-[#333] hover:border-[rgba(0,0,0,0.12)] transition-all"
                                >
                                    {kw}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
