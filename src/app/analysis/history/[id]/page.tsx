'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  TrendingUp,
  MessageCircle,
  ExternalLink,
  FileText,
  Eye,
  ThumbsUp,
  Lightbulb,
  Sparkles,
  PenTool,
  Loader2,
  Hash,
} from 'lucide-react';
import { toast } from 'sonner';

interface SearchRecord {
  id: number;
  keyword: string;
  article_count: number;
  created_at: string;
}

interface SourceArticle {
  id: number;
  title: string;
  content: string;
  coverImage: string;
  readCount: number;
  likeCount: number;
  wowCount: number;
  publishTime: string;
  sourceUrl: string;
  wxName: string;
  wxId: string;
  isOriginal: boolean;
}

interface Insight {
  id: number;
  title: string;
  description: string;
  evidence: string;
  suggestedTopics: string[];
  relatedArticles: string[];
}

interface WordCloudItem {
  text: string;
  weight: number;
}

export default function AnalysisHistoryDetailPage() {
  const params = useParams();
  const [search, setSearch] = useState<SearchRecord | null>(null);
  const [articles, setArticles] = useState<SourceArticle[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<number | null>(null);

  useEffect(() => {
    fetchDetail();
  }, [params.id]);

  const fetchDetail = async () => {
    try {
      // 获取搜索记录和文章
      const response = await fetch(`/api/search/${params.id}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '获取详情失败');
      }

      setSearch(result.data.search);
      setArticles(result.data.articles);

      // 获取洞察数据
      const insightsRes = await fetch(`/api/insights?searchId=${params.id}`);
      const insightsData = await insightsRes.json();
      if (insightsData.success && insightsData.data) {
        setInsights(insightsData.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取详情失败');
    } finally {
      setLoading(false);
    }
  };

  const formatCount = (count: number) => {
    if (count >= 100000) return (count / 10000).toFixed(1) + 'w';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'k';
    return count.toString();
  };

  const getInteractionRate = (article: SourceArticle) => {
    if (article.readCount === 0) return '0.0';
    return (((article.likeCount + article.wowCount) / article.readCount) * 100).toFixed(1);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Statistics
  const stats = useMemo(() => {
    if (articles.length === 0) return { avgRead: 0, avgInteraction: 0 };

    const totalRead = articles.reduce((sum, a) => sum + a.readCount, 0);
    const totalInteraction = articles.reduce((sum, a) => {
      if (a.readCount === 0) return sum;
      return sum + (a.likeCount + a.wowCount) / a.readCount;
    }, 0);

    return {
      avgRead: totalRead / articles.length,
      avgInteraction: (totalInteraction / articles.length) * 100,
    };
  }, [articles]);

  // Top liked articles
  const topLikedArticles = useMemo(() => {
    return [...articles].sort((a, b) => b.likeCount - a.likeCount).slice(0, 5);
  }, [articles]);

  // Top interaction articles
  const topInteractionArticles = useMemo(() => {
    return [...articles]
      .sort((a, b) => {
        const rateA = a.readCount > 0 ? (a.likeCount + a.wowCount) / a.readCount : 0;
        const rateB = b.readCount > 0 ? (b.likeCount + b.wowCount) / b.readCount : 0;
        return rateB - rateA;
      })
      .slice(0, 5);
  }, [articles]);

  // Word cloud
  const wordCloud = useMemo((): WordCloudItem[] => {
    if (articles.length === 0) return [];

    const wordCount: Record<string, number> = {};
    const stopWords = new Set([
      '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
      '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
      '自己', '这', '那', '什么', '他', '她', '它', '们', '这个', '那个', '如何', '怎么',
      '为什么', '可以', '能', '让', '被', '把', '从', '对', '与', '及', '等', '或', '但', '而',
    ]);

    articles.forEach((article) => {
      const words = article.title
        .replace(/[，。！？、：；""''【】《》（）\[\](),.!?:;"'<>]/g, ' ')
        .split(/\s+/)
        .filter((word) => word.length >= 2 && !stopWords.has(word));

      words.forEach((word) => {
        wordCount[word] = (wordCount[word] || 0) + 1;
      });
    });

    return Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([text], index) => ({
        text,
        weight: 100 - index * 6,
      }));
  }, [articles]);

  const handleGenerateArticle = async (insight: Insight) => {
    if (!search) return;
    setGeneratingId(insight.id);

    try {
      const response = await fetch('/api/articles/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insightId: insight.id,
          searchId: search.id,
          insight: {
            title: insight.title,
            description: insight.description,
            suggestedTopics: insight.suggestedTopics,
            relatedArticles: insight.relatedArticles,
          },
          keyword: search.keyword,
          style: 'professional',
          fetchImages: true,
        }),
      });

      const result = await response.json();

      if (result.success && result.data?.articleId) {
        window.location.href = `/articles/${result.data.articleId}`;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f23]">
        <div className="bg-[#16162a] border-b border-[#2d2d44]">
          <div className="px-6 py-4">
            <h1 className="text-xl font-semibold text-slate-100">搜索详情</h1>
          </div>
        </div>
        <div className="p-6 text-center text-slate-500">
          <div className="inline-flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            加载中...
          </div>
        </div>
      </div>
    );
  }

  if (error || !search) {
    return (
      <div className="min-h-screen bg-[#0f0f23]">
        <div className="bg-[#16162a] border-b border-[#2d2d44]">
          <div className="px-6 py-4">
            <h1 className="text-xl font-semibold text-slate-100">搜索详情</h1>
          </div>
        </div>
        <div className="p-6">
          <Link
            href="/analysis/history"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-indigo-400 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回历史列表
          </Link>
          <div className="bg-[#16162a] rounded-2xl p-12 border border-red-500/30 text-center text-red-400">
            {error || '记录不存在'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f23]">
      {/* Header */}
      <div className="bg-[#16162a] border-b border-[#2d2d44]">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold text-slate-100">
            {search.keyword}
            <span className="ml-3 text-sm font-normal text-slate-500">
              {search.article_count}篇 · {formatDate(search.created_at)}
            </span>
          </h1>
        </div>
      </div>

      <div className="p-6">
        <Link
          href="/analysis/history"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-indigo-400 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回历史列表
        </Link>

        {/* Stats Overview */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-[#16162a] rounded-2xl p-4 border border-[#2d2d44]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">{search.article_count}</p>
                <p className="text-sm text-slate-500">文章总数</p>
              </div>
            </div>
          </div>
          <div className="bg-[#16162a] rounded-2xl p-4 border border-[#2d2d44]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">{formatCount(stats.avgRead)}</p>
                <p className="text-sm text-slate-500">平均阅读</p>
              </div>
            </div>
          </div>
          <div className="bg-[#16162a] rounded-2xl p-4 border border-[#2d2d44]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <ThumbsUp className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">{stats.avgInteraction.toFixed(1)}%</p>
                <p className="text-sm text-slate-500">平均互动率</p>
              </div>
            </div>
          </div>
          <div className="bg-[#16162a] rounded-2xl p-4 border border-[#2d2d44]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">{insights.length}</p>
                <p className="text-sm text-slate-500">洞察数量</p>
              </div>
            </div>
          </div>
        </div>

        {/* Insights Section */}
        {insights.length > 0 && (
          <div className="bg-[#16162a] rounded-2xl p-6 border border-[#2d2d44] mb-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              选题洞察
              <span className="text-sm font-normal text-slate-500">({insights.length} 条)</span>
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
                      {insight.suggestedTopics && insight.suggestedTopics.length > 0 && (
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

        {/* Top Articles & Word Cloud */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="space-y-6">
            {/* Top Liked */}
            <div className="bg-[#16162a] rounded-2xl p-6 border border-[#2d2d44]">
              <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-pink-400" />
                点赞量 TOP5
              </h3>
              <div className="space-y-3">
                {topLikedArticles.map((article, index) => (
                  <a
                    key={article.id}
                    href={article.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-3 rounded-xl bg-[#1a1a2e] hover:bg-[#1e1e38] transition-colors group"
                  >
                    <span className="w-6 h-6 rounded-full bg-pink-500/20 text-pink-400 text-sm font-medium flex items-center justify-center flex-shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-300 line-clamp-2 group-hover:text-indigo-400 transition-colors">
                        {article.title}
                        <ExternalLink className="w-3 h-3 inline ml-1 opacity-0 group-hover:opacity-100" />
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" />
                          {formatCount(article.likeCount)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {formatCount(article.readCount)}
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Top Interaction */}
            <div className="bg-[#16162a] rounded-2xl p-6 border border-[#2d2d44]">
              <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-400" />
                互动率 TOP5
              </h3>
              <div className="space-y-3">
                {topInteractionArticles.map((article, index) => (
                  <a
                    key={article.id}
                    href={article.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-3 rounded-xl bg-[#1a1a2e] hover:bg-[#1e1e38] transition-colors group"
                  >
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-medium flex items-center justify-center flex-shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-300 line-clamp-2 group-hover:text-indigo-400 transition-colors">
                        {article.title}
                        <ExternalLink className="w-3 h-3 inline ml-1 opacity-0 group-hover:opacity-100" />
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1 text-emerald-400">
                          <TrendingUp className="w-3 h-3" />
                          {getInteractionRate(article)}%
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {formatCount(article.readCount)}
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Word Cloud */}
          <div className="bg-[#16162a] rounded-2xl p-6 border border-[#2d2d44] h-fit">
            <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Hash className="w-5 h-5 text-amber-400" />
              高频词云
            </h3>
            <div className="flex flex-wrap gap-3 justify-center py-8">
              {wordCloud.map((word) => (
                <span
                  key={word.text}
                  className="px-3 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 transition-transform hover:scale-110 cursor-default"
                  style={{
                    fontSize: `${Math.max(12, word.weight / 7)}px`,
                    opacity: 0.5 + word.weight / 200,
                  }}
                >
                  {word.text}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* All Articles */}
        <div className="bg-[#16162a] rounded-2xl border border-[#2d2d44] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#2d2d44]">
            <h3 className="text-lg font-semibold text-slate-200">全部文章 ({articles.length}篇)</h3>
          </div>
          <table className="w-full">
            <thead className="bg-[#1a1a2e] border-b border-[#2d2d44]">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-slate-400">标题</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-slate-400 w-32">公众号</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-slate-400 w-24">阅读</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-slate-400 w-24">点赞</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-slate-400 w-24">互动率</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr
                  key={article.id}
                  className="border-b border-[#2d2d44] hover:bg-[#1a1a2e] transition-colors"
                >
                  <td className="px-6 py-4">
                    <a
                      href={article.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-slate-300 hover:text-indigo-400 line-clamp-1 transition-colors"
                    >
                      {article.title}
                    </a>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{article.wxName}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{formatCount(article.readCount)}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{formatCount(article.likeCount)}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{getInteractionRate(article)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
