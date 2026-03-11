'use client';

import { useEffect, useRef, useState } from 'react';
import {
    CheckCircle,
    Loader2,
    Circle,
    FileText,
    Sparkles,
    Image as ImageIcon,
    Save,
    AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ProgressStep = 'validating' | 'generating' | 'generating_prompts' | 'generating_images' | 'saving' | 'completed' | 'error';

interface GenerateProgress {
    step: ProgressStep;
    message: string;
    progress: number;
}

interface ProgressTrackerProps {
    progress: GenerateProgress | null;
    onMinimize?: () => void;
    onCancel?: () => void;
    minimizable?: boolean;
}

const stepConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
    validating: { icon: Circle, label: '验证配置', color: 'text-[#666]' },
    generating: { icon: FileText, label: '生成文章', color: 'text-[#333]' },
    generating_prompts: { icon: Sparkles, label: '分析配图', color: 'text-purple-400' },
    generating_images: { icon: ImageIcon, label: '生成图片', color: 'text-pink-400' },
    saving: { icon: Save, label: '保存文章', color: 'text-emerald-400' },
    completed: { icon: CheckCircle, label: '完成', color: 'text-emerald-400' },
    error: { icon: AlertCircle, label: '出错', color: 'text-red-400' },
};

const stepOrder: ProgressStep[] = ['validating', 'generating', 'generating_prompts', 'generating_images', 'saving', 'completed'];

export default function ProgressTracker({
    progress,
    onMinimize,
    onCancel,
    minimizable = true,
}: ProgressTrackerProps) {
    const [elapsedTime, setElapsedTime] = useState(0);
    const startTimeRef = useRef<number | null>(null);

    useEffect(() => {
        if (progress && progress.step !== 'completed' && progress.step !== 'error' && startTimeRef.current === null) {
            startTimeRef.current = Date.now();
        }
        if (!progress || progress.step === 'completed' || progress.step === 'error') {
            startTimeRef.current = null;
        }
    }, [progress]);

    // 计时器
    useEffect(() => {
        if (!progress || progress.step === 'completed' || progress.step === 'error') return;

        const timer = setInterval(() => {
            const startTime = startTimeRef.current ?? Date.now();
            setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);

        return () => clearInterval(timer);
    }, [progress]);

    // 格式化时间
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // 计算预估剩余时间
    const estimateRemainingTime = () => {
        if (!progress || progress.progress <= 0) return '计算中...';
        if (progress.step === 'completed') return '已完成';
        if (progress.step === 'error') return '--';

        const estimatedTotal = (elapsedTime / progress.progress) * 100;
        const remaining = Math.max(0, Math.ceil(estimatedTotal - elapsedTime));

        if (remaining < 60) return `约 ${remaining} 秒`;
        return `约 ${Math.ceil(remaining / 60)} 分钟`;
    };

    // 获取当前步骤索引
    const getCurrentStepIndex = () => {
        if (!progress) return -1;
        return stepOrder.indexOf(progress.step);
    };

    // 渲染步骤
    const renderStep = (step: ProgressStep, index: number) => {
        const currentIndex = getCurrentStepIndex();
        const config = stepConfig[step];

        let status: 'pending' | 'active' | 'done' | 'error' = 'pending';
        if (progress?.step === 'error' && index === currentIndex) {
            status = 'error';
        } else if (index < currentIndex || progress?.step === 'completed') {
            status = 'done';
        } else if (index === currentIndex) {
            status = 'active';
        }

        // 不显示 validating 步骤（太快了）
        if (step === 'validating') return null;
        // 不显示 completed 作为单独步骤
        if (step === 'completed') return null;

        return (
            <div
                key={step}
                className={cn(
                    'flex items-center gap-3 py-2 transition-all duration-300',
                    status === 'active' && 'scale-105'
                )}
            >
                <div
                    className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                        status === 'done' && 'bg-emerald-500/20 text-emerald-400',
                        status === 'active' && 'bg-[rgba(0,0,0,0.06)] text-[#333]',
                        status === 'pending' && 'bg-slate-700/50 text-[#999]',
                        status === 'error' && 'bg-red-500/20 text-red-400'
                    )}
                >
                    {status === 'done' ? (
                        <CheckCircle className="w-4 h-4" />
                    ) : status === 'active' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : status === 'error' ? (
                        <AlertCircle className="w-4 h-4" />
                    ) : (
                        <Circle className="w-4 h-4" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div
                        className={cn(
                            'text-sm font-medium transition-colors',
                            status === 'done' && 'text-emerald-400',
                            status === 'active' && 'text-[#1A1A1A]',
                            status === 'pending' && 'text-[#999]',
                            status === 'error' && 'text-red-400'
                        )}
                    >
                        {config.label}
                    </div>
                    {status === 'active' && progress?.message && (
                        <div className="text-xs text-[#666] mt-0.5 truncate animate-pulse">
                            {progress.message}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (!progress) return null;

    return (
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] p-6 shadow-2xl w-full max-w-md">
            {/* 标题 */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#1A1A1A] flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    AI 创作中
                </h3>
                <div className="flex items-center gap-3 text-sm text-[#666]">
                    <span>⏱️ {formatTime(elapsedTime)}</span>
                </div>
            </div>

            {/* 进度条 */}
            <div className="mb-6">
                <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-[#666]">{progress.message}</span>
                    <span className="text-[#333] font-medium">{progress.progress}%</span>
                </div>
                <div className="h-2 bg-[#F7F6F0] rounded-full overflow-hidden">
                    <div
                        className={cn(
                            'h-full rounded-full transition-all duration-500',
                            progress.step === 'error'
                                ? 'bg-red-500'
                                : progress.step === 'completed'
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                                    : 'bg-gradient-to-r from-[#333] to-[#555]'
                        )}
                        style={{ width: `${progress.progress}%` }}
                    />
                </div>
            </div>

            {/* 步骤列表 */}
            <div className="space-y-1 mb-4">
                {stepOrder.map((step, index) => renderStep(step, index))}
            </div>

            {/* 预估时间 */}
            {progress.step !== 'completed' && progress.step !== 'error' && (
                <div className="text-center text-sm text-[#999]">
                    预计剩余时间: {estimateRemainingTime()}
                </div>
            )}

            {/* 完成状态 */}
            {progress.step === 'completed' && (
                <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                    <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <div className="text-emerald-400 font-medium">🎉 创作完成！</div>
                    <div className="text-sm text-[#666] mt-1">
                        文章已保存，正在跳转编辑页面...
                    </div>
                </div>
            )}

            {/* 错误状态 */}
            {progress.step === 'error' && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                    <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                    <div className="text-red-400 font-medium">创作失败</div>
                    <div className="text-sm text-[#666] mt-1">
                        {progress.message}
                    </div>
                </div>
            )}

            {/* 操作按钮 */}
            {progress.step !== 'completed' && progress.step !== 'error' && (
                <div className="mt-4 flex items-center justify-center gap-4">
                    {minimizable && onMinimize && (
                        <button
                            onClick={onMinimize}
                            className="text-sm text-[#999] hover:text-[#333] transition-colors"
                        >
                            最小化到后台
                        </button>
                    )}
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            className="text-sm text-red-400/70 hover:text-red-400 transition-colors"
                        >
                            取消创作
                        </button>
                    )}
                </div>
            )}

            {/* 提示 */}
            {progress.step !== 'completed' && progress.step !== 'error' && (
                <div className="mt-4 text-center text-xs text-slate-600">
                    💡 提示: 创作期间可以浏览其他页面，完成后会自动跳转
                </div>
            )}
        </div>
    );
}
