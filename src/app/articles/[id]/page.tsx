'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import LoginPrompt from '@/components/ui/LoginPrompt';
import { useLoginGuard } from '@/hooks/useLoginGuard';
import { usePublish } from '@/hooks/usePublish';
import { ArrowLeft, Save, Send, Image as ImageIcon, Bold, Italic, List, Heading1, Heading2, Loader2, Maximize2, Minimize2, Quote, Code, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { ImageUploadModal } from '@/components/ui/ImageUploadModal';
import { WechatPublishModal, XiaohongshuPublishModal } from '@/components/articles';
import { ArticleSidebar } from '@/components/articles/ArticleSidebar';
import type { Article, ArticleStatus } from '@/types';

const statusConfig: Record<ArticleStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: '草稿', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  pending_review: { label: '待审核', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  approved: { label: '已审核', color: 'text-green-600', bgColor: 'bg-green-100' },
  published: { label: '已发布', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  failed: { label: '发布失败', color: 'text-red-600', bgColor: 'bg-red-100' },
  archived: { label: '已归档', color: 'text-slate-500', bgColor: 'bg-slate-100' },
};

export default function ArticleEditPage() {
  const params = useParams();
  const router = useRouter();
  const { ensureLogin, isAuthenticated, status: sessionStatus } = useLoginGuard('请登录后编辑文章');
  const isNew = params.id === 'new';

  // 发布相关 hooks
  const {
    wechatAccounts,
    loadingAccounts,
    showWechatModal,
    wechatConfig,
    setWechatConfig,
    openWechatPublishModal,
    closeWechatPublishModal,
    publishToWechat,
    showXhsModal,
    xhsPublishing,
    xhsResult,
    xhsError,
    openXhsPublishModal,
    closeXhsPublishModal,
    publishingId,
  } = usePublish();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [article, setArticle] = useState<Article | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [status, setStatus] = useState<ArticleStatus>('draft');
  const [source, setSource] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);

  // 小红书相关状态
  const [xhsTags, setXhsTags] = useState<string[]>([]);

  // 侧边栏 Tab 状态
  const [sidebarTab, setSidebarTab] = useState<'settings' | 'preview'>('settings');

  // 全屏编辑模式
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 自动保存状态
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 加载文章数据
  useEffect(() => {
    if (isNew) {
      setLoading(false);
      return;
    }
    if (!isAuthenticated) return;
    fetchArticle();
  }, [params.id, isNew, isAuthenticated]);

  const fetchArticle = async () => {
    if (!isAuthenticated) return;
    try {
      const response = await fetch(`/api/articles/${params.id}`);
      const result = await response.json();
      if (result.success && result.data) {
        const data = result.data;
        setArticle(data);
        setTitle(data.title);
        setContent(data.content);
        setImages(data.images || []);
        setStatus(data.status);
        setSource(data.source);
        // 加载小红书标签
        if (data.xhsTags) {
          try {
            setXhsTags(typeof data.xhsTags === 'string' ? JSON.parse(data.xhsTags) : data.xhsTags);
          } catch {
            setXhsTags([]);
          }
        }
      } else {
        toast.error('文章不存在');
        router.push('/articles');
      }
    } catch (err) {
      console.error('加载文章失败:', err);
      toast.error('加载文章失败');
      router.push('/articles');
    } finally {
      setLoading(false);
    }
  };

  // 自动保存（每 30 秒检查一次）
  useEffect(() => {
    if (isNew || !isAuthenticated || !hasUnsavedChanges) return;

    const autoSaveInterval = setInterval(() => {
      if (hasUnsavedChanges && title.trim() && status === 'draft') {
        handleAutoSave();
      }
    }, 30000); // 30 秒

    return () => clearInterval(autoSaveInterval);
  }, [hasUnsavedChanges, title, status, isAuthenticated, isNew]);

  // 监听内容变化
  useEffect(() => {
    if (!loading && article) {
      const hasChanged =
        title !== article.title ||
        content !== article.content;
      setHasUnsavedChanges(hasChanged);
    }
  }, [title, content, article, loading]);

  // 自动保存函数（静默保存）
  const handleAutoSave = async () => {
    if (!title.trim() || saving) return;

    try {
      const response = await fetch(`/api/articles/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          images,
          xhsTags: JSON.stringify(xhsTags),
          status,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setLastSavedAt(new Date());
        setHasUnsavedChanges(false);
      }
    } catch (err) {
      console.error('自动保存失败:', err);
    }
  };

  const handleSave = async (newStatus?: ArticleStatus) => {
    if (!ensureLogin()) return;
    if (!title.trim()) {
      toast.error('请输入文章标题');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/articles/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          images,
          xhsTags: JSON.stringify(xhsTags),
          status: newStatus || status,
        }),
      });

      const result = await response.json();
      if (result.success) {
        if (newStatus) {
          setStatus(newStatus);
        }
        setLastSavedAt(new Date());
        setHasUnsavedChanges(false);
        toast.success('保存成功');
      } else {
        toast.error('保存失败', {
          description: result.error || '请稍后重试',
        });
      }
    } catch (err) {
      console.error('保存失败:', err);
      toast.error('保存失败', {
        description: '网络异常，请稍后重试',
      });
    } finally {
      setSaving(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // 计算纯文本字数
  const getWordCount = () => {
    return content.replace(/<[^>]*>/g, '').length;
  };

  if (sessionStatus !== 'loading' && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header title="编辑文章" />
        <div className="p-6">
          <LoginPrompt description="登录后即可查看和编辑你的文章" />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header title="加载中..." />
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  if (isNew) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header title="新建文章" />
        <div className="p-6">
          <Link href="/articles" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6">
            <ArrowLeft className="w-4 h-4" />
            返回列表
          </Link>
          <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-200 text-center">
            <p className="text-slate-500 mb-4">推荐使用「选题分析」页面的「一键创作」功能生成文章</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              前往选题分析
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header
        title="编辑文章"
        action={
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSave()}
              disabled={saving}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              保存草稿
            </button>
            {status === 'draft' && (
              <button
                onClick={() => handleSave('pending_review')}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                提交审核
              </button>
            )}
          </div>
        }
      />

      <div className="p-6">
        <Link
          href="/articles"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          返回列表
        </Link>

        <div className={isFullscreen ? 'fixed inset-0 z-50 bg-white p-6 overflow-auto' : 'grid grid-cols-3 gap-6'}>
          {/* 全屏模式下的关闭按钮 */}
          {isFullscreen && (
            <div className="fixed top-4 right-4 z-50">
              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-2"
              >
                <Minimize2 className="w-4 h-4" />
                <span className="text-sm">退出全屏</span>
              </button>
            </div>
          )}

          {/* Editor */}
          <div className={isFullscreen ? 'max-w-4xl mx-auto space-y-4' : 'col-span-2 space-y-4'}>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <label className="block text-sm font-medium text-slate-700 mb-2">标题</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="请输入文章标题..."
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Toolbar */}
              <div className="flex items-center justify-between p-3 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-1">
                  <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors" title="标题 1">
                    <Heading1 className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors" title="标题 2">
                    <Heading2 className="w-4 h-4" />
                  </button>
                  <div className="w-px h-5 bg-slate-300 mx-1" />
                  <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors" title="粗体">
                    <Bold className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors" title="斜体">
                    <Italic className="w-4 h-4" />
                  </button>
                  <div className="w-px h-5 bg-slate-300 mx-1" />
                  <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors" title="列表">
                    <List className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors" title="引用">
                    <Quote className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors" title="代码">
                    <Code className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors" title="分割线">
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="w-px h-5 bg-slate-300 mx-1" />
                  <button
                    onClick={() => setShowImageModal(true)}
                    className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors"
                    title="插入图片"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors"
                  title={isFullscreen ? '退出全屏' : '全屏编辑'}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>

              {/* Content */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="开始写作..."
                className={`w-full p-6 focus:outline-none resize-none text-slate-700 leading-relaxed ${isFullscreen ? 'h-[calc(100vh-280px)]' : 'h-96'}`}
              />

              {/* Footer */}
              <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 text-sm text-slate-500 flex items-center justify-between">
                <span>字数统计: {getWordCount()}</span>
                <div className="flex items-center gap-3">
                  {hasUnsavedChanges && (
                    <span className="flex items-center gap-1 text-amber-600">
                      <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                      有未保存的更改
                    </span>
                  )}
                  {lastSavedAt && !hasUnsavedChanges && (
                    <span className="text-slate-400">
                      上次保存: {lastSavedAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - 全屏时隐藏 */}
          {!isFullscreen && (
            <ArticleSidebar
              title={title}
              sidebarTab={sidebarTab}
              setSidebarTab={setSidebarTab}
              content={content}
              article={article}
              source={source}
              status={status}
              statusConfig={statusConfig}
              images={images}
              onRemoveImage={removeImage}
              onAddImageClick={() => setShowImageModal(true)}
              xhsTags={xhsTags}
              onTagsChange={setXhsTags}
              handleSave={handleSave}
              saving={saving}
              openXhsPublishModal={openXhsPublishModal}
              openWechatPublishModal={openWechatPublishModal}
              publishingId={publishingId}
              articleId={params.id as string}
            />
          )}
        </div>
      </div>

      {/* 图片上传模态框 */}
      <ImageUploadModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onImageSelect={(url) => {
          setImages([...images, url]);
        }}
        existingImages={images}
      />

      {/* 微信发布模态框 */}
      <WechatPublishModal
        isOpen={showWechatModal}
        onClose={closeWechatPublishModal}
        onConfirm={publishToWechat}
        accounts={wechatAccounts}
        loadingAccounts={loadingAccounts}
        config={wechatConfig}
        onConfigChange={setWechatConfig}
      />

      {/* 小红书发布模态框 */}
      <XiaohongshuPublishModal
        isOpen={showXhsModal}
        onClose={closeXhsPublishModal}
        isPublishing={xhsPublishing}
        result={xhsResult}
        error={xhsError}
      />
    </div>
  );
}
