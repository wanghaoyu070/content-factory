'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import { Skeleton, InsightCardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import LoginPrompt from '@/components/ui/LoginPrompt';
import FavoriteButton from '@/components/ui/FavoriteButton';
import { useLoginGuard } from '@/hooks/useLoginGuard';
import { toast } from 'sonner';

// 动态导入TipTap相关组件，避免SSR问题
const ArticleEditor = dynamic(() => import('@/components/create/ArticleEditor'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full text-[#666]">加载编辑器...</div>
});

const ArticlePreview = dynamic(() => import('@/components/preview/ArticlePreview'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full text-[#666]">加载预览...</div>
});

const ProgressTracker = dynamic(() => import('@/components/ui/ProgressTracker'), {
  ssr: false,
});

import { FloatingProgress } from '@/components/ui/FloatingProgress';
import {
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  PenTool,
  Search,
  Image as ImageIcon,
  FileText,
  Zap,
  RefreshCw,
  Save,
  Send,
  CheckCircle,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';

interface TopicInsight {
  id: number;
  title: string;
  description: string;
  evidence: string;
  suggestedTopics: string[];
  relatedArticles: string[];
  createdAt: string;
}

interface SearchWithInsights {
  searchId: number;
  keyword: string;
  articleCount: number;
  insightCount: number;
  createdAt: string;
  insights: TopicInsight[];
}

interface FlatInsight extends TopicInsight {
  searchId: number;
  keyword: string;
}

// AI 生成的图片
interface GeneratedImage {
  id: string;
  url: string;
  thumbUrl: string;
  author: string;
  authorUrl: string;
}

interface GeneratedArticle {
  articleId: number;
  title: string;
  content: string;
  summary: string;
  imageKeywords: string[];
  images: GeneratedImage[];
  coverImage: string;
}

type WritingStyle = 'professional' | 'casual' | 'storytelling';
type PageMode = 'select' | 'edit';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type ProgressStep = 'validating' | 'generating' | 'generating_prompts' | 'generating_images' | 'saving' | 'completed' | 'error';

interface GenerateProgress {
  step: ProgressStep;
  message: string;
  progress: number;
}

function SaveIndicator({ status, onRetry }: { status: SaveStatus; onRetry: () => void | Promise<void> }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F7F6F0] border border-[rgba(0,0,0,0.06)] min-w-[120px] justify-center">
      {status === 'idle' && (
        <>
          <div className="w-2 h-2 rounded-full bg-slate-500" />
          <span className="text-xs text-[#666]">已保存</span>
        </>
      )}
      {status === 'saving' && (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-[#333]" />
          <span className="text-xs text-[#333]">保存中...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <CheckCircle className="w-3 h-3 text-emerald-400" />
          <span className="text-xs text-emerald-400">刚刚保存</span>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertCircle className="w-3 h-3 text-red-400" />
          <span className="text-xs text-red-400">保存失败</span>
          <button
            type="button"
            onClick={onRetry}
            className="text-xs text-red-400 underline decoration-dotted"
          >
            重试
          </button>
        </>
      )}
    </div>
  );
}

const styleOptions: { value: WritingStyle; label: string; description: string }[] = [
  { value: 'professional', label: '专业严谨', description: '逻辑清晰、数据支撑、适合职场人士' },
  { value: 'casual', label: '轻松活泼', description: '口语化、多用网络流行语、适当使用表情' },
  { value: 'storytelling', label: '故事叙述', description: '有代入感、情感共鸣、引人入胜' },
];

function CreatePageContent() {
  const searchParams = useSearchParams();
  const { ensureLogin, isAuthenticated, status } = useLoginGuard('请登录后使用内容创作功能');
  // 页面模式
  const [mode, setMode] = useState<PageMode>('select');

  // 选题模式状态
  const [searchesWithInsights, setSearchesWithInsights] = useState<SearchWithInsights[]>([]);
  const [flatInsights, setFlatInsights] = useState<FlatInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInsight, setSelectedInsight] = useState<FlatInsight | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [searchFilter, setSearchFilter] = useState<number | 'all'>('all');
  const [style, setStyle] = useState<WritingStyle>('professional');
  const [customTitle, setCustomTitle] = useState('');
  const [useCustomTitle, setUseCustomTitle] = useState(false);
  const [generateProgress, setGenerateProgress] = useState<GenerateProgress | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  // 自由创作状态
  const [showFreeCreateModal, setShowFreeCreateModal] = useState(false);
  const [freeCreateTopic, setFreeCreateTopic] = useState('');

  // 收藏状态
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<'all' | 'favorites'>('all');

  // 编辑模式状态
  const [articleId, setArticleId] = useState<number | null>(null);
  const [articleTitle, setArticleTitle] = useState('');
  const [articleContent, setArticleContent] = useState('');
  const [articleImages, setArticleImages] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState('');
  const [currentInsight, setCurrentInsight] = useState<FlatInsight | null>(null);

  // 自动保存状态
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');

  // URL 参数自动选中洞察的标记
  const autoSelectedRef = useRef(false);

  // 初始加载数据
  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchData();
  }, [isAuthenticated]);

  // 切换筛选时自动刷新数据
  useEffect(() => {
    if (!isAuthenticated || searchFilter === 'all') return;
    fetchData();
  }, [searchFilter, isAuthenticated]);

  // 处理 URL 参数自动选中洞察
  useEffect(() => {
    if (autoSelectedRef.current || loading || flatInsights.length === 0) return;

    const insightId = searchParams.get('insightId');
    const searchId = searchParams.get('searchId');

    if (insightId) {
      const insight = flatInsights.find(i => i.id === parseInt(insightId));
      if (insight) {
        autoSelectedRef.current = true;
        setSelectedInsight(insight);
        setExpandedId(insight.id);
        // 如果有 searchId，设置筛选
        if (searchId) {
          setSearchFilter(parseInt(searchId));
        }
        // 清除 URL 参数
        window.history.replaceState({}, '', '/create');
      }
    }
  }, [searchParams, loading, flatInsights]);

  // 自动保存逻辑
  const autoSave = useCallback(async () => {
    if (!isAuthenticated || !articleId || mode !== 'edit') return;

    const currentState = JSON.stringify({ title: articleTitle, content: articleContent });
    if (currentState === lastSavedRef.current) return;

    setSaveStatus('saving');
    try {
      const response = await fetch(`/api/articles/${articleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: articleTitle,
          content: articleContent,
          images: articleImages,
        }),
      });

      const result = await response.json();
      if (result.success) {
        lastSavedRef.current = currentState;
        setSaveStatus('saved');
        setHasUnsavedChanges(false);
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    }
  }, [articleId, articleTitle, articleContent, articleImages, mode, isAuthenticated]);

  // 防抖自动保存
  useEffect(() => {
    if (!isAuthenticated || mode !== 'edit' || !articleId) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      autoSave();
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [articleTitle, articleContent, autoSave, mode, articleId]);

  useEffect(() => {
    if (!articleId || mode !== 'edit') {
      setHasUnsavedChanges(false);
      return;
    }
    const currentState = JSON.stringify({ title: articleTitle, content: articleContent });
    setHasUnsavedChanges(currentState !== lastSavedRef.current);
  }, [articleId, mode, articleTitle, articleContent]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const fetchData = async () => {
    if (!isAuthenticated) return;
    try {
      // 并行获取洞察数据和收藏列表
      const [insightsRes, favoritesRes] = await Promise.all([
        fetch('/api/insights/all'),
        fetch('/api/insights/favorites?ids_only=true'),
      ]);

      const insightsData = await insightsRes.json();
      const favoritesData = await favoritesRes.json();

      if (insightsData.success) {
        setSearchesWithInsights(insightsData.data);
        const flat: FlatInsight[] = [];
        insightsData.data.forEach((search: SearchWithInsights) => {
          search.insights.forEach((insight) => {
            flat.push({
              ...insight,
              searchId: search.searchId,
              keyword: search.keyword,
            });
          });
        });
        flat.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setFlatInsights(flat);
      }

      if (favoritesData.success) {
        setFavoriteIds(favoritesData.data);
      }
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 根据筛选条件和收藏状态过滤洞察
  const filteredInsights = (() => {
    let filtered = flatInsights;

    // 按搜索关键词筛选
    if (searchFilter !== 'all') {
      filtered = filtered.filter(i => i.searchId === searchFilter);
    }

    // 按收藏状态筛选
    if (viewMode === 'favorites') {
      filtered = filtered.filter(i => favoriteIds.includes(i.id));
    }

    return filtered;
  })();

  const handleGenerate = async () => {
    if (!ensureLogin()) return;
    if (!selectedInsight) return;

    setGenerating(true);
    setGenerateProgress({ step: 'validating', message: '准备中...', progress: 0 });

    try {
      const response = await fetch('/api/articles/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insightId: selectedInsight.id,
          searchId: selectedInsight.searchId,
          insight: {
            title: useCustomTitle && customTitle ? customTitle : selectedInsight.title,
            description: selectedInsight.description,
            suggestedTopics: selectedInsight.suggestedTopics,
            relatedArticles: selectedInsight.relatedArticles,
          },
          keyword: selectedInsight.keyword,
          style,
          fetchImages: true,
        }),
      });

      // 处理 SSE 流式响应
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('无法读取响应流');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6));
              setGenerateProgress({
                step: eventData.step,
                message: eventData.message,
                progress: eventData.progress,
              });

              if (eventData.step === 'completed' && eventData.data) {
                const data: GeneratedArticle = eventData.data;
                // 切换到编辑模式
                setArticleId(data.articleId);
                setArticleTitle(data.title);
                setArticleContent(data.content);
                setArticleImages(data.images.map((img: GeneratedImage) => img.url));
                setCoverImage(data.coverImage);
                setCurrentInsight(selectedInsight);
                lastSavedRef.current = JSON.stringify({ title: data.title, content: data.content });
                setMode('edit');
              } else if (eventData.step === 'error') {
                toast.error('文章生成失败', {
                  description: eventData.message || '请稍后重试',
                });
              }
            } catch {
              console.error('解析SSE数据失败');
            }
          }
        }
      }
    } catch (err) {
      console.error('生成文章失败:', err);
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
      setGenerating(false);
      setGenerateProgress(null);
    }
  };

  const handleRegenerate = async () => {
    if (!ensureLogin()) return;
    if (!currentInsight) return;
    setSelectedInsight(currentInsight);
    setMode('select');
    // 自动触发生成
    setTimeout(() => {
      handleGenerate();
    }, 100);
  };

  const handleSubmitReview = async () => {
    if (!ensureLogin()) return;
    if (!articleId) return;

    setSaveStatus('saving');
    try {
      const response = await fetch(`/api/articles/${articleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: articleTitle,
          content: articleContent,
          images: articleImages,
          status: 'pending_review',
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('已提交审核', {
          description: '文章已进入审核流程',
        });
        setSaveStatus('saved');
      } else {
        toast.error('提交失败', {
          description: result.error || '请稍后重试',
        });
        setSaveStatus('error');
      }
    } catch {
      toast.error('提交失败', {
        description: '网络异常，请稍后重试',
      });
      setSaveStatus('error');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (status !== 'loading' && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FDFCF6]">
        <Header title="内容创作" />
        <div className="p-6">
          <LoginPrompt description="登录后即可生成文章、管理草稿" />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFCF6]">
        <Header title="内容创作" />
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-[rgba(0,0,0,0.06)]">
            <div className="p-6 flex flex-col gap-4 border-b border-[rgba(0,0,0,0.06)]">
              <Skeleton className="h-10 w-full" />
              <div className="flex gap-4">
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-10 flex-1" />
              </div>
            </div>
            <div>
              {Array.from({ length: 4 }).map((_, i) => (
                <InsightCardSkeleton key={i} />
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] p-6 space-y-4">
            <Skeleton className="h-6 w-32" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-48 w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 编辑模式
  if (mode === 'edit') {
    return (
      <div className="min-h-screen bg-[#FDFCF6] flex flex-col">
        <Header
          title="内容创作"
          action={
            <div className="flex items-center gap-2 sm:gap-3">
              {/* 移动端只显示状态指示器 */}
              <div className="hidden sm:block">
                <SaveIndicator status={saveStatus} onRetry={autoSave} />
              </div>
              {/* 移动端显示简化的状态点 */}
              <div className="sm:hidden">
                {saveStatus === 'saving' && <Loader2 className="w-4 h-4 animate-spin text-[#333]" />}
                {saveStatus === 'saved' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                {saveStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
              </div>
              {/* 保存按钮 - 移动端只显示图标 */}
              <button
                onClick={autoSave}
                className="p-2 sm:px-4 sm:py-2 border border-[rgba(0,0,0,0.06)] text-[#333] rounded-lg hover:bg-[#F7F6F0] transition-colors flex items-center gap-2 active:scale-95"
                title="保存草稿"
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">保存草稿</span>
              </button>
              {/* 提交按钮 - 移动端只显示图标 */}
              <button
                onClick={handleSubmitReview}
                className="p-2 sm:px-4 sm:py-2 bg-[#333] text-white rounded-lg hover:bg-[#444] transition-colors flex items-center gap-2 active:scale-95"
                title="提交审核"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">提交审核</span>
              </button>
            </div>
          }
        />

        {/* 当前选题信息栏 - 移动端优化 */}
        <div className="px-4 sm:px-6 py-3 bg-white border-b border-[rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <button
                onClick={() => setMode('select')}
                className="p-1 text-[#666] hover:text-[#1A1A1A] transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <span className="hidden sm:inline text-[#999] flex-shrink-0">当前选题:</span>
              <span className="px-2 py-0.5 text-xs bg-[#F7F6F0] text-[#666] rounded-full flex-shrink-0">
                {currentInsight?.keyword}
              </span>
              <span className="text-[#1A1A1A] font-medium truncate text-sm sm:text-base">
                {currentInsight?.title}
              </span>
            </div>
            <button
              onClick={handleRegenerate}
              className="p-2 sm:px-3 sm:py-1.5 text-sm text-[#666] hover:text-[#333] hover:bg-[rgba(0,0,0,0.04)] rounded-lg flex items-center gap-1 flex-shrink-0 active:scale-95"
              title="重新生成"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">重新生成</span>
            </button>
          </div>
        </div>

        {/* 编辑器和预览区域 */}
        <div className="flex-1 p-4 lg:p-6 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 h-full">
            {/* 左侧：编辑器 */}
            <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] overflow-hidden flex flex-col">
              <ArticleEditor
                title={articleTitle}
                content={articleContent}
                images={articleImages}
                onTitleChange={setArticleTitle}
                onContentChange={setArticleContent}
              />
            </div>

            {/* 右侧：预览 */}
            <ArticlePreview
              title={articleTitle}
              content={articleContent}
              coverImage={coverImage}
              images={articleImages}
            />
          </div>
        </div>
      </div>
    );
  }

  // 选题模式
  return (
    <div className="min-h-screen bg-[#FDFCF6]">
      <Header title="内容创作" />

      <div className="p-4 sm:p-6">
        {/* 自由创作入口 */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-[rgba(0,0,0,0.06)] mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#F7F6F0] flex items-center justify-center flex-shrink-0">
                <PenTool className="w-5 h-5 sm:w-6 sm:h-6 text-[#333]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#1A1A1A] text-sm sm:text-base mb-0.5 sm:mb-1">自由创作模式</h3>
                <p className="text-xs sm:text-sm text-[#666]">已有想法？跳过选题，直接开始 AI 创作</p>
              </div>
            </div>
            <button
              onClick={() => {
                // 创建一个自由创作的虚拟洞察
                setSelectedInsight({
                  id: -1,
                  searchId: -1,
                  keyword: '自由创作',
                  title: '自由创作',
                  description: '',
                  evidence: '',
                  suggestedTopics: [],
                  relatedArticles: [],
                  createdAt: new Date().toISOString(),
                });
                setShowFreeCreateModal(true);
              }}
              className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 bg-[#333] text-white rounded-xl hover:bg-[#444] transition-all font-medium flex items-center justify-center gap-2 active:scale-95 text-sm sm:text-base"
            >
              <Zap className="w-4 h-4" />
              开始创作
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* 左侧：选题列表 */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4 lg:space-y-6 order-2 lg:order-1">
            {/* 筛选器 */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-[rgba(0,0,0,0.06)]">
              <div className="flex items-center justify-between gap-4 mb-3">
                {/* 视图模式切换 */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('all')}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1.5 ${viewMode === 'all'
                      ? 'bg-[rgba(0,0,0,0.06)] text-[#333]'
                      : 'text-[#666] hover:bg-[#F7F6F0]'
                      }`}
                  >
                    全部洞察 ({flatInsights.length})
                  </button>
                  <button
                    onClick={() => setViewMode('favorites')}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1.5 ${viewMode === 'favorites'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'text-[#666] hover:bg-[#F7F6F0]'
                      }`}
                  >
                    ⭐ 我的收藏 ({favoriteIds.length})
                  </button>
                </div>
              </div>

              {/* 关键词筛选 */}
              {viewMode === 'all' && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-[#666]">
                    <Search className="w-4 h-4" />
                    <span className="text-sm">筛选关键词:</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setSearchFilter('all')}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${searchFilter === 'all'
                        ? 'bg-[rgba(0,0,0,0.06)] text-[#333]'
                        : 'text-[#666] hover:bg-[#F7F6F0]'
                        }`}
                    >
                      全部
                    </button>
                    {searchesWithInsights.slice(0, 5).map((search) => (
                      <button
                        key={search.searchId}
                        onClick={() => setSearchFilter(search.searchId)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${searchFilter === search.searchId
                          ? 'bg-[rgba(0,0,0,0.06)] text-[#333]'
                          : 'text-[#666] hover:bg-[#F7F6F0]'
                          }`}
                      >
                        {search.keyword} ({search.insightCount})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 选题洞察列表 */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-[rgba(0,0,0,0.06)]">
              <div className="p-3 sm:p-4 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-semibold text-[#1A1A1A] flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#333]" />
                  <span className="hidden sm:inline">选题洞察库</span>
                  <span className="sm:hidden">洞察库</span>
                  <span className="text-xs sm:text-sm font-normal text-[#999]">
                    ({filteredInsights.length})
                  </span>
                </h3>
                <button
                  onClick={fetchData}
                  className="text-sm text-[#666] hover:text-[#333] flex items-center gap-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  刷新
                </button>
              </div>

              {filteredInsights.length === 0 ? (
                <EmptyState
                  icon={<Sparkles className="w-6 h-6" />}
                  title="暂无选题洞察"
                  description="前往「选题分析」页面搜索关键词，生成可用的选题洞察"
                  action={{ label: '前往选题分析', href: '/analysis' }}
                />
              ) : (
                <div className="divide-y divide-[rgba(0,0,0,0.06)] max-h-[50vh] sm:max-h-[600px] overflow-y-auto">
                  {filteredInsights.map((insight) => {
                    const isExpanded = expandedId === insight.id;
                    const isSelected = selectedInsight?.id === insight.id;

                    return (
                      <div
                        key={insight.id}
                        className={`p-3 sm:p-4 transition-colors cursor-pointer active:bg-[#F7F6F0] ${isSelected ? 'bg-[rgba(0,0,0,0.04)] border-l-2 border-[rgba(0,0,0,0.15)]' : 'hover:bg-[#F7F6F0]'
                          }`}
                        onClick={() => setSelectedInsight(insight)}
                      >
                        <div className="flex items-start justify-between gap-2 sm:gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 flex-wrap">
                              <span className="px-1.5 sm:px-2 py-0.5 text-xs bg-[#F7F6F0] text-[#666] rounded-full">
                                {insight.keyword}
                              </span>
                              <span className="text-xs text-[#999]">
                                {formatDate(insight.createdAt)}
                              </span>
                            </div>
                            <h4 className="font-medium text-[#1A1A1A] flex items-center gap-2 text-sm sm:text-base">
                              {isSelected && (
                                <span className="w-2 h-2 rounded-full bg-[#333] flex-shrink-0" />
                              )}
                              <span className="line-clamp-2">{insight.title}</span>
                            </h4>
                            <p className="text-xs sm:text-sm text-[#666] mt-1 line-clamp-2">
                              {insight.description}
                            </p>

                            {isExpanded && (
                              <div className="mt-3 pt-3 border-t border-[rgba(0,0,0,0.06)] space-y-3">
                                {insight.evidence && (
                                  <div>
                                    <span className="text-xs font-medium text-[#999]">数据支撑</span>
                                    <p className="text-sm text-[#666] mt-1">{insight.evidence}</p>
                                  </div>
                                )}
                                {insight.suggestedTopics.length > 0 && (
                                  <div>
                                    <span className="text-xs font-medium text-[#999]">推荐选题方向</span>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                      {insight.suggestedTopics.map((topic: string, i: number) => (
                                        <span
                                          key={i}
                                          className="px-2 py-1 text-xs bg-[#F7F6F0] text-[#666] rounded-full border border-[rgba(0,0,0,0.06)]"
                                        >
                                          {topic}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {insight.relatedArticles.length > 0 && (
                                  <div>
                                    <span className="text-xs font-medium text-[#999]">相关文章</span>
                                    <ul className="mt-1 space-y-1">
                                      {insight.relatedArticles.slice(0, 3).map((article: string, i: number) => (
                                        <li key={i} className="text-xs text-[#999] truncate">
                                          • {article}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-0.5 sm:gap-1">
                            {/* 收藏按钮 */}
                            <FavoriteButton
                              insightId={insight.id}
                              isFavorited={favoriteIds.includes(insight.id)}
                              onToggle={(newState) => {
                                if (newState) {
                                  setFavoriteIds([...favoriteIds, insight.id]);
                                } else {
                                  setFavoriteIds(favoriteIds.filter(id => id !== insight.id));
                                }
                              }}
                              size="sm"
                            />

                            {/* 展开按钮 - 增大触摸目标 */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedId(isExpanded ? null : insight.id);
                              }}
                              className="p-2.5 sm:p-2 text-[#999] hover:text-[#333] hover:bg-white/5 rounded-lg transition-colors active:scale-95"
                              aria-label={isExpanded ? '收起详情' : '展开详情'}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 右侧：创作面板 */}
          <div className="space-y-3 sm:space-y-4 lg:space-y-6 order-1 lg:order-2">
            {/* 创作设置 */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-[rgba(0,0,0,0.06)]">
              <h3 className="text-base sm:text-lg font-semibold text-[#1A1A1A] mb-3 sm:mb-4 flex items-center gap-2">
                <PenTool className="w-5 h-5 text-[#333]" />
                创作设置
              </h3>

              {selectedInsight ? (
                <div className="space-y-4">
                  {/* 选中的洞察 */}
                  <div className="p-3 bg-[#F7F6F0] rounded-xl border border-[rgba(0,0,0,0.08)]">
                    <div className="text-xs text-[#333] mb-1">已选择洞察</div>
                    <div className="text-sm text-[#1A1A1A] font-medium">
                      {selectedInsight.title}
                    </div>
                  </div>

                  {/* 自定义标题 */}
                  <div>
                    <label className="flex items-center gap-2 text-sm text-[#666] mb-2">
                      <input
                        type="checkbox"
                        checked={useCustomTitle}
                        onChange={(e) => setUseCustomTitle(e.target.checked)}
                        className="rounded border-slate-600 bg-[#F7F6F0] text-indigo-500 focus:ring-[rgba(0,0,0,0.1)]"
                      />
                      自定义文章标题
                    </label>
                    {useCustomTitle && (
                      <input
                        type="text"
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                        placeholder="输入自定义标题..."
                        className="w-full px-3 py-2 bg-[#F7F6F0] border border-[rgba(0,0,0,0.06)] rounded-xl text-[#1A1A1A] placeholder-[#999] focus:outline-none focus:ring-2 focus:ring-[rgba(0,0,0,0.1)] text-sm"
                      />
                    )}
                  </div>

                  {/* 写作风格 */}
                  <div>
                    <label className="text-sm text-[#666] mb-2 block">写作风格</label>
                    <div className="space-y-2">
                      {styleOptions.map((option) => (
                        <label
                          key={option.value}
                          className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${style === option.value
                            ? 'bg-[rgba(0,0,0,0.06)] border border-[rgba(0,0,0,0.08)]'
                            : 'bg-[#F7F6F0] border border-transparent hover:border-[rgba(0,0,0,0.06)]'
                            }`}
                        >
                          <input
                            type="radio"
                            name="style"
                            value={option.value}
                            checked={style === option.value}
                            onChange={(e) => setStyle(e.target.value as WritingStyle)}
                            className="mt-1 border-slate-600 bg-[#F7F6F0] text-indigo-500 focus:ring-[rgba(0,0,0,0.1)]"
                          />
                          <div>
                            <div className="text-sm font-medium text-[#1A1A1A]">{option.label}</div>
                            <div className="text-xs text-[#999]">{option.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 功能说明 */}
                  <div className="p-3 bg-[#F7F6F0] rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-xs text-[#666]">
                      <ImageIcon className="w-4 h-4 text-[#333]" />
                      AI 自动生成配图并插入文章
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#666]">
                      <FileText className="w-4 h-4 text-[#333]" />
                      生成 1500-2500 字高质量文章
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#666]">
                      <Zap className="w-4 h-4 text-[#333]" />
                      AI 智能优化标题和结构
                    </div>
                  </div>

                  {/* 生成按钮 */}
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="w-full py-3 bg-[#333] text-white rounded-xl hover:bg-[#444] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        AI 创作中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        一键 AI 创作
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                  <p className="text-[#666]">请从左侧选择一个选题洞察</p>
                  <p className="text-sm text-[#999] mt-2">
                    点击洞察卡片即可选中
                  </p>
                </div>
              )}
            </div>

            {/* 快速入口 - 移动端隐藏 */}
            <div className="hidden sm:block bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-[rgba(0,0,0,0.06)]">
              <h3 className="text-sm font-medium text-[#666] mb-3">快速入口</h3>
              <div className="space-y-2">
                <a
                  href="/"
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#F7F6F0] hover:bg-[#EFEDE7] transition-colors"
                >
                  <Search className="w-5 h-5 text-[#333]" />
                  <div>
                    <div className="text-sm text-[#1A1A1A]">选题分析</div>
                    <div className="text-xs text-[#999]">搜索关键词，发现新选题</div>
                  </div>
                </a>
                <a
                  href="/articles"
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#F7F6F0] hover:bg-[#EFEDE7] transition-colors"
                >
                  <FileText className="w-5 h-5 text-[#333]" />
                  <div>
                    <div className="text-sm text-[#1A1A1A]">发布管理</div>
                    <div className="text-xs text-[#999]">管理已生成的文章</div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 生成进度模态框（全屏） */}
      {generating && generateProgress && !isMinimized && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <ProgressTracker
            progress={generateProgress}
            minimizable={true}
            onMinimize={() => setIsMinimized(true)}
          />
        </div>
      )}

      {/* 浮动进度条（最小化时显示） */}
      {generating && generateProgress && isMinimized && (
        <FloatingProgress
          progress={generateProgress}
          articleId={articleId || undefined}
          onExpand={() => setIsMinimized(false)}
          onClose={() => {
            setIsMinimized(false);
            // 如果已完成，清理状态
            if (generateProgress?.step === 'completed' || generateProgress?.step === 'error') {
              setGenerating(false);
              setGenerateProgress(null);
            }
          }}
        />
      )}

      {/* 已完成的浮动提示（当不在创作页面时显示） */}
      {!generating && generateProgress?.step === 'completed' && articleId && (
        <FloatingProgress
          progress={generateProgress}
          articleId={articleId}
          onClose={() => setGenerateProgress(null)}
        />
      )}

      {/* 自由创作模态框 */}
      {showFreeCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowFreeCreateModal(false)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-2xl overflow-hidden">
            {/* 头部 */}
            <div className="h-1.5 bg-[#333]" />
            <div className="p-6 border-b border-[rgba(0,0,0,0.06)]">
              <h2 className="text-xl font-semibold text-[#1A1A1A] flex items-center gap-2">
                <PenTool className="w-5 h-5 text-[#333]" />
                自由创作
              </h2>
              <p className="text-sm text-[#666] mt-1">
                输入你想写的主题，AI 将为你生成完整文章
              </p>
            </div>

            {/* 内容 */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#333] mb-2">
                  创作主题 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={freeCreateTopic}
                  onChange={(e) => setFreeCreateTopic(e.target.value)}
                  placeholder="例如：2024年AI行业发展趋势分析"
                  className="w-full px-4 py-3 bg-[#F7F6F0] border border-[rgba(0,0,0,0.06)] rounded-xl text-[#1A1A1A] placeholder-[#999] focus:outline-none focus:ring-2 focus:ring-[rgba(0,0,0,0.1)]/50"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#333] mb-2">
                  写作风格
                </label>
                <div className="flex gap-2">
                  {styleOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setStyle(opt.value)}
                      className={`flex-1 px-3 py-2 rounded-xl text-sm transition-colors ${style === opt.value
                        ? 'bg-[rgba(0,0,0,0.06)] text-[#333] border border-[rgba(0,0,0,0.15)]/50'
                        : 'bg-[#F7F6F0] text-[#666] border border-[rgba(0,0,0,0.06)] hover:border-[rgba(0,0,0,0.12)]'
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#F7F6F0] rounded-xl p-4">
                <p className="text-xs text-[#999] mb-2">💡 创作提示</p>
                <ul className="text-xs text-[#666] space-y-1">
                  <li>• 主题越具体，生成效果越好</li>
                  <li>• 可以包含关键词、行业、角度等</li>
                  <li>• AI 会自动组织结构和内容</li>
                </ul>
              </div>
            </div>

            {/* 底部操作 */}
            <div className="px-6 py-4 border-t border-[rgba(0,0,0,0.06)] flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowFreeCreateModal(false);
                  setFreeCreateTopic('');
                }}
                className="px-4 py-2 text-[#666] hover:text-[#1A1A1A] transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (!freeCreateTopic.trim()) {
                    return;
                  }
                  // 使用自由创作主题创建洞察
                  setSelectedInsight({
                    id: -1,
                    searchId: -1,
                    keyword: freeCreateTopic,
                    title: freeCreateTopic,
                    description: `用户自由创作：${freeCreateTopic}`,
                    evidence: '',
                    suggestedTopics: [freeCreateTopic],
                    relatedArticles: [],
                    createdAt: new Date().toISOString(),
                  });
                  setShowFreeCreateModal(false);
                  // 触发生成
                  handleGenerate();
                }}
                disabled={!freeCreateTopic.trim() || generating}
                className="px-6 py-2.5 bg-[#333] text-white rounded-xl hover:bg-[#444] transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                开始创作
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 导出带 Suspense 包装的组件（解决 useSearchParams 预渲染问题）
export default function CreatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FDFCF6] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[rgba(0,0,0,0.15)] border-t-transparent rounded-full" />
      </div>
    }>
      <CreatePageContent />
    </Suspense>
  );
}
