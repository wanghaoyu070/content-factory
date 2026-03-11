'use client';

import Image from 'next/image';
import { Loader2, Plus, X } from 'lucide-react';
import { XhsTagsManager } from '@/components/editor/XhsTagsManager';
import { XhsContentChecker } from '@/components/editor/XhsContentChecker';
import type { Article, ArticleStatus } from '@/types';

interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
}

export interface SettingsPanelProps {
  article: Article | null;
  status: ArticleStatus;
  source: string;
  statusConfig: Record<ArticleStatus, StatusConfig>;
  images: string[];
  onRemoveImage: (index: number) => void;
  onAddImageClick: () => void;
  xhsTags: string[];
  onTagsChange: (tags: string[]) => void;
  content: string;
  handleSave: (newStatus?: ArticleStatus) => void | Promise<void>;
  saving: boolean;
  openXhsPublishModal: (articleId: string) => void;
  openWechatPublishModal: (articleId: string) => void;
  publishingId?: string | null;
  articleId: string;
}

export function SettingsPanel(props: SettingsPanelProps) {
  const {
    article,
    source,
    status,
    statusConfig,
    images,
    onRemoveImage,
    onAddImageClick,
    xhsTags,
    onTagsChange,
    content,
    handleSave,
    saving,
    openXhsPublishModal,
    openWechatPublishModal,
    publishingId,
    articleId,
  } = props;

  return (
    <>
      <ArticleInfoSection article={article} source={source} status={status} statusConfig={statusConfig} />
      <ImageManagerSection images={images} onRemoveImage={onRemoveImage} onAddImageClick={onAddImageClick} />
      <XhsTagsSection xhsTags={xhsTags} onTagsChange={onTagsChange} />
      <XhsContentCheckerSection content={content} />
      <QuickActionsSection
        status={status}
        handleSave={handleSave}
        saving={saving}
        openXhsPublishModal={openXhsPublishModal}
        openWechatPublishModal={openWechatPublishModal}
        publishingId={publishingId}
        articleId={articleId}
      />
    </>
  );
}

interface ArticleInfoSectionProps {
  article: Article | null;
  source: string;
  status: ArticleStatus;
  statusConfig: Record<ArticleStatus, StatusConfig>;
}

function ArticleInfoSection({ article, source, status, statusConfig }: ArticleInfoSectionProps) {
  const config = statusConfig[status];

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
      <h3 className="font-medium text-slate-800 mb-4">文章信息</h3>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-[#999]">状态</span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${config.bgColor} ${config.color}`}>
            {config.label}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#999]">来源</span>
          <span className="text-slate-700 text-right max-w-[150px] truncate" title={source}>
            {source || '手动创建'}
          </span>
        </div>
        {article && (
          <>
            <div className="flex justify-between">
              <span className="text-[#999]">创建时间</span>
              <span className="text-slate-700">{new Date(article.createdAt).toLocaleDateString('zh-CN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#999]">更新时间</span>
              <span className="text-slate-700">{new Date(article.updatedAt).toLocaleDateString('zh-CN')}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface ImageManagerSectionProps {
  images: string[];
  onRemoveImage: (index: number) => void;
  onAddImageClick: () => void;
}

function ImageManagerSection({ images, onRemoveImage, onAddImageClick }: ImageManagerSectionProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
      <h3 className="font-medium text-slate-800 mb-4">图片管理</h3>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {images.map((img, index) => (
          <div key={index} className="relative group">
            <Image
              src={img}
              alt=""
              width={240}
              height={64}
              unoptimized
              className="w-full h-16 object-cover rounded-lg"
            />
            <button
              onClick={() => onRemoveImage(index)}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-[#1A1A1A] rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={onAddImageClick}
        className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-[#999] hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        添加图片
      </button>
    </div>
  );
}

interface XhsTagsSectionProps {
  xhsTags: string[];
  onTagsChange: (tags: string[]) => void;
}

function XhsTagsSection({ xhsTags, onTagsChange }: XhsTagsSectionProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
      <h3 className="font-medium text-slate-800 mb-4 flex items-center gap-2">
        <span className="text-red-500">📕</span>
        小红书标签
      </h3>
      <XhsTagsManager
        tags={xhsTags}
        onChange={onTagsChange}
        className="[&_*]:!bg-transparent [&_input]:!bg-slate-50 [&>div:first-child]:!bg-slate-50 [&>div:first-child]:!border-slate-200 [&_span]:!text-slate-600 [&_p]:!text-[#999] [&>div:last-child]:!bg-slate-50"
      />
    </div>
  );
}

function XhsContentCheckerSection({ content }: { content: string }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
      <h3 className="font-medium text-slate-800 mb-4 flex items-center gap-2">
        <span className="text-red-500">📏</span>
        小红书字数检测
      </h3>
      <XhsContentChecker
        content={content}
        className="[&_div]:!bg-slate-50 [&_div]:!border-slate-200 [&_p]:!text-[#999]"
      />
    </div>
  );
}

interface QuickActionsSectionProps {
  status: ArticleStatus;
  handleSave: (newStatus?: ArticleStatus) => void | Promise<void>;
  saving: boolean;
  openXhsPublishModal: (articleId: string) => void;
  openWechatPublishModal: (articleId: string) => void;
  publishingId?: string | null;
  articleId: string;
}

function QuickActionsSection({
  status,
  handleSave,
  saving,
  openXhsPublishModal,
  openWechatPublishModal,
  publishingId,
  articleId,
}: QuickActionsSectionProps) {
  const isPublishingCurrent = publishingId === articleId;

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
      <h3 className="font-medium text-slate-800 mb-4">快捷操作</h3>
      <div className="space-y-2">
        {status === 'draft' && (
          <button
            onClick={() => handleSave('pending_review')}
            disabled={saving}
            className="w-full py-2 bg-amber-500 text-[#1A1A1A] rounded-lg hover:bg-amber-600 transition-colors text-sm disabled:opacity-50"
          >
            提交审核
          </button>
        )}
        {status === 'pending_review' && (
          <button
            onClick={() => handleSave('approved')}
            disabled={saving}
            className="w-full py-2 bg-green-500 text-[#1A1A1A] rounded-lg hover:bg-green-600 transition-colors text-sm disabled:opacity-50"
          >
            通过审核
          </button>
        )}
        {(status === 'approved' || status === 'published' || status === 'failed') && (
          <>
            <button
              onClick={() => openXhsPublishModal(articleId)}
              disabled={isPublishingCurrent}
              className="w-full py-2 bg-red-500 text-[#1A1A1A] rounded-lg hover:bg-red-600 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPublishingCurrent ? <Loader2 className="w-4 h-4 animate-spin" /> : '📕'}
              发布到小红书
            </button>
            <button
              onClick={() => openWechatPublishModal(articleId)}
              disabled={isPublishingCurrent}
              className="w-full py-2 bg-green-500 text-[#1A1A1A] rounded-lg hover:bg-green-600 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPublishingCurrent ? <Loader2 className="w-4 h-4 animate-spin" /> : '📗'}
              发布到公众号
            </button>
          </>
        )}
      </div>
    </div>
  );
}
