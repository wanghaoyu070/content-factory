'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useCallback } from 'react';
import EditorToolbar from './EditorToolbar';
import ImageGallery from './ImageGallery';

interface ArticleEditorProps {
  title: string;
  content: string;
  images: string[];
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onSave?: () => void;
}

export default function ArticleEditor({
  title,
  content,
  images,
  onTitleChange,
  onContentChange,
  onSave,
}: ArticleEditorProps) {
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
          class: 'text-indigo-400 hover:text-indigo-300 underline',
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

  return (
    <div className="flex flex-col h-full">
      {/* 标题输入 */}
      <div className="p-4 border-b border-[#2d2d44]">
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="请输入文章标题..."
          className="w-full px-4 py-3 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg font-medium"
        />
      </div>

      {/* 编辑器工具栏 */}
      <EditorToolbar editor={editor} onInsertImage={() => {}} />

      {/* 编辑器内容区域 */}
      <div className="flex-1 overflow-y-auto bg-[#16162a]">
        <EditorContent editor={editor} />
      </div>

      {/* 配图库 */}
      <ImageGallery
        images={images}
        usedCount={getUsedImageCount()}
        onInsertImage={insertImage}
      />

      {/* 底部状态栏 */}
      <div className="px-4 py-3 border-t border-[#2d2d44] bg-[#1a1a2e] flex items-center justify-between text-sm">
        <div className="flex items-center gap-4 text-slate-400">
          <span>字数: {getWordCount()}</span>
          <span>图片: {getUsedImageCount()}/{images.length}</span>
        </div>
        {onSave && (
          <button
            onClick={onSave}
            className="px-3 py-1 text-xs bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors"
          >
            手动保存
          </button>
        )}
      </div>
    </div>
  );
}
