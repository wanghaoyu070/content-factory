'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { X, Upload, Link as LinkIcon, Sparkles, Image as ImageIcon, Loader2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type TabType = 'upload' | 'ai' | 'url';

interface ImageUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImageSelect: (url: string) => void;
    existingImages?: string[];
}

export function ImageUploadModal({
    isOpen,
    onClose,
    onImageSelect,
    existingImages = [],
}: ImageUploadModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>('upload');
    const [uploading, setUploading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const [aiPrompt, setAiPrompt] = useState('');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [showUrlPreview, setShowUrlPreview] = useState(true);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 关闭并重置
    const handleClose = useCallback(() => {
        setPreviewUrl(null);
        setShowUrlPreview(true);
        setUrlInput('');
        setAiPrompt('');
        setActiveTab('upload');
        onClose();
    }, [onClose]);

    // 处理文件上传
    const handleFileUpload = useCallback(async (file: File) => {
        if (!file.type.startsWith('image/')) {
            toast.error('请上传图片文件');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('图片大小不能超过 5MB');
            return;
        }

        setUploading(true);
        try {
            // 创建本地预览
            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64 = e.target?.result as string;
                setPreviewUrl(base64);

                // TODO: 未来可以上传到 OSS
                // 现在先使用 base64 作为图片 URL（适合小图）
                // 对于大图，应该上传到服务器

                // 模拟上传延迟
                await new Promise(resolve => setTimeout(resolve, 500));

                onImageSelect(base64);
                toast.success('图片添加成功');
                handleClose();
            };
            reader.readAsDataURL(file);
        } catch {
            toast.error('上传失败，请重试');
        } finally {
            setUploading(false);
        }
    }, [onImageSelect, handleClose]);

    // 拖拽处理
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileUpload(file);
        }
    }, [handleFileUpload]);

    // AI 生成图片
    const handleAiGenerate = async () => {
        if (!aiPrompt.trim()) {
            toast.error('请输入图片描述');
            return;
        }

        setGenerating(true);
        try {
            const response = await fetch('/api/ai/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: aiPrompt }),
            });

            const result = await response.json();

            if (result.success && result.data?.url) {
                setPreviewUrl(result.data.url);
                onImageSelect(result.data.url);
                toast.success('图片生成成功');
                handleClose();
            } else {
                toast.error(result.error || '生成失败，请重试');
            }
        } catch {
            toast.error('生成失败，请检查 AI 配置');
        } finally {
            setGenerating(false);
        }
    };

    // URL 添加
    const handleUrlAdd = async () => {
        const url = urlInput.trim();
        if (!url) {
            toast.error('请输入图片链接');
            return;
        }

        // 简单 URL 验证
        if (!url.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i) &&
            !url.match(/^https?:\/\/.+/)) {
            toast.error('请输入有效的图片链接');
            return;
        }

        // 尝试加载图片验证
        try {
            const img = new window.Image();
            img.onload = () => {
                onImageSelect(url);
                toast.success('图片添加成功');
                handleClose();
            };
            img.onerror = () => {
                toast.error('无法加载该图片，请检查链接');
            };
            img.src = url;
        } catch {
            toast.error('无法加载该图片');
        }
    };

    if (!isOpen) return null;

    const tabs = [
        { id: 'upload' as const, label: '本地上传', icon: Upload },
        { id: 'ai' as const, label: 'AI 生成', icon: Sparkles },
        { id: 'url' as const, label: '链接粘贴', icon: LinkIcon },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* 背景遮罩 */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* 模态框 */}
            <div className="relative bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] w-full max-w-lg shadow-2xl animate-slide-up">
                {/* 头部 */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(0,0,0,0.06)]">
                    <h2 className="text-lg font-semibold text-[#1A1A1A] flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-[#333]" />
                        添加图片
                    </h2>
                    <button
                        onClick={handleClose}
                        className="p-2 text-[#666] hover:text-[#1A1A1A] hover:bg-[#F7F6F0] rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tab 切换 */}
                <div className="px-6 pt-4">
                    <div className="flex items-center gap-1 bg-[#F7F6F0] rounded-xl p-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm rounded-lg transition-all',
                                    activeTab === tab.id
                                        ? 'bg-[rgba(0,0,0,0.06)] text-[#333]'
                                        : 'text-[#666] hover:text-[#1A1A1A]'
                                )}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 内容区域 */}
                <div className="p-6">
                    {/* 本地上传 */}
                    {activeTab === 'upload' && (
                        <div
                            className={cn(
                                'border-2 border-dashed rounded-xl p-8 text-center transition-all',
                                dragOver
                                    ? 'border-indigo-400 bg-[rgba(0,0,0,0.04)]'
                                    : 'border-[rgba(0,0,0,0.06)] hover:border-[#3d3d5c]'
                            )}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleFileUpload(file);
                                }}
                            />

                            {uploading ? (
                                <div className="py-4">
                                    <Loader2 className="w-10 h-10 mx-auto text-[#333] animate-spin mb-3" />
                                    <p className="text-[#666]">上传中...</p>
                                </div>
                            ) : previewUrl ? (
                                <div className="py-2">
                                    <Image
                                        src={previewUrl}
                                        alt="预览"
                                        width={512}
                                        height={256}
                                        unoptimized
                                        className="max-h-32 mx-auto rounded-lg mb-3"
                                    />
                                    <CheckCircle className="w-6 h-6 mx-auto text-emerald-400" />
                                </div>
                            ) : (
                                <>
                                    <Upload className="w-10 h-10 mx-auto text-[#999] mb-3" />
                                    <p className="text-[#333] mb-1">拖拽图片到这里</p>
                                    <p className="text-sm text-[#999] mb-4">或者</p>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-4 py-2 bg-[rgba(0,0,0,0.06)] text-[#333] rounded-lg hover:bg-indigo-500/30 transition-colors"
                                    >
                                        选择文件
                                    </button>
                                    <p className="text-xs text-slate-600 mt-3">支持 JPG、PNG、GIF，最大 5MB</p>
                                </>
                            )}
                        </div>
                    )}

                    {/* AI 生成 */}
                    {activeTab === 'ai' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-[#666] mb-2">
                                    描述你想要的图片
                                </label>
                                <textarea
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    placeholder="例如：一个现代化的办公室场景，明亮的自然光，简洁的设计风格"
                                    className="w-full h-24 px-4 py-3 bg-[#F7F6F0] border border-[rgba(0,0,0,0.06)] rounded-xl text-[#1A1A1A] placeholder-[#999] focus:outline-none focus:border-[rgba(0,0,0,0.15)] resize-none"
                                />
                            </div>

                            <div className="bg-[#F7F6F0] rounded-xl p-4">
                                <p className="text-xs text-[#999] mb-2">💡 提示</p>
                                <ul className="text-xs text-[#666] space-y-1">
                                    <li>• 详细描述场景、风格、颜色</li>
                                    <li>• 使用英文描述效果更好</li>
                                    <li>• 生成大约需要 10-30 秒</li>
                                </ul>
                            </div>

                            <button
                                onClick={handleAiGenerate}
                                disabled={generating || !aiPrompt.trim()}
                                className="w-full py-3 bg-gradient-to-r from-[#333] to-[#555] text-white rounded-xl hover:from-[#444] hover:to-[#666] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {generating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        生成中...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5" />
                                        生成图片
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* URL 粘贴 */}
                    {activeTab === 'url' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-[#666] mb-2">
                                    图片链接
                                </label>
                                <input
                                    type="url"
                                    value={urlInput}
                                    onChange={(e) => {
                                        setUrlInput(e.target.value);
                                        setShowUrlPreview(true);
                                    }}
                                    placeholder="https://example.com/image.jpg"
                                    className="w-full px-4 py-3 bg-[#F7F6F0] border border-[rgba(0,0,0,0.06)] rounded-xl text-[#1A1A1A] placeholder-[#999] focus:outline-none focus:border-[rgba(0,0,0,0.15)]"
                                />
                            </div>

                            {urlInput && showUrlPreview && (
                                <div className="bg-[#F7F6F0] rounded-xl p-4">
                                    <p className="text-xs text-[#999] mb-2">图片预览</p>
                                    <Image
                                        src={urlInput}
                                        alt="预览"
                                        width={512}
                                        height={256}
                                        unoptimized
                                        className="max-h-32 rounded-lg"
                                        onError={() => setShowUrlPreview(false)}
                                    />
                                </div>
                            )}

                            <button
                                onClick={handleUrlAdd}
                                disabled={!urlInput.trim()}
                                className="w-full py-3 bg-[rgba(0,0,0,0.06)] text-[#333] rounded-xl hover:bg-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <LinkIcon className="w-5 h-5" />
                                添加图片
                            </button>
                        </div>
                    )}
                </div>

                {/* 已有图片提示 */}
                {existingImages.length > 0 && (
                    <div className="px-6 pb-4">
                        <p className="text-xs text-slate-600">
                            当前文章已有 {existingImages.length} 张图片
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
