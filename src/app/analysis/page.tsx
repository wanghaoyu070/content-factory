'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import LoginPrompt from '@/components/ui/LoginPrompt';
import { useLoginGuard } from '@/hooks/useLoginGuard';
import {
  Search,
  Loader2,
  ThumbsUp,
  MessageCircle,
  TrendingUp,
  Sparkles,
  FileText,
  ChevronRight,
  Flame,
  BarChart3,
  CheckCircle2,
  Circle,
  AlertCircle,
  User,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton, StatCardSkeleton, InsightCardSkeleton, ListItemSkeleton } from '@/components/ui/Skeleton';

type SearchMode = 'keyword' | 'account';

// ... (Keep interfaces, or simplify if needed) ...
interface AccountInfo {
  name: string;
  avatar: string;
  ghid: string;
  wxid: string;
  totalArticles: number;
  masssendCount: number;
  publishCount: number;
}

interface Article {
  id?: number | string;
  title: string;
  author?: string;
  likes?: number;
  reads?: number;
  comments?: number;
  url?: string;
  publishTime?: string;
  digest?: string;
  readCount?: number;
  likeCount?: number;
  wowCount?: number;
  coverImage?: string;
  sourceUrl?: string;
}

interface Insight {
  id: number;
  title: string;
  description: string;
  evidence: string;
  suggestedTopics: string[];
  relatedArticles: string[];
}

interface SearchRecord {
  id: number;
  keyword: string;
  article_count: number;
  created_at: string;
}

interface WordCloudItem {
  word: string;
  count: number;
}

// idle -> processing (polling) -> done -> error
type AnalysisStep = 'idle' | 'processing' | 'done' | 'error';

const hotTopics = [
  { keyword: 'AI人工智能', heat: 98 },
  { keyword: '职场成长', heat: 92 },
  { keyword: '副业赚钱', heat: 88 },
  { keyword: '自媒体运营', heat: 85 },
  { keyword: '健康养生', heat: 82 },
  { keyword: '育儿教育', heat: 78 },
  { keyword: '投资理财', heat: 75 },
  { keyword: '情感心理', heat: 72 },
];

function AnalysisPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ensureLogin, isAuthenticated, status } = useLoginGuard('请先登录后再开始分析');

  const [keyword, setKeyword] = useState('');
  const [step, setStep] = useState<AnalysisStep>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Data State
  const [articles, setArticles] = useState<Article[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [wordCloud, setWordCloud] = useState<WordCloudItem[]>([]);
  const [recentSearches, setRecentSearches] = useState<SearchRecord[]>([]);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);

  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [searchId, setSearchId] = useState<number | null>(null);
  const [searchMode, setSearchMode] = useState<SearchMode>('keyword');

  const [initialLoading, setInitialLoading] = useState(true);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Init: Check login & Fetch recent searches
  useEffect(() => {
    if (status === 'loading') return;
    if (!isAuthenticated) {
      setInitialLoading(false);
      return;
    }
    fetchRecentSearches().finally(() => setInitialLoading(false));
  }, [isAuthenticated, status]);

  // 2. Init: Check URL for 'id' to resume task, OR 'keyword' to auto-start
  useEffect(() => {
    if (!isAuthenticated || initialLoading) return;

    const urlId = searchParams.get('id');
    const urlKeyword = searchParams.get('keyword');
    const autoTrigger = searchParams.get('auto');

    if (urlId) {
      // Resume task by ID
      const id = parseInt(urlId);
      if (!isNaN(id)) {
        console.log('Resuming task:', id);
        setSearchId(id);
        setStep('processing'); // Start polling immediately
      }
    } else if (urlKeyword && autoTrigger === 'true') {
      // Auto start new task
      setKeyword(urlKeyword);
      handleSearch(urlKeyword);

      // Clear URL params to avoid re-trigger
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams, isAuthenticated, initialLoading]);

  // 3. Polling Logic: Whenever searchId set & step is processing
  useEffect(() => {
    if (step === 'processing' && searchId) {
      // Start polling
      const poll = async () => {
        try {
          const res = await fetch(`/api/analysis/status?id=${searchId}`);
          const data = await res.json();

          if (!data.success) {
            // Task not found or error
            setStep('error');
            setErrorMessage(data.error || '查询任务状态失败');
            return;
          }

          const record = data.data;

          if (record.status === 'completed') {
            // Task Done!
            setArticles(record.articles || []);
            setInsights(record.insights || []);
            setWordCloud(record.wordCloud || []);
            setStep('done');
            fetchRecentSearches(); // Update sidebar
          } else if (record.status === 'failed') {
            setStep('error');
            setErrorMessage('分析任务执行失败，请重试');
          } else {
            // Still processing, continue waiting...
            // If partial data available (e.g. articles found), show them? 
            if (record.articles && record.articles.length > 0) {
              setArticles(record.articles);
            }
          }
        } catch (e) {
          console.error('Poll error', e);
          // Don't stop polling on network error, just wait next tick
        }
      };

      // Poll immediately then every 2s
      poll();
      pollingRef.current = setInterval(poll, 2000);
    } else {
      // Stop polling
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [step, searchId]);


  const fetchRecentSearches = async () => {
    try {
      const response = await fetch('/api/search?limit=5');
      const result = await response.json();
      if (result.success) {
        setRecentSearches(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch recent searches:', err);
    }
  };

  const handleSearch = async (kwInput?: string) => {
    if (!ensureLogin()) return;
    const kw = kwInput || keyword;
    if (!kw.trim()) return;

    // Reset UI
    setStep('processing');
    setErrorMessage('');
    setArticles([]);
    setInsights([]);
    setWordCloud([]);
    setAccountInfo(null);
    setSearchId(null); // Clear ID first

    try {
      // Call Async Start API
      const response = await fetch('/api/analysis/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: kw,
          searchType: searchMode
        }),
      });
      const result = await response.json();

      if (result.success && result.data?.searchId) {
        // Task Started! Set ID to trigger polling
        setSearchId(result.data.searchId);
        // Optionally update URL so reload works
        router.push(`/analysis?id=${result.data.searchId}`, { scroll: false });
      } else {
        throw new Error(result.error || '启动任务失败');
      }

    } catch (err: any) {
      console.error('Start analysis failed:', err);
      setStep('error');
      setErrorMessage(err.message || '分析请求失败');
    }
  };


  const handleGenerateArticle = async (insight: Insight) => {
    if (!ensureLogin()) return;
    if (!searchId) return;
    setGeneratingId(insight.id);

    try {
      // Reuse existing generation logic
      const response = await fetch('/api/articles/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insightId: insight.id,
          searchId: searchId,
          insight: {
            title: insight.title,
            description: insight.description,
            suggestedTopics: insight.suggestedTopics,
            relatedArticles: insight.relatedArticles,
          },
          keyword: keyword || '此话题',
          style: 'professional',
          fetchImages: true,
        }),
      });

      const result = await response.json();

      if (result.success && result.data?.articleId) {
        router.push(`/articles/${result.data.articleId}`);
      } else {
        toast.error('文章生成失败', { description: result.error });
      }
    } catch (err) {
      console.error('Generate article failed:', err);
      toast.error('网络错误', { description: '无法请求文章生成' });
    } finally {
      setGeneratingId(null);
    }
  };

  // --- Rendering Helpers ---
  // (Keep your existing render logic mostly same, just adapted to 'step' changes)

  const isSearching = step === 'processing';
  const hasResults = step === 'done' && (articles.length > 0 || insights.length > 0);

  // Simplified UI render
  if (initialLoading) {
    return <div className="min-h-screen bg-[#0f0f23] flex items-center justify-center text-slate-500">加载中...</div>;
  }

  if (status !== 'loading' && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f0f23]">
        <Header title="选题分析" />
        <div className="p-6"><LoginPrompt description="登录后即可使用选题分析" /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f23]">
      <Header title="选题分析" />

      <div className="p-6 max-w-7xl mx-auto">
        {/* Search Box Area */}
        <div className="bg-[#16162a] rounded-2xl p-6 border border-[#2d2d44] mb-6 shadow-xl relative z-10">
          {/* Mode Tabs */}
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => setSearchMode('keyword')}
              className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${searchMode === 'keyword'
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              关键词分析
            </button>
            <button
              onClick={() => setSearchMode('account')}
              className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${searchMode === 'account'
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              公众号分析
            </button>
          </div>

          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isSearching && handleSearch()}
                placeholder={searchMode === 'keyword' ? "输入关键词 (如：职场成长)..." : "输入公众号名称..."}
                className="w-full pl-12 pr-4 py-3 bg-[#0f0f23] border border-[#2d2d44] rounded-xl text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                disabled={isSearching}
              />
            </div>
            <button
              onClick={() => handleSearch()}
              disabled={isSearching || !keyword.trim()}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {isSearching ? '分析中...' : '开始分析'}
            </button>
          </div>

          {/* Recent Searches */}
          {recentSearches.length > 0 && !isSearching && !hasResults && (
            <div className="mt-6 pt-4 border-t border-[#2d2d44]">
              <div className="text-xs text-slate-500 mb-2 flex items-center gap-1"><Clock className="w-3 h-3" /> 最近搜索</div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map(rec => (
                  <button
                    key={rec.id}
                    onClick={() => { setKeyword(rec.keyword); handleSearch(rec.keyword); }}
                    className="text-xs px-3 py-1.5 bg-[#0f0f23] border border-[#2d2d44] rounded-lg text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 transition-all"
                  >
                    {rec.keyword}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Status: Processing */}
        {isSearching && (
          <div className="bg-[#16162a]/50 border border-indigo-500/30 rounded-2xl p-8 text-center animate-pulse mb-8">
            <Loader2 className="w-10 h-10 text-indigo-400 mx-auto mb-4 animate-spin" />
            <h3 className="text-xl font-semibold text-slate-100 mb-2">正在深入分析全网数据...</h3>
            <p className="text-slate-400">这可能需要 5-10 秒，您可以去喝杯水，结果会自动显示。</p>

            {articles.length > 0 && (
              <div className="mt-4 inline-block px-4 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm border border-emerald-500/20">
                已发现 {articles.length} 篇相关热门文章，正在生成洞察...
              </div>
            )}
          </div>
        )}

        {/* Status: Error */}
        {step === 'error' && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 mb-8 flex items-center gap-4 text-red-400">
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <div>{errorMessage || '分析过程中发生了未知错误。'}</div>
          </div>
        )}

        {/* Status: Results */}
        {hasResults && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 1. 核心洞察卡片 (Insights) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {insights.map((insight, idx) => (
                <div key={idx} className="bg-[#16162a] border border-[#2d2d44] hover:border-indigo-500/50 transition-all rounded-2xl p-6 group flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm">
                      {idx + 1}
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400">
                      AI 洞察
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-100 mb-3 group-hover:text-indigo-400 transition-colors line-clamp-2">
                    {insight.title}
                  </h3>

                  <p className="text-sm text-slate-400 mb-4 flex-1 line-clamp-3">
                    {insight.description}
                  </p>

                  <div className="border-t border-[#2d2d44] pt-4 mt-auto">
                    <button
                      onClick={() => handleGenerateArticle(insight)}
                      disabled={generatingId === insight.id}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                      {generatingId === insight.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                      {generatingId === insight.id ? '生成中...' : '使用此洞察写文章'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 2. 热门文章列表 (Articles) */}
            <div className="bg-[#16162a] rounded-2xl border border-[#2d2d44] p-6">
              <h2 className="text-xl font-bold text-slate-100 mb-6 flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-400" />
                热门文章参考
              </h2>
              <div className="space-y-4">
                {articles.slice(0, 5).map((article, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-4 rounded-xl bg-[#0f0f23]/50 hover:bg-[#0f0f23] transition-colors border border-transparent hover:border-[#2d2d44]">
                    <div className="text-slate-500 font-mono text-sm mt-1">
                      {(idx + 1).toString().padStart(2, '0')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-medium text-slate-200 mb-1 truncate">
                        {article.title}
                      </h4>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        {(article.readCount || article.reads) && (
                          <span>阅读: {(article.readCount || article.reads)?.toLocaleString()}</span>
                        )}
                        <span>{(article.author || (article as any).wxName) || '未知作者'}</span>
                        <span>{article.publishTime?.split(' ')[0]}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isSearching && !hasResults && step !== 'error' && (
          <div className="mt-12 text-center">
            <div className="inline-flex w-16 h-16 rounded-full bg-[#16162a] items-center justify-center mb-4 border border-[#2d2d44]">
              <Sparkles className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-medium text-slate-300 mb-2">准备好探索了吗？</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              输入关键词，AI 将为您分析全网热门趋势，并生成专业的写作角度。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0f0f23] p-6 text-slate-500">界面加载中...</div>}>
      <AnalysisPageContent />
    </Suspense>
  );
}
