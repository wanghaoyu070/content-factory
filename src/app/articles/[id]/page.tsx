'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import LoginPrompt from '@/components/ui/LoginPrompt';
import { useLoginGuard } from '@/hooks/useLoginGuard';
import { ArrowLeft, Save, Send, Image as ImageIcon, Plus, X, Bold, Italic, List, Heading1, Heading2, Loader2, Maximize2, Minimize2, Quote, Code, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { ImageUploadModal } from '@/components/ui/ImageUploadModal';
import { XhsTagsManager } from '@/components/editor/XhsTagsManager';
import { XhsContentChecker } from '@/components/editor/XhsContentChecker';

type ArticleStatus = 'draft' | 'pending_review' | 'approved' | 'published' | 'failed';

const statusConfig: Record<ArticleStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: '草稿', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  pending_review: { label: '待审核', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  approved: { label: '已审核', color: 'text-green-600', bgColor: 'bg-green-100' },
  published: { label: '已发布', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  failed: { label: '发布失败', color: 'text-red-600', bgColor: 'bg-red-100' },
};

interface Article {
  id: string;
  title: string;
  content: string;
  coverImage: string;
  images: string[];
  status: ArticleStatus;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export default function ArticleEditPage() {
  const params = useParams();
  const router = useRouter();
  const { ensureLogin, isAuthenticated, status: sessionStatus } = useLoginGuard('请登录后编辑文章');
  const isNew = params.id === 'new';

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
            <div className="space-y-4">
              {/* Article Info */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="font-medium text-slate-800 mb-4">文章信息</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">状态</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${statusConfig[status].bgColor} ${statusConfig[status].color}`}>
                      {statusConfig[status].label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">来源</span>
                    <span className="text-slate-700 text-right max-w-[150px] truncate" title={source}>
                      {source || '手动创建'}
                    </span>
                  </div>
                  {article && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">创建时间</span>
                        <span className="text-slate-700">{new Date(article.createdAt).toLocaleDateString('zh-CN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">更新时间</span>
                        <span className="text-slate-700">{new Date(article.updatedAt).toLocaleDateString('zh-CN')}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Images */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="font-medium text-slate-800 mb-4">图片管理</h3>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {images.map((img, index) => (
                    <div key={index} className="relative group">
                      <img src={img} alt="" className="w-full h-16 object-cover rounded-lg" />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setShowImageModal(true)}
                  className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  添加图片
                </button>
              </div>

              {/* 小红书标签管理 */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="font-medium text-slate-800 mb-4 flex items-center gap-2">
                  <span className="text-red-500">📕</span>
                  小红书标签
                </h3>
                <XhsTagsManager
                  tags={xhsTags}
                  onChange={setXhsTags}
                  className="[&_*]:!bg-transparent [&_input]:!bg-slate-50 [&>div:first-child]:!bg-slate-50 [&>div:first-child]:!border-slate-200 [&_span]:!text-slate-600 [&_p]:!text-slate-500 [&>div:last-child]:!bg-slate-50"
                />
              </div>

              {/* 小红书字数检测 */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="font-medium text-slate-800 mb-4 flex items-center gap-2">
                  <span className="text-red-500">📏</span>
                  小红书字数检测
                </h3>
                <XhsContentChecker
                  content={content}
                  className="[&_div]:!bg-slate-50 [&_div]:!border-slate-200 [&_p]:!text-slate-500"
                />
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="font-medium text-slate-800 mb-4">快捷操作</h3>
                <div className="space-y-2">
                  {status === 'draft' && (
                    <button
                      onClick={() => handleSave('pending_review')}
                      disabled={saving}
                      className="w-full py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm disabled:opacity-50"
                    >
                      提交审核
                    </button>
                  )}
                  {status === 'pending_review' && (
                    <button
                      onClick={() => handleSave('approved')}
                      disabled={saving}
                      className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm disabled:opacity-50"
                    >
                      通过审核
                    </button>
                  )}
                  {status === 'approved' && (
                    <>
                      <button className="w-full py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm">
                        📕 发布到小红书
                      </button>
                      <button className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm">
                        📗 发布到公众号
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
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
    </div>
  );
}
