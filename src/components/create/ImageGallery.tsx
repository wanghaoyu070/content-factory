'use client';

import { Image as ImageIcon, Plus } from 'lucide-react';

interface ImageGalleryProps {
  images: string[];
  usedCount: number;
  onInsertImage: (imageUrl: string) => void;
}

export default function ImageGallery({ images, usedCount, onInsertImage }: ImageGalleryProps) {
  if (images.length === 0) {
    return null;
  }

  return (
    <div className="p-4 border-t border-[rgba(0,0,0,0.06)] bg-[#F7F6F0]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm text-[#666]">
          <ImageIcon className="w-4 h-4 text-emerald-400" />
          <span>可用配图</span>
          <span className="text-[#999]">({images.length}张)</span>
        </div>
        <span className="text-xs text-[#999]">
          已使用: {usedCount}/{images.length}
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {images.map((imageUrl, index) => (
          <button
            key={index}
            onClick={() => onInsertImage(imageUrl)}
            className="relative group flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 border-transparent hover:border-[rgba(0,0,0,0.15)] transition-colors"
            title="点击插入到文章"
          >
            <img
              src={imageUrl}
              alt={`配图 ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <Plus className="w-6 h-6 text-[#1A1A1A] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        ))}
      </div>

      <p className="text-xs text-[#999] mt-2">
        点击图片可插入到文章光标位置
      </p>
    </div>
  );
}
