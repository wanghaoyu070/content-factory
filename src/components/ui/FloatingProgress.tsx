'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, Loader2, Sparkles, X, Maximize2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type ProgressStep = 'validating' | 'generating' | 'generating_prompts' | 'generating_images' | 'saving' | 'completed' | 'error';

interface GenerateProgress {
    step: ProgressStep;
    message: string;
    progress: number;
}

interface FloatingProgressProps {
    progress: GenerateProgress | null;
    articleId?: number;
    onExpand?: () => void;
    onClose?: () => void;
}

/**
 * 右下角浮动进度条
 * 用于在 AI 创作过程中允许用户浏览其他页面
 */
export function FloatingProgress({
    progress,
    articleId,
    onExpand,
    onClose,
}: FloatingProgressProps) {
    const [visible, setVisible] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [startTime] = useState(Date.now());

    // 显示控制
    useEffect(() => {
        if (progress) {
            setVisible(true);
        }
    }, [progress]);

    // 计时器
    useEffect(() => {
        if (!progress || progress.step === 'completed' || progress.step === 'error') return;

        const timer = setInterval(() => {
            setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);

        return () => clearInterval(timer);
    }, [progress, startTime]);

    // 格式化时间
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // 关闭浮窗
    const handleClose = () => {
        setVisible(false);
        onClose?.();
    };

    if (!progress || !visible) return null;

    const isCompleted = progress.step === 'completed';
    const isError = progress.step === 'error';
    const isProcessing = !isCompleted && !isError;

    return (
        <div
            className={cn(
                'fixed bottom-6 right-6 z-50',
                'bg-white/95 backdrop-blur-xl',
                'border rounded-2xl shadow-2xl',
                'transition-all duration-300 ease-out',
                'animate-slide-up',
                isCompleted && 'border-emerald-500/30',
                isError && 'border-red-500/30',
                isProcessing && 'border-[rgba(0,0,0,0.08)]'
            )}
            style={{ minWidth: '320px' }}
        >
            {/* 头部 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                    {isCompleted ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : isError ? (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                    ) : (
                        <Loader2 className="w-5 h-5 text-[#333] animate-spin" />
                    )}
                    <span className={cn(
                        'font-medium text-sm',
                        isCompleted && 'text-emerald-400',
                        isError && 'text-red-400',
                        isProcessing && 'text-[#1A1A1A]'
                    )}>
                        {isCompleted ? '✨ 创作完成' : isError ? '创作失败' : 'AI 创作中'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {isProcessing && (
                        <span className="text-xs text-[#999]">{formatTime(elapsedTime)}</span>
                    )}
                    {onExpand && isProcessing && (
                        <button
                            onClick={onExpand}
                            className="p-1 text-[#999] hover:text-[#333] transition-colors"
                            title="展开详情"
                        >
                            <Maximize2 className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={handleClose}
                        className="p-1 text-[#999] hover:text-[#333] transition-colors"
                        title="关闭"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* 内容 */}
            <div className="px-4 py-3">
                {isProcessing && (
                    <>
                        {/* 进度条 */}
                        <div className="mb-2">
                            <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-[#333] to-[#555] transition-all duration-500"
                                    style={{ width: `${progress.progress}%` }}
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-[#666] truncate max-w-[200px]">{progress.message}</span>
                            <span className="text-[#333] font-medium">{progress.progress}%</span>
                        </div>
                    </>
                )}

                {isCompleted && (
                    <div className="text-center py-1">
                        <p className="text-sm text-[#333] mb-2">文章已生成完成 🎉</p>
                        {articleId ? (
                            <Link
                                href={`/articles/${articleId}`}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm hover:bg-emerald-500/30 transition-colors"
                            >
                                查看并编辑文章
                            </Link>
                        ) : (
                            <Link
                                href="/articles"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm hover:bg-emerald-500/30 transition-colors"
                            >
                                前往发布管理
                            </Link>
                        )}
                    </div>
                )}

                {isError && (
                    <div className="text-center py-1">
                        <p className="text-sm text-red-300 mb-1">{progress.message}</p>
                        <p className="text-xs text-[#999]">请检查 AI 配置后重试</p>
                    </div>
                )}
            </div>

            {/* 提示 */}
            {isProcessing && (
                <div className="px-4 pb-3">
                    <p className="text-xs text-slate-600 text-center">
                        💡 您可以继续浏览其他页面
                    </p>
                </div>
            )}
        </div>
    );
}
