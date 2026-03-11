'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import html2pdf from 'html2pdf.js';
import LoginPrompt from '@/components/ui/LoginPrompt';
import { useLoginGuard } from '@/hooks/useLoginGuard';
import { ArrowLeft, Save, Loader2, Copy, Monitor, Smartphone, Palette, Download, FileText, FileDown, ImagePlus, Table, SeparatorHorizontal, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import EditorPanel from '@/components/cockpit/EditorPanel';
import PreviewPanel from '@/components/cockpit/PreviewPanel';
import { md, preprocessMarkdown, applyTheme } from '@/lib/cockpit/markdown';
import { makeWeChatCompatible } from '@/lib/cockpit/wechatCompat';
import { resolveMarkdownImageRefs, resolveAllImageRefs } from '@/lib/cockpit/imageStore';
import { addImage } from '@/lib/cockpit/imageStore';
import { DEFAULT_ARTICLE_TEMPLATE } from '@/lib/cockpit/defaultTemplate';
import ThemePickerModal from '@/components/cockpit/ThemePickerModal';
import Tooltip from '@/components/cockpit/Tooltip';
import type { Article, ArticleStatus } from '@/types';
import '@/app/cockpit.css';

export default function ArticleEditPage() {
  const params = useParams();
  const router = useRouter();
  const { ensureLogin, isAuthenticated, status: sessionStatus } = useLoginGuard('请登录后编辑文章');
  const isNew = params.id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [article, setArticle] = useState<Article | null>(null);
  const [title, setTitle] = useState('');
  const [markdownContent, setMarkdownContent] = useState(DEFAULT_ARTICLE_TEMPLATE);
  const [renderedHtml, setRenderedHtml] = useState('');
  const [status, setStatus] = useState<ArticleStatus>('draft');
  const [activeTheme, setActiveTheme] = useState('claude');
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'pc'>('mobile');
  const [copied, setCopied] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);

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

  // Export HTML download
  const handleExportHtml = () => {
    const resolvedExportHtml = resolveAllImageRefs(renderedHtml);
    const blob = new Blob([resolvedExportHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'Article'}_${new Date().getTime()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export PDF download
  const handleExportPdf = () => {
    if (!previewRef.current) return;
    const element = previewRef.current;
    const opt = {
      margin: 10,
      filename: `${title || 'Article'}_${new Date().getTime()}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm' as const, format: 'a4', orientation: 'portrait' as const }
    };
    const clonedElement = element.cloneNode(true) as HTMLElement;
    const cloneContainer = document.createElement('div');
    cloneContainer.style.background = '#ffffff';
    cloneContainer.appendChild(clonedElement);
    document.body.appendChild(cloneContainer);
    html2pdf().set(opt).from(cloneContainer).save().then(() => {
      document.body.removeChild(cloneContainer);
    });
  };

  // Insert text at cursor position in editor
  const handleInsertAtCursor = (text: string) => {
    const textarea = editorScrollRef.current;
    if (!textarea) {
      setMarkdownContent(prev => prev + '\n' + text + '\n');
      return;
    }
    const pos = textarea.selectionStart;
    const before = markdownContent.substring(0, pos);
    const after = markdownContent.substring(pos);
    const needNewlineBefore = before.length > 0 && !before.endsWith('\n');
    const needNewlineAfter = after.length > 0 && !after.startsWith('\n');
    const finalText = (needNewlineBefore ? '\n' : '') + text + (needNewlineAfter ? '\n' : '');
    updateMarkdown(before + finalText + after);
    const newPos = before.length + finalText.length;
    requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = newPos;
      textarea.focus();
    });
  };

  // Image upload handler
  const handleImageUpload = () => fileInputRef.current?.click();
  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;
    Promise.all(files.map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read image'));
        reader.readAsDataURL(file);
      });
    })).then(dataUrls => {
      const markdownImages = dataUrls
        .filter(Boolean)
        .map((dataUrl, index) => {
          const refUrl = addImage(dataUrl);
          return `![图片${dataUrls.length > 1 ? ` ${index + 1}` : ''}](${refUrl})`;
        })
        .join('\n\n');
      if (markdownImages) handleInsertAtCursor(markdownImages);
    });
    e.target.value = '';
  };

  // Insert table/divider
  const handleInsertTable = () => handleInsertAtCursor('| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |');
  const handleInsertDivider = () => handleInsertAtCursor('---');

  // Clear document — triggers custom confirmation dialog
  const handleClearDocument = () => setShowClearConfirm(true);
  const confirmClearDocument = () => {
    updateMarkdown('');
    setShowClearConfirm(false);
    toast.success('文档已清空');
  };

  // Auto-close export menu after copy
  useEffect(() => {
    if (copied && showExportMenu) {
      const timer = setTimeout(() => setShowExportMenu(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [copied, showExportMenu]);

  // Close export menu on outside click
  useEffect(() => {
    if (!showExportMenu) return;
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showExportMenu]);

  // Close theme panel on outside click
  useEffect(() => {
    if (!showThemePicker) return;
    const handler = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setShowThemePicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showThemePicker]);

  // Load article data
  useEffect(() => {
    if (isNew) { setLoading(false); return; }
    if (!isAuthenticated) return;
    const fetchArticle = async () => {
      try {
        const response = await fetch(`/api/articles/${params.id}`);
        const result = await response.json();
        if (result.success && result.data) {
          const data = result.data;
          setArticle(data);
          setTitle(data.title);

          // Use markdown_content if available; otherwise keep the default template
          if (data.markdown_content) {
            setMarkdownContent(data.markdown_content);
          }
          // If only legacy HTML content exists, keep the default template —
          // raw HTML is unreadable in a Markdown editor

          setStatus(data.status);
          lastSnapshotRef.current = data.markdown_content || data.content || '';
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

    fetchArticle();
  }, [params.id, isNew, isAuthenticated, router]);

  // Track unsaved changes
  useEffect(() => {
    if (!loading && article) {
      const hasChanged = title !== article.title || markdownContent !== (article.markdown_content || article.content);
      setHasUnsavedChanges(hasChanged);
    }
  }, [title, markdownContent, article, loading]);

  // Prevent accidental navigation with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleAutoSave = useCallback(async () => {
    if (!title.trim() || saving) return;
    try {
      const resolvedMd = resolveMarkdownImageRefs(preprocessMarkdown(markdownContent));
      const htmlContent = applyTheme(md.render(resolvedMd), activeTheme);

      const response = await fetch(`/api/articles/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: htmlContent,
          markdown_content: markdownContent,
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
  }, [title, saving, markdownContent, activeTheme, params.id, status]);

  // Auto-save (every 30s)
  useEffect(() => {
    if (isNew || !isAuthenticated || !hasUnsavedChanges) return;
    const autoSaveInterval = setInterval(() => {
      if (hasUnsavedChanges && title.trim() && status === 'draft') {
        handleAutoSave();
      }
    }, 30000);
    return () => clearInterval(autoSaveInterval);
  }, [hasUnsavedChanges, title, status, isAuthenticated, isNew, handleAutoSave]);

  const handleSave = async (newStatus?: ArticleStatus) => {
    if (!ensureLogin()) return;
    if (!title.trim()) { toast.error('请输入文章标题'); return; }

    setSaving(true);
    try {
      const resolvedMd = resolveMarkdownImageRefs(preprocessMarkdown(markdownContent));
      const htmlContent = applyTheme(md.render(resolvedMd), activeTheme);

      const response = await fetch(`/api/articles/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: htmlContent,
          markdown_content: markdownContent,
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

  // Device width / grid layout helpers — from Deep Read
  const deviceWidthClass = () => {
    if (previewDevice === 'mobile') return 'w-[520px] max-w-full';
    return 'w-[840px] xl:w-[1024px] max-w-[95%]';
  };

  const gridLayoutClass = () => {
    if (previewDevice === 'mobile') return 'md:grid-cols-[55fr_45fr]';
    return 'md:grid-cols-[38.2fr_61.8fr]';
  };

  // Auth guard
  if (sessionStatus !== 'loading' && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="h-14 flex items-center px-5 bg-white border-b border-black/[0.04]">
          <Link href="/articles" className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors">
            <ArrowLeft className="w-4 h-4" /> 返回
          </Link>
        </header>
        <div className="p-6"><LoginPrompt description="登录后即可查看和编辑你的文章" /></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="h-14 flex items-center px-5 bg-white border-b border-black/[0.04]">
          <span className="text-sm text-slate-400">加载中...</span>
        </header>
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }



  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-[#000000] overflow-hidden">
      {/* Header — migrated from Deep Read pattern */}
      <header className="h-16 border-b border-black/[0.04] dark:border-[#ffffff08] flex items-center px-6 justify-between flex-shrink-0 bg-white dark:bg-[#1c1c1e] z-50">
        <div className="flex items-center gap-4">
          <Link
            href="/articles"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-black/[0.04] transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入文章标题..."
              className="text-base font-bold tracking-tight focus:outline-none text-slate-800 dark:text-white placeholder-slate-300 dark:placeholder-[#6e6e73] bg-transparent w-[280px]"
            />
            <div className="text-[11px] text-slate-400 dark:text-[#a1a1a6] mt-0.5">
              {hasUnsavedChanges ? (
                <span className="flex items-center gap-1 text-amber-500">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                  未保存
                </span>
              ) : lastSavedAt ? (
                <span>已保存 {lastSavedAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Toolbar: Insert Image */}
          <Tooltip label="插入图片">
            <button onClick={handleImageUpload} className="header-dock-item">
              <ImagePlus size={18} />
            </button>
          </Tooltip>
          {/* Toolbar: Insert Table */}
          <Tooltip label="插入表格">
            <button onClick={handleInsertTable} className="header-dock-item">
              <Table size={18} />
            </button>
          </Tooltip>
          {/* Toolbar: Insert Divider */}
          <Tooltip label="插入分割线">
            <button onClick={handleInsertDivider} className="header-dock-item">
              <SeparatorHorizontal size={18} />
            </button>
          </Tooltip>
          {/* Toolbar: Clear Document */}
          <Tooltip label="清空文档">
            <button onClick={handleClearDocument} className="header-dock-item danger">
              <Trash2 size={18} />
            </button>
          </Tooltip>

          <div className="h-4 w-[1px] bg-slate-200 dark:bg-[#ffffff15] mx-1" />

          {/* Theme selector — Deep Read Palette icon */}
          <div ref={themeRef}>
            <Tooltip label="排版风格" disabled={showThemePicker}>
              <button
                onClick={() => setShowThemePicker(!showThemePicker)}
                className={`header-dock-item ${showThemePicker ? '!bg-slate-200 dark:!bg-white/15 !text-slate-800 dark:!text-white' : ''}`}
              >
                <Palette size={18} />
              </button>
            </Tooltip>
          </div>

          <Tooltip label="下载导出" disabled={showExportMenu}>
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className={`header-dock-item ${showExportMenu ? '!bg-slate-200 dark:!bg-white/15 !text-slate-800 dark:!text-white' : ''}`}
              >
                <Download size={18} />
              </button>
              <AnimatePresence>
                {showExportMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                    className="absolute right-0 top-full mt-2 w-[200px] bg-white dark:bg-[#2c2c2e] rounded-xl shadow-2xl border border-black/[0.08] dark:border-white/[0.08] overflow-hidden z-[200]"
                  >
                    <div className="p-1.5">
                      <button
                        onClick={() => { handleCopyToWechat(); }}
                        disabled={isCopying}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:translate-x-1 hover:scale-[1.02] active:scale-[0.97] transition-all duration-200"
                        style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                      >
                        {copied ? <CheckCircle2 size={16} className="text-green-500" /> : isCopying ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
                        {copied ? '已复制！' : '复制到公众号'}
                      </button>
                      <div className="h-[1px] bg-black/[0.04] dark:bg-white/[0.06] mx-2 my-1" />
                      <button
                        onClick={() => { handleExportHtml(); setShowExportMenu(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:translate-x-1 hover:scale-[1.02] active:scale-[0.97] transition-all duration-200"
                        style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                      >
                        <FileText size={16} />
                        导出 HTML
                      </button>
                      <button
                        onClick={() => { handleExportPdf(); setShowExportMenu(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:translate-x-1 hover:scale-[1.02] active:scale-[0.97] transition-all duration-200"
                        style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                      >
                        <FileDown size={16} />
                        导出 PDF
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Tooltip>

          {/* Device switcher — from Deep Read Header */}
          <div className="flex items-center bg-black/[0.04] dark:bg-white/[0.06] rounded-[12px] p-[3px] ml-1 gap-[2px]">
            <button
              onClick={() => setPreviewDevice('mobile')}
              className={`w-8 h-8 flex items-center justify-center rounded-[9px] transition-all duration-200 active:scale-95 ${previewDevice === 'mobile'
                ? 'bg-white dark:bg-[#2c2c2e] text-black dark:text-white shadow-sm'
                : 'text-[#86868b] dark:text-[#a1a1a6] hover:text-black dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.08]'
                }`}
            >
              <Smartphone size={15} />
            </button>
            <button
              onClick={() => setPreviewDevice('pc')}
              className={`w-8 h-8 flex items-center justify-center rounded-[9px] transition-all duration-200 active:scale-95 ${previewDevice === 'pc'
                ? 'bg-white dark:bg-[#2c2c2e] text-black dark:text-white shadow-sm'
                : 'text-[#86868b] dark:text-[#a1a1a6] hover:text-black dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.08]'
                }`}
            >
              <Monitor size={15} />
            </button>
          </div>

          <div className="h-4 w-[1px] bg-slate-200 dark:bg-[#ffffff15] mx-1" />

          {/* Save */}
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-800 text-white hover:bg-slate-700 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存
          </button>
        </div>
      </header>

      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onFileSelected}
      />

      {/* Clear Document Confirmation Dialog — from Deep Read */}
      <AnimatePresence>
        {showClearConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/10 dark:bg-black/30"
              onClick={() => setShowClearConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-2xl border border-black/[0.06] dark:border-white/[0.06] z-50 overflow-hidden p-5"
            >
              <div className="flex flex-col gap-3">
                <span className="text-[14px] font-semibold text-black dark:text-white">
                  确定清空当前内容？
                </span>
                <span className="text-[13px] text-[#86868b] dark:text-[#a1a1a6] leading-relaxed">
                  清空后内容将无法恢复，此操作不可撤销。
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 py-2 rounded-lg text-[13px] font-medium bg-black/[0.04] dark:bg-white/[0.06] text-black dark:text-white hover:bg-black/[0.08] dark:hover:bg-white/[0.1] transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={confirmClearDocument}
                    className="flex-1 py-2 rounded-lg text-[13px] font-semibold bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    确定清空
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Theme Picker Panel */}
      <ThemePickerModal
        isOpen={showThemePicker}
        onClose={() => setShowThemePicker(false)}
        activeTheme={activeTheme}
        onSelectTheme={(id) => {
          setActiveTheme(id);
          setShowThemePicker(false);
        }}
      />

      {/* Main Workspace: Editor + Preview — Grid layout from Deep Read */}
      <main className={`flex-1 overflow-hidden grid grid-cols-1 ${gridLayoutClass()} relative transition-all duration-500`}>
        {/* Left: Markdown Editor */}
        <div className="flex flex-col overflow-hidden border-r border-black/[0.04] dark:border-[#ffffff08] bg-white dark:bg-[#1c1c1e]">
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

        {/* Right: Preview */}
        <div className="flex flex-col overflow-hidden">
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
      </main>


    </div>
  );
}
