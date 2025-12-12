'use client';

import { Heart, MessageCircle, Star, Share2 } from 'lucide-react';

interface XiaohongshuPreviewProps {
  title: string;
  content: string;
  coverImage?: string;
  images?: string[];
}

export default function XiaohongshuPreview({ title, content, coverImage, images = [] }: XiaohongshuPreviewProps) {
  // 从内容中提取纯文本
  const getPlainText = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  // 从内容中提取所有图片
  const extractImages = (html: string): string[] => {
    const imgRegex = /<img[^>]+src="([^">]+)"/g;
    const imgs: string[] = [];
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
      imgs.push(match[1]);
    }
    return imgs;
  };

  const contentImages = extractImages(content);
  const allImages = coverImage ? [coverImage, ...contentImages] : contentImages;
  const displayImages = allImages.length > 0 ? allImages : images;

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

      {/* 小红书导航栏 */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <span className="text-gray-600 text-lg">←</span>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
            小
          </div>
          <span className="text-gray-800 font-medium text-sm">小红书</span>
        </div>
        <span className="text-gray-600">⋯</span>
      </div>

      {/* 笔记内容区域 - 可滚动 */}
      <div className="h-[680px] overflow-y-auto bg-white">
        {/* 图片轮播区域 */}
        {displayImages.length > 0 && (
          <div className="relative">
            <div className="w-full aspect-[4/5] overflow-hidden bg-gray-100">
              <img
                src={displayImages[0]}
                alt="笔记图片"
                className="w-full h-full object-cover"
              />
            </div>
            {displayImages.length > 1 && (
              <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                1/{displayImages.length}
              </div>
            )}
          </div>
        )}

        {/* 作者信息 */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
              AI
            </div>
            <div>
              <div className="text-sm text-gray-800 font-medium">内容工厂</div>
              <div className="text-xs text-gray-400">刚刚发布</div>
            </div>
          </div>
          <button className="px-4 py-1.5 bg-red-500 text-white text-sm rounded-full font-medium">
            + 关注
          </button>
        </div>

        {/* 笔记标题 */}
        <div className="px-4 pb-2">
          <h1 className="text-lg font-bold text-gray-900 leading-tight">
            {title || '笔记标题'}
          </h1>
        </div>

        {/* 笔记正文 */}
        <div
          className="px-4 py-2 xiaohongshu-content"
          dangerouslySetInnerHTML={{ __html: content || '<p class="text-gray-400">笔记内容预览...</p>' }}
        />

        {/* 标签区域 */}
        <div className="px-4 py-3 flex flex-wrap gap-2">
          <span className="text-red-500 text-sm">#内容创作</span>
          <span className="text-red-500 text-sm">#AI写作</span>
          <span className="text-red-500 text-sm">#自媒体</span>
        </div>

        {/* 发布时间和位置 */}
        <div className="px-4 py-2 text-xs text-gray-400">
          今天 · 编辑于 中国
        </div>
      </div>

      {/* 底部互动栏 */}
      <div className="px-4 py-3 border-t border-gray-100 bg-white flex items-center justify-between">
        <div className="flex-1 flex items-center gap-1 bg-gray-100 rounded-full px-4 py-2">
          <span className="text-gray-400 text-sm">说点什么...</span>
        </div>
        <div className="flex items-center gap-4 ml-4">
          <button className="flex items-center gap-1 text-gray-500">
            <Heart className="w-5 h-5" />
            <span className="text-xs">128</span>
          </button>
          <button className="flex items-center gap-1 text-gray-500">
            <Star className="w-5 h-5" />
            <span className="text-xs">56</span>
          </button>
          <button className="flex items-center gap-1 text-gray-500">
            <MessageCircle className="w-5 h-5" />
            <span className="text-xs">23</span>
          </button>
        </div>
      </div>

      {/* 底部安全区域 */}
      <div className="h-6 bg-white flex items-center justify-center">
        <div className="w-32 h-1 bg-gray-300 rounded-full"></div>
      </div>

      {/* 小红书文章样式 */}
      <style jsx global>{`
        .xiaohongshu-content {
          font-size: 15px;
          line-height: 1.8;
          color: #333;
        }
        .xiaohongshu-content p {
          margin-bottom: 12px;
        }
        .xiaohongshu-content h1,
        .xiaohongshu-content h2,
        .xiaohongshu-content h3 {
          font-size: 16px;
          font-weight: bold;
          margin: 16px 0 8px;
          color: #000;
        }
        .xiaohongshu-content img {
          display: none; /* 小红书图片在顶部轮播显示 */
        }
        .xiaohongshu-content figure {
          display: none;
        }
        .xiaohongshu-content blockquote {
          border-left: 2px solid #ff2442;
          padding-left: 10px;
          margin: 12px 0;
          color: #666;
        }
        .xiaohongshu-content ul, .xiaohongshu-content ol {
          padding-left: 16px;
          margin: 10px 0;
        }
        .xiaohongshu-content li {
          margin-bottom: 6px;
        }
        .xiaohongshu-content a {
          color: #ff2442;
          text-decoration: none;
        }
        .xiaohongshu-content strong {
          font-weight: bold;
          color: #000;
        }
      `}</style>
    </div>
  );
}
