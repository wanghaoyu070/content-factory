'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/layout/Header';

// 动态导入TipTap相关组件，避免SSR问题
const ArticleEditor = dynamic(() => import('@/components/create/ArticleEditor'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full text-slate-400">加载编辑器...</div>
});

const ArticlePreview = dynamic(() => import('@/components/preview/ArticlePreview'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full text-slate-400">加载预览...</div>
});
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

interface UnsplashImage {
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
  images: UnsplashImage[];
  coverImage: string;
}

type WritingStyle = 'professional' | 'casual' | 'storytelling';
type PageMode = 'select' | 'edit';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type ProgressStep = 'validating' | 'generating' | 'fetching_images' | 'saving' | 'completed' | 'error';

interface GenerateProgress {
  step: ProgressStep;
  message: string;
  progress: number;
}

const styleOptions: { value: WritingStyle; label: string; description: string }[] = [
  { value: 'professional', label: '专业严谨', description: '逻辑清晰、数据支撑、适合职场人士' },
  { value: 'casual', label: '轻松活泼', description: '口语化、多用网络流行语、适当使用表情' },
  { value: 'storytelling', label: '故事叙述', description: '有代入感、情感共鸣、引人入胜' },
];

export default function CreatePage() {
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

  // 编辑模式状态
  const [articleId, setArticleId] = useState<number | null>(null);
  const [articleTitle, setArticleTitle] = useState('');
  const [articleContent, setArticleContent] = useState('');
  const [articleImages, setArticleImages] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState('');
  const [currentInsight, setCurrentInsight] = useState<FlatInsight | null>(null);

  // 自动保存状态
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');

  // 初始加载数据
  useEffect(() => {
    fetchData();
  }, []);

  // 切换筛选时自动刷新数据
  useEffect(() => {
    if (!loading && searchFilter !== 'all') {
      fetchData();
    }
  }, [searchFilter]);

  // 自动保存逻辑
  const autoSave = useCallback(async () => {
    if (!articleId || mode !== 'edit') return;

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
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    }
  }, [articleId, articleTitle, articleContent, articleImages, mode]);

  // 防抖自动保存
  useEffect(() => {
    if (mode !== 'edit' || !articleId) return;

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

  const fetchData = async () => {
    try {
      const res = await fetch('/api/insights/all');
      const data = await res.json();

      if (data.success) {
        setSearchesWithInsights(data.data);
        const flat: FlatInsight[] = [];
        data.data.forEach((search: SearchWithInsights) => {
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
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredInsights = searchFilter === 'all'
    ? flatInsights
    : flatInsights.filter(i => i.searchId === searchFilter);

  const handleGenerate = async () => {
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
                setArticleImages(data.images.map((img: UnsplashImage) => img.url));
                setCoverImage(data.coverImage);
                setCurrentInsight(selectedInsight);
                lastSavedRef.current = JSON.stringify({ title: data.title, content: data.content });
                setMode('edit');
              } else if (eventData.step === 'error') {
                alert(eventData.message || '文章生成失败，请重试');
              }
            } catch {
              console.error('解析SSE数据失败');
            }
          }
        }
      }
    } catch (err) {
      console.error('生成文章失败:', err);
      alert('文章生成失败，请检查 AI 配置');
    } finally {
      setGenerating(false);
      setGenerateProgress(null);
    }
  };

  const handleRegenerate = async () => {
    if (!currentInsight) return;
    setSelectedInsight(currentInsight);
    setMode('select');
    // 自动触发生成
    setTimeout(() => {
      handleGenerate();
    }, 100);
  };

  const handleSubmitReview = async () => {
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
        alert('已提交审核');
        setSaveStatus('saved');
      } else {
        alert(result.error || '提交失败');
        setSaveStatus('error');
      }
    } catch {
      alert('提交失败，请重试');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f23]">
        <Header title="内容创作" />
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        </div>
      </div>
    );
  }

  // 编辑模式
  if (mode === 'edit') {
    return (
      <div className="min-h-screen bg-[#0f0f23] flex flex-col">
        <Header
          title="内容创作"
          action={
            <div className="flex items-center gap-3">
              {/* 保存状态 */}
              <div className="flex items-center gap-2 text-sm">
                {saveStatus === 'saving' && (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    <span className="text-slate-400">保存中...</span>
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">已保存</span>
                  </>
                )}
                {saveStatus === 'error' && (
                  <span className="text-red-400">保存失败</span>
                )}
              </div>

              <button
                onClick={autoSave}
                className="px-4 py-2 border border-[#2d2d44] text-slate-300 rounded-lg hover:bg-[#1a1a2e] transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                保存草稿
              </button>
              <button
                onClick={handleSubmitReview}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                提交审核
              </button>
            </div>
          }
        />

        {/* 当前选题信息栏 */}
        <div className="px-6 py-3 bg-[#16162a] border-b border-[#2d2d44] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMode('select')}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="text-slate-500">当前选题:</span>
            <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded-full">
              {currentInsight?.keyword}
            </span>
            <span className="text-slate-200 font-medium">{currentInsight?.title}</span>
          </div>
          <button
            onClick={handleRegenerate}
            className="text-sm text-slate-400 hover:text-indigo-400 flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            重新生成
          </button>
        </div>

        {/* 编辑器和预览区域 */}
        <div className="flex-1 p-6 overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr] gap-6 h-full">
            {/* 左侧：编辑器 */}
            <div className="bg-[#16162a] rounded-2xl border border-[#2d2d44] overflow-hidden flex flex-col">
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
    <div className="min-h-screen bg-[#0f0f23]">
      <Header title="内容创作" />

      <div className="p-6">
        <div className="grid grid-cols-3 gap-6">
          {/* 左侧：选题列表 */}
          <div className="col-span-2 space-y-6">
            {/* 筛选器 */}
            <div className="bg-[#16162a] rounded-2xl p-4 border border-[#2d2d44]">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <Search className="w-4 h-4" />
                  <span className="text-sm">筛选关键词:</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setSearchFilter('all')}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      searchFilter === 'all'
                        ? 'bg-indigo-500/20 text-indigo-400'
                        : 'text-slate-400 hover:bg-[#1a1a2e]'
                    }`}
                  >
                    全部 ({flatInsights.length})
                  </button>
                  {searchesWithInsights.slice(0, 5).map((search) => (
                    <button
                      key={search.searchId}
                      onClick={() => setSearchFilter(search.searchId)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        searchFilter === search.searchId
                          ? 'bg-indigo-500/20 text-indigo-400'
                          : 'text-slate-400 hover:bg-[#1a1a2e]'
                      }`}
                    >
                      {search.keyword} ({search.insightCount})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 选题洞察列表 */}
            <div className="bg-[#16162a] rounded-2xl border border-[#2d2d44]">
              <div className="p-4 border-b border-[#2d2d44] flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  选题洞察库
                  <span className="text-sm font-normal text-slate-500">
                    ({filteredInsights.length} 条可用)
                  </span>
                </h3>
                <button
                  onClick={fetchData}
                  className="text-sm text-slate-400 hover:text-indigo-400 flex items-center gap-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  刷新
                </button>
              </div>

              {filteredInsights.length === 0 ? (
                <div className="p-12 text-center">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                  <p className="text-slate-400">暂无选题洞察</p>
                  <p className="text-sm text-slate-500 mt-2">
                    前往「选题分析」页面搜索关键词，生成选题洞察
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#2d2d44] max-h-[600px] overflow-y-auto">
                  {filteredInsights.map((insight) => {
                    const isExpanded = expandedId === insight.id;
                    const isSelected = selectedInsight?.id === insight.id;

                    return (
                      <div
                        key={insight.id}
                        className={`p-4 transition-colors cursor-pointer ${
                          isSelected ? 'bg-indigo-500/10' : 'hover:bg-[#1a1a2e]'
                        }`}
                        onClick={() => setSelectedInsight(insight)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded-full">
                                {insight.keyword}
                              </span>
                              <span className="text-xs text-slate-500">
                                {formatDate(insight.createdAt)}
                              </span>
                            </div>
                            <h4 className="font-medium text-slate-200 flex items-center gap-2">
                              {isSelected && (
                                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                              )}
                              {insight.title}
                            </h4>
                            <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                              {insight.description}
                            </p>

                            {isExpanded && (
                              <div className="mt-3 pt-3 border-t border-[#2d2d44] space-y-3">
                                {insight.evidence && (
                                  <div>
                                    <span className="text-xs font-medium text-slate-500">数据支撑</span>
                                    <p className="text-sm text-slate-400 mt-1">{insight.evidence}</p>
                                  </div>
                                )}
                                {insight.suggestedTopics.length > 0 && (
                                  <div>
                                    <span className="text-xs font-medium text-slate-500">推荐选题方向</span>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                      {insight.suggestedTopics.map((topic: string, i: number) => (
                                        <span
                                          key={i}
                                          className="px-2 py-1 text-xs bg-purple-500/20 text-purple-300 rounded-full"
                                        >
                                          {topic}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {insight.relatedArticles.length > 0 && (
                                  <div>
                                    <span className="text-xs font-medium text-slate-500">相关文章</span>
                                    <ul className="mt-1 space-y-1">
                                      {insight.relatedArticles.slice(0, 3).map((article: string, i: number) => (
                                        <li key={i} className="text-xs text-slate-500 truncate">
                                          • {article}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedId(isExpanded ? null : insight.id);
                            }}
                            className="p-1 text-slate-500 hover:text-slate-300"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 右侧：创作面板 */}
          <div className="space-y-6">
            {/* 创作设置 */}
            <div className="bg-[#16162a] rounded-2xl p-6 border border-[#2d2d44]">
              <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <PenTool className="w-5 h-5 text-indigo-400" />
                创作设置
              </h3>

              {selectedInsight ? (
                <div className="space-y-4">
                  {/* 选中的洞察 */}
                  <div className="p-3 bg-[#1a1a2e] rounded-xl border border-indigo-500/30">
                    <div className="text-xs text-indigo-400 mb-1">已选择洞察</div>
                    <div className="text-sm text-slate-200 font-medium">
                      {selectedInsight.title}
                    </div>
                  </div>

                  {/* 自定义标题 */}
                  <div>
                    <label className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                      <input
                        type="checkbox"
                        checked={useCustomTitle}
                        onChange={(e) => setUseCustomTitle(e.target.checked)}
                        className="rounded border-slate-600 bg-[#1a1a2e] text-indigo-500 focus:ring-indigo-500"
                      />
                      自定义文章标题
                    </label>
                    {useCustomTitle && (
                      <input
                        type="text"
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                        placeholder="输入自定义标题..."
                        className="w-full px-3 py-2 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    )}
                  </div>

                  {/* 写作风格 */}
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">写作风格</label>
                    <div className="space-y-2">
                      {styleOptions.map((option) => (
                        <label
                          key={option.value}
                          className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                            style === option.value
                              ? 'bg-indigo-500/20 border border-indigo-500/30'
                              : 'bg-[#1a1a2e] border border-transparent hover:border-[#2d2d44]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="style"
                            value={option.value}
                            checked={style === option.value}
                            onChange={(e) => setStyle(e.target.value as WritingStyle)}
                            className="mt-1 border-slate-600 bg-[#1a1a2e] text-indigo-500 focus:ring-indigo-500"
                          />
                          <div>
                            <div className="text-sm font-medium text-slate-200">{option.label}</div>
                            <div className="text-xs text-slate-500">{option.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 功能说明 */}
                  <div className="p-3 bg-[#1a1a2e] rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <ImageIcon className="w-4 h-4 text-emerald-400" />
                      自动从 Unsplash 获取配图并插入文章
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <FileText className="w-4 h-4 text-amber-400" />
                      生成 1500-2500 字高质量文章
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Zap className="w-4 h-4 text-purple-400" />
                      AI 智能优化标题和结构
                    </div>
                  </div>

                  {/* 生成按钮和进度显示 */}
                  {generating && generateProgress ? (
                    <div className="space-y-3">
                      {/* 进度条 */}
                      <div className="w-full bg-[#1a1a2e] rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 ease-out"
                          style={{ width: `${generateProgress.progress}%` }}
                        />
                      </div>
                      {/* 进度信息 */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                          <span>{generateProgress.message}</span>
                        </div>
                        <span className="text-slate-500">{generateProgress.progress}%</span>
                      </div>
                      {/* 步骤指示器 */}
                      <div className="flex items-center justify-between px-2">
                        <div className={`flex flex-col items-center gap-1 ${generateProgress.step === 'validating' ? 'text-indigo-400' : generateProgress.progress > 10 ? 'text-emerald-400' : 'text-slate-600'}`}>
                          <div className={`w-2 h-2 rounded-full ${generateProgress.step === 'validating' ? 'bg-indigo-400 animate-pulse' : generateProgress.progress > 10 ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                          <span className="text-xs">验证</span>
                        </div>
                        <div className={`flex-1 h-0.5 mx-1 ${generateProgress.progress > 10 ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                        <div className={`flex flex-col items-center gap-1 ${generateProgress.step === 'generating' ? 'text-indigo-400' : generateProgress.progress > 60 ? 'text-emerald-400' : 'text-slate-600'}`}>
                          <div className={`w-2 h-2 rounded-full ${generateProgress.step === 'generating' ? 'bg-indigo-400 animate-pulse' : generateProgress.progress > 60 ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                          <span className="text-xs">创作</span>
                        </div>
                        <div className={`flex-1 h-0.5 mx-1 ${generateProgress.progress > 60 ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                        <div className={`flex flex-col items-center gap-1 ${generateProgress.step === 'fetching_images' ? 'text-indigo-400' : generateProgress.progress > 85 ? 'text-emerald-400' : 'text-slate-600'}`}>
                          <div className={`w-2 h-2 rounded-full ${generateProgress.step === 'fetching_images' ? 'bg-indigo-400 animate-pulse' : generateProgress.progress > 85 ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                          <span className="text-xs">配图</span>
                        </div>
                        <div className={`flex-1 h-0.5 mx-1 ${generateProgress.progress > 85 ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                        <div className={`flex flex-col items-center gap-1 ${generateProgress.step === 'saving' || generateProgress.step === 'completed' ? 'text-indigo-400' : 'text-slate-600'}`}>
                          <div className={`w-2 h-2 rounded-full ${generateProgress.step === 'saving' ? 'bg-indigo-400 animate-pulse' : generateProgress.step === 'completed' ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                          <span className="text-xs">保存</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleGenerate}
                      disabled={generating}
                      className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                    >
                      <Sparkles className="w-5 h-5" />
                      一键 AI 创作
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                  <p className="text-slate-400">请从左侧选择一个选题洞察</p>
                  <p className="text-sm text-slate-500 mt-2">
                    点击洞察卡片即可选中
                  </p>
                </div>
              )}
            </div>

            {/* 快速入口 */}
            <div className="bg-[#16162a] rounded-2xl p-6 border border-[#2d2d44]">
              <h3 className="text-sm font-medium text-slate-400 mb-3">快速入口</h3>
              <div className="space-y-2">
                <a
                  href="/"
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#1a1a2e] hover:bg-[#1e1e38] transition-colors"
                >
                  <Search className="w-5 h-5 text-indigo-400" />
                  <div>
                    <div className="text-sm text-slate-200">选题分析</div>
                    <div className="text-xs text-slate-500">搜索关键词，发现新选题</div>
                  </div>
                </a>
                <a
                  href="/articles"
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#1a1a2e] hover:bg-[#1e1e38] transition-colors"
                >
                  <FileText className="w-5 h-5 text-emerald-400" />
                  <div>
                    <div className="text-sm text-slate-200">发布管理</div>
                    <div className="text-xs text-slate-500">管理已生成的文章</div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
