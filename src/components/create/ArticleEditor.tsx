'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useCallback, useState } from 'react';
import EditorToolbar from './EditorToolbar';
import ImageGallery from './ImageGallery';
import AIAssistToolbar from './AIAssistToolbar';

interface ArticleEditorProps {
  title: string;
  content: string;
  images: string[];
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onSave?: () => void;
}

interface AIToolbarState {
  visible: boolean;
  selectedText: string;
  position: { x: number; y: number };
}

export default function ArticleEditor({
  title,
  content,
  images,
  onTitleChange,
  onContentChange,
  onSave,
}: ArticleEditorProps) {
  // AI 工具栏状态
  const [aiToolbar, setAiToolbar] = useState<AIToolbarState>({
    visible: false,
    selectedText: '',
    position: { x: 0, y: 0 },
  });

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'article-image',
          style: 'max-width: 100%; height: auto; border-radius: 8px; margin: 16px 0;',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[#333] hover:text-[#444] underline',
        },
      }),
      Underline,
      Placeholder.configure({
        placeholder: '开始写作...',
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onContentChange(editor.getHTML());
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      const text = editor.state.doc.textBetween(from, to, ' ');

      // 如果选中了文本（至少10个字符），显示 AI 工具栏
      if (text.length >= 10) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();

          setAiToolbar({
            visible: true,
            selectedText: text,
            position: { x: rect.left, y: rect.bottom },
          });
        }
      } else {
        setAiToolbar((prev) => ({ ...prev, visible: false }));
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[400px] p-6',
      },
    },
  });

  // 当外部content变化时更新编辑器内容
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // 插入图片到编辑器
  const insertImage = useCallback((imageUrl: string) => {
    if (editor) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
    }
  }, [editor]);

  // 计算字数
  const getWordCount = () => {
    if (!editor) return 0;
    return editor.getText().length;
  };

  // 计算已使用的图片数量
  const getUsedImageCount = () => {
    if (!editor) return 0;
    const html = editor.getHTML();
    const imgMatches = html.match(/<img[^>]*>/g);
    return imgMatches ? imgMatches.length : 0;
  };

  // 替换选中的文本
  const handleAIReplace = useCallback((newText: string) => {
    if (editor) {
      const { from, to } = editor.state.selection;
      editor.chain().focus().deleteRange({ from, to }).insertContent(newText).run();
    }
  }, [editor]);

  // 关闭 AI 工具栏
  const handleCloseAIToolbar = useCallback(() => {
    setAiToolbar((prev) => ({ ...prev, visible: false }));
  }, []);

  // 点击编辑器外部时关闭工具栏
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.ai-assist-toolbar') && !target.closest('.ProseMirror')) {
        setAiToolbar((prev) => ({ ...prev, visible: false }));
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* 标题输入 */}
      <div className="p-4 border-b border-[rgba(0,0,0,0.06)]">
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="请输入文章标题..."
          className="w-full px-4 py-3 bg-[#F7F6F0] border border-[rgba(0,0,0,0.06)] rounded-xl text-[#1A1A1A] placeholder-[#999] focus:outline-none focus:ring-2 focus:ring-[rgba(0,0,0,0.1)] text-lg font-medium"
        />
      </div>

      {/* 编辑器工具栏 */}
      <EditorToolbar editor={editor} onInsertImage={() => { }} />

      {/* 编辑器内容区域 */}
      <div className="flex-1 overflow-y-auto bg-white relative">
        <EditorContent editor={editor} />

        {/* AI 助手工具栏 */}
        {aiToolbar.visible && aiToolbar.selectedText && (
          <div className="ai-assist-toolbar">
            <AIAssistToolbar
              selectedText={aiToolbar.selectedText}
              position={aiToolbar.position}
              onReplace={handleAIReplace}
              onClose={handleCloseAIToolbar}
            />
          </div>
        )}
      </div>

      {/* 配图库 */}
      <ImageGallery
        images={images}
        usedCount={getUsedImageCount()}
        onInsertImage={insertImage}
      />

      {/* 底部状态栏 */}
      <div className="px-4 py-3 border-t border-[rgba(0,0,0,0.06)] bg-[#F7F6F0] flex items-center justify-between text-sm">
        <div className="flex items-center gap-4 text-[#666]">
          <span>字数: {getWordCount()}</span>
          <span>图片: {getUsedImageCount()}/{images.length}</span>
          <span className="text-xs text-[#999]">💡 选中10+字符可使用 AI 助手</span>
        </div>
        {onSave && (
          <button
            onClick={onSave}
            className="px-3 py-1 text-xs bg-[rgba(0,0,0,0.06)] text-[#333] rounded-lg hover:bg-indigo-500/30 transition-colors"
          >
            手动保存
          </button>
        )}
      </div>
    </div>
  );
}
