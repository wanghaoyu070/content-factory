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
  PenTool,
  Clock,
  Hash,
  FileText,
  ChevronRight,
  Flame,
  BarChart3,
  CheckCircle2,
  Circle,
  AlertCircle,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton, StatCardSkeleton, InsightCardSkeleton, ListItemSkeleton } from '@/components/ui/Skeleton';

type SearchMode = 'keyword' | 'account';

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
  id?: number;
  title: string;
  author: string;
  likes: number;
  reads: number;
  comments: number;
  url: string;
  publishTime: string;
  digest?: string;
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

type AnalysisStep = 'idle' | 'fetching' | 'saving' | 'analyzing' | 'done' | 'error';

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

// 主要内容组件（使用 useSearchParams）
function AnalysisPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ensureLogin, isAuthenticated, status } = useLoginGuard('请先登录后再开始分析');
  const [keyword, setKeyword] = useState('');
  const [step, setStep] = useState<AnalysisStep>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [wordCloud, setWordCloud] = useState<WordCloudItem[]>([]);
  const [recentSearches, setRecentSearches] = useState<SearchRecord[]>([]);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [searchId, setSearchId] = useState<number | null>(null);
  const [searchMode, setSearchMode] = useState<SearchMode>('keyword');
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // 防止重复自动搜索的标记
  const autoSearchedRef = useRef(false);

  useEffect(() => {
    let active = true;
    if (!isAuthenticated) {
      setRecentSearches([]);
      setInitialLoading(false);
      return () => {
        active = false;
      };
    }
    (async () => {
      await fetchRecentSearches();
      if (active) {
        setInitialLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  // 处理 URL 参数自动搜索（从一键创作入口跳转）
  useEffect(() => {
    const urlKeyword = searchParams.get('keyword');
    const autoTrigger = searchParams.get('auto');

    if (urlKeyword && autoTrigger === 'true' && isAuthenticated && !autoSearchedRef.current && !initialLoading) {
      autoSearchedRef.current = true;
      setKeyword(urlKeyword);

      // 使用 setTimeout 确保状态已更新
      setTimeout(() => {
        handleSearch(urlKeyword);
      }, 100);

      // 清除 URL 参数，避免刷新页面重复搜索
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams, isAuthenticated, initialLoading]);

  const fetchRecentSearches = async () => {
    if (!isAuthenticated) return;
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

  const handleSearch = async (searchKeyword?: string) => {
    if (!ensureLogin()) return;
    const kw = searchKeyword || keyword;
    if (!kw.trim()) return;

    setStep('fetching');
    setErrorMessage('');
    setArticles([]);
    setInsights([]);
    setWordCloud([]);
    setSearchId(null);
    setAccountInfo(null);

    try {
      // Step 1: 获取公众号文章（根据搜索模式调用不同API）
      let articlesData;
      if (searchMode === 'account') {
        // 公众号模式：调用新接口
        const articlesRes = await fetch('/api/wechat-articles-by-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountName: kw }),
        });
        articlesData = await articlesRes.json();

        // 保存公众号信息
        if (articlesData.success && articlesData.accountInfo) {
          setAccountInfo(articlesData.accountInfo);
        }
      } else {
        // 关键词模式：调用原有接口
        const articlesRes = await fetch('/api/wechat-articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyword: kw }),
        });
        articlesData = await articlesRes.json();
      }

      if (!articlesData.success || !articlesData.data?.length) {
        setStep('error');
        setErrorMessage(articlesData.error || (searchMode === 'account' ? '未找到该公众号的文章' : '未找到相关文章，请尝试其他关键词'));
        return;
      }

      setArticles(articlesData.data);
      setStep('saving');

      // Step 2: 保存搜索记录和文章
      const saveRes = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: kw,
          articles: articlesData.data,
          searchType: searchMode,
          accountInfo: searchMode === 'account' ? articlesData.accountInfo : undefined,
        }),
      });
      const saveData = await saveRes.json();

      if (!saveData.success) {
        setStep('error');
        setErrorMessage('保存数据失败，请重试');
        return;
      }

      setSearchId(saveData.data.searchId);
      setStep('analyzing');

      // Step 3: 生成AI洞察
      const insightsRes = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchId: saveData.data.searchId,
          keyword: kw,
          articles: articlesData.data,
        }),
      });
      const insightsData = await insightsRes.json();

      if (insightsData.success) {
        setInsights(insightsData.data.insights || []);
        setWordCloud(insightsData.data.wordCloud || generateWordCloud(articlesData.data));
      }

      setStep('done');
      fetchRecentSearches();
    } catch (err) {
      console.error('Analysis failed:', err);
      setStep('error');
      setErrorMessage('分析过程出错，请稍后重试');
    }
  };

  const generateWordCloud = (articles: Article[]): WordCloudItem[] => {
    const words: Record<string, number> = {};
    articles.forEach((article) => {
      const text = article.title + ' ' + (article.digest || '');
      const matches = text.match(/[\u4e00-\u9fa5]{2,}/g) || [];
      matches.forEach((word) => {
        if (word.length >= 2 && word.length <= 4) {
          words[word] = (words[word] || 0) + 1;
        }
      });
    });
    return Object.entries(words)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, count]) => ({ word, count }));
  };

  const handleGenerateArticle = async (insight: Insight) => {
    if (!ensureLogin()) return;
    if (!searchId) return;
    setGeneratingId(insight.id);

    try {
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
          keyword: keyword,
          style: 'professional',
          fetchImages: true,
        }),
      });

      const result = await response.json();

      if (result.success && result.data?.articleId) {
        router.push(`/articles/${result.data.articleId}`);
      } else {
        toast.error('文章生成失败', {
          description: result.error || '请稍后重试',
        });
      }
    } catch (err) {
      console.error('Generate article failed:', err);
      toast.error('文章生成失败', {
        description: '请检查 AI 配置是否正确',
        action: {
          label: '去设置',
          onClick: () => {
            window.location.href = '/settings';
          },
        },
      });
    } finally {
      setGeneratingId(null);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f23]">
        <Header title="选题分析" />
        <div className="p-6 space-y-6">
          <div className="bg-[#16162a] rounded-2xl border border-[#2d2d44] p-6 space-y-4">
            <Skeleton className="h-12 w-full" />
            <div className="flex flex-col gap-4 sm:flex-row">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <StatCardSkeleton key={i} />
                ))}
              </div>
              <div className="bg-[#16162a] rounded-2xl border border-[#2d2d44] divide-y divide-[#2d2d44]">
                {Array.from({ length: 4 }).map((_, i) => (
                  <InsightCardSkeleton key={i} />
                ))}
              </div>
            </div>
            <div className="bg-[#16162a] rounded-2xl border border-[#2d2d44] p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              {Array.from({ length: 5 }).map((_, i) => (
                <ListItemSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status !== 'loading' && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f0f23]">
        <Header title="选题分析" />
        <div className="p-6">
          <LoginPrompt description="登录后即可使用选题分析、洞察生成等功能" />
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
  };

  const getTopArticlesByLikes = () => {
    return [...articles].sort((a, b) => b.likes - a.likes).slice(0, 5);
  };

  const getTopArticlesByEngagement = () => {
    return [...articles]
      .map((a) => ({
        ...a,
        engagement: a.reads > 0 ? ((a.likes + a.comments) / a.reads) * 100 : 0,
      }))
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 5);
  };

  const renderProgressStep = (
    currentStep: AnalysisStep,
    targetStep: AnalysisStep,
    label: string,
    icon: React.ReactNode
  ) => {
    const steps: AnalysisStep[] = ['fetching', 'saving', 'analyzing', 'done'];
    const currentIndex = steps.indexOf(currentStep);
    const targetIndex = steps.indexOf(targetStep);

    let status: 'pending' | 'active' | 'done' = 'pending';
    if (currentIndex > targetIndex || currentStep === 'done') {
      status = 'done';
    } else if (currentIndex === targetIndex) {
      status = 'active';
    }

    return (
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${status === 'done'
            ? 'bg-emerald-500/20 text-emerald-400'
            : status === 'active'
              ? 'bg-indigo-500/20 text-indigo-400'
              : 'bg-slate-700/50 text-slate-500'
            }`}
        >
          {status === 'done' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : status === 'active' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Circle className="w-4 h-4" />
          )}
        </div>
        <span
          className={`text-sm ${status === 'done'
            ? 'text-emerald-400'
            : status === 'active'
              ? 'text-indigo-400'
              : 'text-slate-500'
            }`}
        >
          {label}
        </span>
      </div>
    );
  };

  const isSearching = ['fetching', 'saving', 'analyzing'].includes(step);
  const hasResults = step === 'done' && articles.length > 0;

  return (
    <div className="min-h-screen bg-[#0f0f23]">
      <Header title="选题分析" />

      <div className="p-6">
        {/* 搜索区域 */}
        <div className="bg-[#16162a] rounded-2xl p-6 border border-[#2d2d44] mb-6">
          {/* 搜索模式切换 */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => {
                setSearchMode('keyword');
                setKeyword('');
                setAccountInfo(null);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${searchMode === 'keyword'
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50'
                : 'bg-[#1a1a2e] text-slate-400 border border-[#2d2d44] hover:border-indigo-500/30'
                }`}
            >
              <Search className="w-4 h-4" />
              关键词搜索
            </button>
            <button
              onClick={() => {
                setSearchMode('account');
                setKeyword('');
                setAccountInfo(null);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${searchMode === 'account'
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50'
                : 'bg-[#1a1a2e] text-slate-400 border border-[#2d2d44] hover:border-indigo-500/30'
                }`}
            >
              <User className="w-4 h-4" />
              公众号搜索
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isSearching && handleSearch()}
                placeholder={searchMode === 'keyword' ? '输入关键词，分析公众号热门选题...' : '输入公众号名称，分析其最新文章...'}
                className="w-full pl-12 pr-4 py-3 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base"
                disabled={isSearching}
              />
            </div>
            <button
              onClick={() => handleSearch()}
              disabled={isSearching || !keyword.trim()}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-lg shadow-indigo-500/20"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  开始分析
                </>
              )}
            </button>
          </div>

          {/* 最近搜索 */}
          {recentSearches.length > 0 && !hasResults && (
            <div className="mt-4 pt-4 border-t border-[#2d2d44]">
              <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
                <Clock className="w-4 h-4" />
                最近搜索
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((record) => (
                  <button
                    key={record.id}
                    onClick={() => {
                      setKeyword(record.keyword);
                      handleSearch(record.keyword);
                    }}
                    disabled={isSearching}
                    className="px-3 py-1.5 bg-[#1a1a2e] border border-[#2d2d44] rounded-lg text-sm text-slate-300 hover:border-indigo-500/50 hover:text-indigo-400 transition-colors disabled:opacity-50"
                  >
                    {record.keyword}
                    <span className="ml-2 text-slate-500">{record.article_count}篇</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 热门公众号推荐（仅公众号搜索模式下显示） */}
          {searchMode === 'account' && !hasResults && !isSearching && (
            <div className="mt-4 pt-4 border-t border-[#2d2d44]">
              <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                <Sparkles className="w-4 h-4 text-amber-400" />
                热门公众号推荐
              </div>

              {/* 分类推荐 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 商业财经 */}
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    💼 商业财经
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {['刘润', '吴晓波频道', '混沌学园', '36氪', '虎嗅APP'].map((name) => (
                      <button
                        key={name}
                        onClick={() => {
                          setKeyword(name);
                          handleSearch(name);
                        }}
                        disabled={isSearching}
                        className="px-2.5 py-1 bg-[#1a1a2e] border border-[#2d2d44] rounded-lg text-xs text-slate-300 hover:border-amber-500/50 hover:text-amber-400 transition-colors disabled:opacity-50"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 科技数码 */}
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    🔬 科技数码
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {['少数派', '差评', '极客公园', '爱范儿', '品玩'].map((name) => (
                      <button
                        key={name}
                        onClick={() => {
                          setKeyword(name);
                          handleSearch(name);
                        }}
                        disabled={isSearching}
                        className="px-2.5 py-1 bg-[#1a1a2e] border border-[#2d2d44] rounded-lg text-xs text-slate-300 hover:border-cyan-500/50 hover:text-cyan-400 transition-colors disabled:opacity-50"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 职场成长 */}
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    📈 职场成长
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {['LinkedIn', '脉脉', '猎聘', '职场蛙', 'L先生说'].map((name) => (
                      <button
                        key={name}
                        onClick={() => {
                          setKeyword(name);
                          handleSearch(name);
                        }}
                        disabled={isSearching}
                        className="px-2.5 py-1 bg-[#1a1a2e] border border-[#2d2d44] rounded-lg text-xs text-slate-300 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors disabled:opacity-50"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 创意营销 */}
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    🎨 创意营销
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {['广告门', '梅花网', '鸟哥笔记', '增长黑盒', '刀法研究所'].map((name) => (
                      <button
                        key={name}
                        onClick={() => {
                          setKeyword(name);
                          handleSearch(name);
                        }}
                        disabled={isSearching}
                        className="px-2.5 py-1 bg-[#1a1a2e] border border-[#2d2d44] rounded-lg text-xs text-slate-300 hover:border-pink-500/50 hover:text-pink-400 transition-colors disabled:opacity-50"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <p className="mt-4 text-xs text-slate-600">
                💡 点击公众号名称即可快速分析其最新文章
              </p>
            </div>
          )}
        </div>

        {/* 分析进度 */}
        {isSearching && (
          <div className="bg-[#16162a] rounded-2xl p-6 border border-[#2d2d44] mb-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              分析进度
            </h3>
            <div className="flex items-center gap-8">
              {renderProgressStep(step, 'fetching', '获取文章', <FileText className="w-4 h-4" />)}
              <ChevronRight className="w-4 h-4 text-slate-600" />
              {renderProgressStep(step, 'saving', '保存数据', <CheckCircle2 className="w-4 h-4" />)}
              <ChevronRight className="w-4 h-4 text-slate-600" />
              {renderProgressStep(step, 'analyzing', '生成洞察', <Sparkles className="w-4 h-4" />)}
            </div>
            {articles.length > 0 && (
              <div className="mt-4 text-sm text-slate-400">
                已获取 {articles.length} 篇文章
              </div>
            )}
          </div>
        )}

        {/* 错误提示 */}
        {step === 'error' && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* 空状态 - 热门话题推荐 */}
        {step === 'idle' && (
          <div className="bg-[#16162a] rounded-2xl p-6 border border-[#2d2d44]">
            <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-400" />
              热门话题推荐
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              不知道搜什么？试试这些热门话题
            </p>
            <div className="grid grid-cols-4 gap-4">
              {hotTopics.map((topic, index) => (
                <button
                  key={topic.keyword}
                  onClick={() => {
                    setKeyword(topic.keyword);
                    handleSearch(topic.keyword);
                  }}
                  className="p-4 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl hover:border-indigo-500/50 transition-all group text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500">#{index + 1}</span>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-orange-400" />
                      <span className="text-xs text-orange-400">{topic.heat}</span>
                    </div>
                  </div>
                  <div className="font-medium text-slate-200 group-hover:text-indigo-400 transition-colors">
                    {topic.keyword}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 分析结果 */}
        {hasResults && (
          <div className="space-y-6">
            {/* 公众号信息卡片（仅公众号搜索模式显示） */}
            {accountInfo && (
              <div className="bg-[#16162a] rounded-2xl p-6 border border-[#2d2d44]">
                <div className="flex items-center gap-4">
                  {accountInfo.avatar ? (
                    <img
                      src={accountInfo.avatar}
                      alt={accountInfo.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center">
                      <User className="w-8 h-8 text-indigo-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-slate-200">{accountInfo.name}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                      <span>发文总数: {accountInfo.totalArticles}</span>
                      <span>群发: {accountInfo.masssendCount}</span>
                      <span>发布: {accountInfo.publishCount}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-400">本次分析</div>
                    <div className="text-2xl font-bold text-indigo-400">{articles.length} 篇</div>
                  </div>
                </div>
              </div>
            )}

            {/* 统计概览 */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-[#16162a] rounded-2xl p-4 border border-[#2d2d44]">
                <div className="text-sm text-slate-400 mb-1">文章总数</div>
                <div className="text-2xl font-bold text-slate-100">{articles.length}</div>
              </div>
              <div className="bg-[#16162a] rounded-2xl p-4 border border-[#2d2d44]">
                <div className="text-sm text-slate-400 mb-1">总点赞</div>
                <div className="text-2xl font-bold text-slate-100">
                  {articles.reduce((sum, a) => sum + a.likes, 0).toLocaleString()}
                </div>
              </div>
              <div className="bg-[#16162a] rounded-2xl p-4 border border-[#2d2d44]">
                <div className="text-sm text-slate-400 mb-1">总阅读</div>
                <div className="text-2xl font-bold text-slate-100">
                  {articles.reduce((sum, a) => sum + a.reads, 0).toLocaleString()}
                </div>
              </div>
              <div className="bg-[#16162a] rounded-2xl p-4 border border-[#2d2d44]">
                <div className="text-sm text-slate-400 mb-1">洞察数</div>
                <div className="text-2xl font-bold text-slate-100">{insights.length}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* 点赞量TOP5 */}
              <div className="bg-[#16162a] rounded-2xl p-6 border border-[#2d2d44]">
                <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  <ThumbsUp className="w-5 h-5 text-pink-400" />
                  点赞量 TOP5
                </h3>
                <div className="space-y-3">
                  {getTopArticlesByLikes().map((article, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-[#1a1a2e] rounded-xl"
                    >
                      <div className="w-6 h-6 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-slate-200 hover:text-indigo-400 line-clamp-2 transition-colors"
                        >
                          {article.title}
                        </a>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          <span>{article.author}</span>
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3" />
                            {article.likes.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 互动率TOP5 */}
              <div className="bg-[#16162a] rounded-2xl p-6 border border-[#2d2d44]">
                <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-emerald-400" />
                  互动率 TOP5
                </h3>
                <div className="space-y-3">
                  {getTopArticlesByEngagement().map((article, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-[#1a1a2e] rounded-xl"
                    >
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-slate-200 hover:text-indigo-400 line-clamp-2 transition-colors"
                        >
                          {article.title}
                        </a>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          <span>{article.author}</span>
                          <span className="flex items-center gap-1 text-emerald-400">
                            <TrendingUp className="w-3 h-3" />
                            {article.engagement.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 高频词云 */}
            {wordCloud.length > 0 && (
              <div className="bg-[#16162a] rounded-2xl p-6 border border-[#2d2d44]">
                <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  <Hash className="w-5 h-5 text-amber-400" />
                  高频词云
                </h3>
                <div className="flex flex-wrap gap-3">
                  {wordCloud.map((item, index) => {
                    const maxCount = wordCloud[0]?.count || 1;
                    const size = 0.8 + (item.count / maxCount) * 0.8;
                    const opacity = 0.5 + (item.count / maxCount) * 0.5;
                    return (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-indigo-500/20 text-indigo-300 rounded-full transition-transform hover:scale-110 cursor-default"
                        style={{
                          fontSize: `${size}rem`,
                          opacity: opacity,
                        }}
                      >
                        {item.word}
                        <span className="ml-1 text-xs text-indigo-400/60">{item.count}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 选题洞察 */}
            {insights.length > 0 && (
              <div className="bg-[#16162a] rounded-2xl p-6 border border-[#2d2d44]">
                <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  选题洞察
                  <span className="text-sm font-normal text-slate-500">
                    ({insights.length} 条)
                  </span>
                </h3>
                <div className="space-y-4">
                  {insights.map((insight) => (
                    <div
                      key={insight.id}
                      className="p-4 bg-[#1a1a2e] rounded-xl border border-[#2d2d44] hover:border-indigo-500/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-200 mb-2">{insight.title}</h4>
                          <p className="text-sm text-slate-400 mb-3">{insight.description}</p>
                          {insight.suggestedTopics.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {insight.suggestedTopics.slice(0, 3).map((topic, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-1 text-xs bg-purple-500/20 text-purple-300 rounded-full"
                                >
                                  {topic}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleGenerateArticle(insight)}
                          disabled={generatingId === insight.id}
                          className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm rounded-lg hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
                        >
                          {generatingId === insight.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              生成中...
                            </>
                          ) : (
                            <>
                              <PenTool className="w-4 h-4" />
                              一键创作
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 导出带 Suspense 包装的组件（解决 useSearchParams 预渲染问题）
export default function AnalysisPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0f0f23] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    }>
      <AnalysisPageContent />
    </Suspense>
  );
}
