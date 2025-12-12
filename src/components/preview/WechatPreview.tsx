'use client';

import { ThumbsUp, MessageCircle, Share2, Star } from 'lucide-react';

interface WechatPreviewProps {
  title: string;
  content: string;
  coverImage?: string;
}

export default function WechatPreview({ title, content, coverImage }: WechatPreviewProps) {
  return (
    <div className="bg-white rounded-[40px] overflow-hidden shadow-2xl w-[480px] mx-auto">
      {/* 手机顶部状态栏 */}
      <div className="bg-black text-white px-6 py-2 flex items-center justify-between text-xs">
        <span>9:41</span>
        <div className="flex items-center gap-1">
          <div className="flex gap-0.5">
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white/50 rounded-full"></div>
          </div>
          <span className="ml-1">5G</span>
          <div className="w-6 h-3 border border-white rounded-sm ml-1">
            <div className="w-4 h-full bg-white rounded-sm"></div>
          </div>
        </div>
      </div>

      {/* 微信导航栏 */}
      <div className="bg-[#ededed] px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <span className="text-gray-600 text-sm">←</span>
        <span className="text-gray-800 font-medium text-sm">公众号文章</span>
        <span className="text-gray-600 text-sm">⋯</span>
      </div>

      {/* 文章内容区域 - 可滚动 */}
      <div className="h-[680px] overflow-y-auto bg-white">
        {/* 封面图 */}
        {coverImage && (
          <div className="w-full h-48 overflow-hidden">
            <img src={coverImage} alt="封面" className="w-full h-full object-cover" />
          </div>
        )}

        {/* 文章标题 */}
        <div className="px-4 pt-4 pb-2">
          <h1 className="text-xl font-bold text-gray-900 leading-tight">
            {title || '文章标题'}
          </h1>
        </div>

        {/* 作者信息 */}
        <div className="px-4 py-2 flex items-center gap-2 border-b border-gray-100">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
            AI
          </div>
          <div>
            <div className="text-sm text-gray-800 font-medium">内容工厂</div>
            <div className="text-xs text-gray-400">刚刚</div>
          </div>
        </div>

        {/* 文章正文 */}
        <div
          className="px-4 py-4 wechat-article-content"
          dangerouslySetInnerHTML={{ __html: content || '<p class="text-gray-400">文章内容预览...</p>' }}
        />

        {/* 底部互动区 */}
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center justify-around text-gray-500">
            <button className="flex flex-col items-center gap-1">
              <ThumbsUp className="w-5 h-5" />
              <span className="text-xs">赞</span>
            </button>
            <button className="flex flex-col items-center gap-1">
              <Star className="w-5 h-5" />
              <span className="text-xs">在看</span>
            </button>
            <button className="flex flex-col items-center gap-1">
              <MessageCircle className="w-5 h-5" />
              <span className="text-xs">留言</span>
            </button>
            <button className="flex flex-col items-center gap-1">
              <Share2 className="w-5 h-5" />
              <span className="text-xs">分享</span>
            </button>
          </div>
        </div>
      </div>

      {/* 底部安全区域 */}
      <div className="h-8 bg-white flex items-center justify-center">
        <div className="w-32 h-1 bg-gray-300 rounded-full"></div>
      </div>

      {/* 微信文章样式 */}
      <style jsx global>{`
        .wechat-article-content {
          font-size: 16px;
          line-height: 1.8;
          color: #333;
        }
        .wechat-article-content p {
          margin-bottom: 16px;
        }
        .wechat-article-content h1 {
          font-size: 22px;
          font-weight: bold;
          margin: 24px 0 16px;
          color: #000;
        }
        .wechat-article-content h2 {
          font-size: 20px;
          font-weight: bold;
          margin: 20px 0 12px;
          color: #000;
        }
        .wechat-article-content h3 {
          font-size: 18px;
          font-weight: bold;
          margin: 16px 0 10px;
          color: #000;
        }
        .wechat-article-content img {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
          margin: 12px 0;
        }
        .wechat-article-content figure {
          margin: 16px 0;
        }
        .wechat-article-content figcaption {
          text-align: center;
          color: #999;
          font-size: 12px;
          margin-top: 8px;
        }
        .wechat-article-content blockquote {
          border-left: 3px solid #07c160;
          padding-left: 12px;
          margin: 16px 0;
          color: #666;
          font-style: italic;
        }
        .wechat-article-content ul, .wechat-article-content ol {
          padding-left: 20px;
          margin: 12px 0;
        }
        .wechat-article-content li {
          margin-bottom: 8px;
        }
        .wechat-article-content a {
          color: #576b95;
          text-decoration: none;
        }
        .wechat-article-content strong {
          font-weight: bold;
          color: #000;
        }
      `}</style>
    </div>
  );
}
