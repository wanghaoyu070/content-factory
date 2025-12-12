'use client';

import { useState } from 'react';
import { Eye } from 'lucide-react';
import WechatPreview from './WechatPreview';
import XiaohongshuPreview from './XiaohongshuPreview';

type PreviewMode = 'wechat' | 'xiaohongshu';

interface ArticlePreviewProps {
  title: string;
  content: string;
  coverImage?: string;
  images?: string[];
}

export default function ArticlePreview({ title, content, coverImage, images = [] }: ArticlePreviewProps) {
  const [mode, setMode] = useState<PreviewMode>('wechat');

  return (
    <div className="flex flex-col h-full bg-[#16162a] rounded-2xl border border-[#2d2d44] overflow-hidden">
      {/* 预览头部 */}
      <div className="p-4 border-b border-[#2d2d44] flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-200">
          <Eye className="w-5 h-5 text-indigo-400" />
          <span className="font-medium">预览</span>
        </div>

        {/* 模式切换 */}
        <div className="flex items-center gap-1 bg-[#1a1a2e] rounded-lg p-1">
          <button
            onClick={() => setMode('wechat')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              mode === 'wechat'
                ? 'bg-indigo-500 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            公众号
          </button>
          <button
            onClick={() => setMode('xiaohongshu')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              mode === 'xiaohongshu'
                ? 'bg-red-500 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            小红书
          </button>
        </div>
      </div>

      {/* 预览内容区域 */}
      <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-[#1a1a2e] to-[#0f0f23]">
        <div className="flex items-center justify-center min-h-full">
          {mode === 'wechat' ? (
            <WechatPreview
              title={title}
              content={content}
              coverImage={coverImage}
            />
          ) : (
            <XiaohongshuPreview
              title={title}
              content={content}
              coverImage={coverImage}
              images={images}
            />
          )}
        </div>
      </div>
    </div>
  );
}
