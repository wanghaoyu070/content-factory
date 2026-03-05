'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import LoginPrompt from '@/components/ui/LoginPrompt';
import { useLoginGuard } from '@/hooks/useLoginGuard';
import { usePublish } from '@/hooks/usePublish';
import { ArrowLeft, Save, Loader2, Copy, Check, Monitor, Smartphone, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { ImageUploadModal } from '@/components/ui/ImageUploadModal';
import { WechatPublishModal, XiaohongshuPublishModal } from '@/components/articles';
import { SettingsPanel } from '@/components/articles/SettingsPanel';
import EditorPanel from '@/components/cockpit/EditorPanel';
import PreviewPanel from '@/components/cockpit/PreviewPanel';
import { md, preprocessMarkdown, applyTheme } from '@/lib/cockpit/markdown';
import { makeWeChatCompatible } from '@/lib/cockpit/wechatCompat';
import { resolveMarkdownImageRefs, resolveAllImageRefs } from '@/lib/cockpit/imageStore';
import type { Article, ArticleStatus } from '@/types';
import '@/app/cockpit.css';

const statusConfig: Record<ArticleStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: '草稿', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  pending_review: { label: '待审核', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  approved: { label: '已审核', color: 'text-green-600', bgColor: 'bg-green-100' },
  published: { label: '已发布', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  failed: { label: '发布失败', color: 'text-red-600', bgColor: 'bg-red-100' },
  archived: { label: '已归档', color: 'text-[#999]', bgColor: 'bg-slate-100' },
};

// Available themes from the Cockpit theme system
const THEME_OPTIONS = [
  { id: 'claude', label: 'Classic' },
  { id: 'modern', label: 'Modern' },
  { id: 'extra', label: 'Extra' },
];

export default function ArticleEditPage() {
  const params = useParams();
  const router = useRouter();
  const { ensureLogin, isAuthenticated, status: sessionStatus } = useLoginGuard('请登录后编辑文章');
  const isNew = params.id === 'new';

  // Publish hooks
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
  const [markdownContent, setMarkdownContent] = useState('');
  const [renderedHtml, setRenderedHtml] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [status, setStatus] = useState<ArticleStatus>('draft');
  const [source, setSource] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [xhsTags, setXhsTags] = useState<string[]>([]);
  const [activeTheme, setActiveTheme] = useState('claude');
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'pc'>('mobile');
  const [copied, setCopied] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  // Auto-save state
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Editor refs for scroll sync
  const editorScrollRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewOuterScrollRef = useRef<HTMLDivElement>(null);
  const previewInnerScrollRef = useRef<HTMLDivElement>(null);
  const scrollSyncLockRef = useRef<'editor' | 'preview' | null>(null);
  const scrollLockReleaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Undo/Redo history
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSnapshotRef = useRef<string>('');

  // Wrap setMarkdownContent to record undo history (debounced)
  const updateMarkdown = useCallback((value: string) => {
    setMarkdownContent(value);
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    historyTimerRef.current = setTimeout(() => {
      if (lastSnapshotRef.current !== value) {
        undoStackRef.current.push(lastSnapshotRef.current);
        if (undoStackRef.current.length > 100) undoStackRef.current.shift();
        redoStackRef.current = [];
        lastSnapshotRef.current = value;
      }
    }, 500);
  }, []);

  const handleUndo = useCallback(() => {
    if (historyTimerRef.current) {
      clearTimeout(historyTimerRef.current);
      historyTimerRef.current = null;
      const currentValue = editorScrollRef.current?.value ?? markdownContent;
      if (lastSnapshotRef.current !== currentValue) {
        undoStackRef.current.push(lastSnapshotRef.current);
        lastSnapshotRef.current = currentValue;
      }
    }
    if (undoStackRef.current.length === 0) return;
    const prev = undoStackRef.current.pop()!;
    redoStackRef.current.push(lastSnapshotRef.current);
    lastSnapshotRef.current = prev;
    setMarkdownContent(prev);
  }, [markdownContent]);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current.pop()!;
    undoStackRef.current.push(lastSnapshotRef.current);
    lastSnapshotRef.current = next;
    setMarkdownContent(next);
  }, []);

  // Markdown → HTML rendering
  useEffect(() => {
    const resolvedMarkdown = resolveMarkdownImageRefs(preprocessMarkdown(markdownContent));
    const rawHtml = md.render(resolvedMarkdown);
    const styledHtml = applyTheme(rawHtml, activeTheme);
    setRenderedHtml(styledHtml);
  }, [markdownContent, activeTheme]);

  // Scroll sync cleanup
  useEffect(() => {
    return () => {
      if (scrollLockReleaseTimeoutRef.current) {
        clearTimeout(scrollLockReleaseTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    scrollSyncLockRef.current = null;
    if (scrollLockReleaseTimeoutRef.current) {
      clearTimeout(scrollLockReleaseTimeoutRef.current);
      scrollLockReleaseTimeoutRef.current = null;
    }
  }, [previewDevice]);

  // Scroll sync logic
  const syncScrollPosition = (
    sourceElement: HTMLElement,
    targetElement: HTMLElement,
    sourcePanel: 'editor' | 'preview'
  ) => {
    if (scrollSyncLockRef.current && scrollSyncLockRef.current !== sourcePanel) return;
    const sourceMaxScroll = sourceElement.scrollHeight - sourceElement.clientHeight;
    const targetMaxScroll = targetElement.scrollHeight - targetElement.clientHeight;
    if (sourceMaxScroll <= 0) { targetElement.scrollTop = 0; return; }
    const scrollRatio = sourceElement.scrollTop / sourceMaxScroll;
    scrollSyncLockRef.current = sourcePanel;
    targetElement.scrollTop = scrollRatio * Math.max(targetMaxScroll, 0);
    if (scrollLockReleaseTimeoutRef.current) clearTimeout(scrollLockReleaseTimeoutRef.current);
    scrollLockReleaseTimeoutRef.current = setTimeout(() => {
      if (scrollSyncLockRef.current === sourcePanel) scrollSyncLockRef.current = null;
      scrollLockReleaseTimeoutRef.current = null;
    }, 50);
  };

  const getActivePreviewScrollElement = () => {
    if (previewDevice === 'pc') return previewOuterScrollRef.current;
    return previewInnerScrollRef.current;
  };

  const handleEditorScroll = () => {
    const editorElement = editorScrollRef.current;
    const previewElement = getActivePreviewScrollElement();
    if (!editorElement || !previewElement) return;
    syncScrollPosition(editorElement, previewElement, 'editor');
  };

  const handlePreviewOuterScroll = () => {
    if (previewDevice !== 'pc') return;
    const previewElement = previewOuterScrollRef.current;
    const editorElement = editorScrollRef.current;
    if (!previewElement || !editorElement) return;
    syncScrollPosition(previewElement, editorElement, 'preview');
  };

  const handlePreviewInnerScroll = () => {
    if (previewDevice === 'pc') return;
    const previewElement = previewInnerScrollRef.current;
    const editorElement = editorScrollRef.current;
    if (!previewElement || !editorElement) return;
    syncScrollPosition(previewElement, editorElement, 'preview');
  };

  // Copy to WeChat clipboard
  const handleCopyToWechat = async () => {
    if (!previewRef.current) return;
    setIsCopying(true);
    try {
      const resolvedHtml = resolveAllImageRefs(renderedHtml);
      const finalHtml = await makeWeChatCompatible(resolvedHtml, activeTheme);
      const blob = new Blob([finalHtml], { type: 'text/html' });
      const textBlob = new Blob([previewRef.current.innerText], { type: 'text/plain' });
      const clipboardItem = new ClipboardItem({ 'text/html': blob, 'text/plain': textBlob });
      await navigator.clipboard.write([clipboardItem]);
      setCopied(true);
      toast.success('已复制微信格式');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed', err);
      toast.error('复制失败，请检查浏览器剪贴板权限');
    } finally {
      setIsCopying(false);
    }
  };

  // Load article data
  useEffect(() => {
    if (isNew) { setLoading(false); return; }
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

        // If article has markdown_content, use it; otherwise convert HTML to markdown display
        if (data.markdown_content) {
          setMarkdownContent(data.markdown_content);
        } else if (data.content) {
          // Legacy HTML content — display as-is for now, user can re-edit
          // For a better experience, we could use Turndown here
          setMarkdownContent(data.content);
        }

        setImages(data.images || []);
        setStatus(data.status);
        setSource(data.source);
        lastSnapshotRef.current = data.markdown_content || data.content || '';
        if (data.xhsTags) {
          try {
            setXhsTags(typeof data.xhsTags === 'string' ? JSON.parse(data.xhsTags) : data.xhsTags);
          } catch { setXhsTags([]); }
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

  // Auto-save (every 30s)
  useEffect(() => {
    if (isNew || !isAuthenticated || !hasUnsavedChanges) return;
    const autoSaveInterval = setInterval(() => {
      if (hasUnsavedChanges && title.trim() && status === 'draft') {
        handleAutoSave();
      }
    }, 30000);
    return () => clearInterval(autoSaveInterval);
  }, [hasUnsavedChanges, title, status, isAuthenticated, isNew]);

  // Track unsaved changes
  useEffect(() => {
    if (!loading && article) {
      const hasChanged = title !== article.title || markdownContent !== (article.markdown_content || article.content);
      setHasUnsavedChanges(hasChanged);
    }
  }, [title, markdownContent, article, loading]);

  const handleAutoSave = async () => {
    if (!title.trim() || saving) return;
    try {
      // Render HTML for storage
      const resolvedMd = resolveMarkdownImageRefs(preprocessMarkdown(markdownContent));
      const htmlContent = applyTheme(md.render(resolvedMd), activeTheme);

      const response = await fetch(`/api/articles/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: htmlContent,
          markdown_content: markdownContent,
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
    if (!title.trim()) { toast.error('请输入文章标题'); return; }

    setSaving(true);
    try {
      // Render HTML for storage
      const resolvedMd = resolveMarkdownImageRefs(preprocessMarkdown(markdownContent));
      const htmlContent = applyTheme(md.render(resolvedMd), activeTheme);

      const response = await fetch(`/api/articles/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: htmlContent,
          markdown_content: markdownContent,
          images,
          xhsTags: JSON.stringify(xhsTags),
          status: newStatus || status,
        }),
      });
      const result = await response.json();
      if (result.success) {
        if (newStatus) setStatus(newStatus);
        setLastSavedAt(new Date());
        setHasUnsavedChanges(false);
        toast.success('保存成功');
      } else {
        toast.error('保存失败', { description: result.error || '请稍后重试' });
      }
    } catch (err) {
      console.error('保存失败:', err);
      toast.error('保存失败', { description: '网络异常，请稍后重试' });
    } finally {
      setSaving(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // Device width / grid layout helpers
  const deviceWidthClass = () => {
    if (previewDevice === 'mobile') return 'w-[520px] max-w-full';
    return 'w-[840px] xl:w-[1024px] max-w-[95%]';
  };

  // Auth guard
  if (sessionStatus !== 'loading' && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header title="编辑文章" />
        <div className="p-6"><LoginPrompt description="登录后即可查看和编辑你的文章" /></div>
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
          <Link href="/articles" className="inline-flex items-center gap-2 text-[#999] hover:text-slate-700 mb-6">
            <ArrowLeft className="w-4 h-4" /> 返回列表
          </Link>
          <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-200 text-center">
            <p className="text-[#999] mb-4">推荐使用「选题分析」页面的「一键创作」功能生成文章</p>
            <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              前往选题分析
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* Top Header */}
      <Header
        title="编辑文章"
        action={
          <div className="flex items-center gap-2">
            {/* Theme Selector */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
              <Palette className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1" />
              {THEME_OPTIONS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTheme(t.id)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-all ${activeTheme === t.id
                      ? 'bg-white text-slate-800 shadow-sm font-medium'
                      : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Device Toggle */}
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setPreviewDevice('mobile')}
                className={`p-1.5 rounded-md transition-all ${previewDevice === 'mobile' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                title="手机预览"
              >
                <Smartphone className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewDevice('pc')}
                className={`p-1.5 rounded-md transition-all ${previewDevice === 'pc' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                title="PC 预览"
              >
                <Monitor className="w-4 h-4" />
              </button>
            </div>

            {/* Copy to WeChat */}
            <button
              onClick={handleCopyToWechat}
              disabled={isCopying}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${copied
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-800 text-white hover:bg-slate-700'
                }`}
            >
              {isCopying ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : copied ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copied ? '已复制' : '复制微信'}
            </button>

            {/* Save Draft */}
            <button
              onClick={() => handleSave()}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors text-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              保存
            </button>
          </div>
        }
      />

      {/* Sub-header: Title + Save Status */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-slate-200 bg-white">
        <Link href="/articles" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="请输入文章标题..."
          className="flex-1 text-lg font-medium focus:outline-none text-slate-800 placeholder-slate-300"
        />
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {hasUnsavedChanges && (
            <span className="flex items-center gap-1 text-amber-500">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
              未保存
            </span>
          )}
          {lastSavedAt && !hasUnsavedChanges && (
            <span>已保存 {lastSavedAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
          )}
        </div>
      </div>

      {/* Main Workspace: Editor + Preview + Sidebar */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left: Markdown Editor */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200 bg-white min-w-0">
          <EditorPanel
            markdownInput={markdownContent}
            onInputChange={updateMarkdown}
            editorScrollRef={editorScrollRef}
            onEditorScroll={handleEditorScroll}
            scrollSyncEnabled={true}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />
        </div>

        {/* Center: Preview */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <PreviewPanel
            renderedHtml={renderedHtml}
            deviceWidthClass={deviceWidthClass()}
            previewDevice={previewDevice}
            previewRef={previewRef}
            previewOuterScrollRef={previewOuterScrollRef}
            previewInnerScrollRef={previewInnerScrollRef}
            onPreviewOuterScroll={handlePreviewOuterScroll}
            onPreviewInnerScroll={handlePreviewInnerScroll}
            scrollSyncEnabled={true}
            activeTheme={activeTheme}
          />
        </div>

        {/* Right: Settings Sidebar */}
        <div className="w-[280px] flex-shrink-0 overflow-y-auto border-l border-slate-200 bg-white p-4">
          <SettingsPanel
            content={markdownContent}
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
        </div>
      </div>

      {/* Modals */}
      <ImageUploadModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onImageSelect={(url) => setImages([...images, url])}
        existingImages={images}
      />
      <WechatPublishModal
        isOpen={showWechatModal}
        onClose={closeWechatPublishModal}
        onConfirm={publishToWechat}
        accounts={wechatAccounts}
        loadingAccounts={loadingAccounts}
        config={wechatConfig}
        onConfigChange={setWechatConfig}
      />
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
