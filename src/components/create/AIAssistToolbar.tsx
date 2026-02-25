'use client';

import { useState } from 'react';
import {
    Sparkles,
    RefreshCw,
    Maximize2,
    Minimize2,
    Wand2,
    Loader2,
    Check,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AIAssistToolbarProps {
    selectedText: string;
    position: { x: number; y: number };
    onReplace: (newText: string) => void;
    onClose: () => void;
}

type AIAction = 'rewrite' | 'expand' | 'simplify' | 'polish' | 'continue';

const actionConfig: Record<AIAction, { label: string; icon: React.ElementType; prompt: string }> = {
    rewrite: {
        label: '改写',
        icon: RefreshCw,
        prompt: '请改写以下文本，保持原意但使用不同的表达方式：',
    },
    expand: {
        label: '扩展',
        icon: Maximize2,
        prompt: '请扩展以下文本，添加更多细节和论述：',
    },
    simplify: {
        label: '精简',
        icon: Minimize2,
        prompt: '请精简以下文本，保留核心内容但使表达更简洁：',
    },
    polish: {
        label: '润色',
        icon: Wand2,
        prompt: '请润色以下文本，使其更加流畅、优美：',
    },
    continue: {
        label: '续写',
        icon: Sparkles,
        prompt: '请续写以下文本，保持相同的风格和语调：',
    },
};

export default function AIAssistToolbar({
    selectedText,
    position,
    onReplace,
    onClose,
}: AIAssistToolbarProps) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [currentAction, setCurrentAction] = useState<AIAction | null>(null);

    const handleAction = async (action: AIAction) => {
        if (loading) return;

        setLoading(true);
        setCurrentAction(action);
        setResult(null);

        try {
            const response = await fetch('/api/ai/assist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    text: selectedText,
                    prompt: actionConfig[action].prompt,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setResult(data.result);
            } else {
                toast.error(data.error || 'AI 处理失败');
                setResult(null);
            }
        } catch (error) {
            console.error('AI 处理失败:', error);
            toast.error('AI 处理失败，请重试');
            setResult(null);
        } finally {
            setLoading(false);
        }
    };

    const handleApply = () => {
        if (result) {
            onReplace(result);
            toast.success('已应用');
            onClose();
        }
    };

    const handleCancel = () => {
        setResult(null);
        setCurrentAction(null);
    };

    return (
        <div
            className="fixed z-50 bg-white border border-[rgba(0,0,0,0.06)] rounded-xl shadow-2xl overflow-hidden"
            style={{
                left: Math.min(position.x, window.innerWidth - 320),
                top: position.y + 10,
                minWidth: '280px',
                maxWidth: '400px',
            }}
        >
            {/* 工具栏头部 */}
            <div className="px-3 py-2 bg-gradient-to-r from-[rgba(0,0,0,0.02)] to-[rgba(0,0,0,0.04)] border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-[#1A1A1A]">AI 助手</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 text-[#999] hover:text-[#333] transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* 操作按钮 */}
            {!result && (
                <div className="p-2 flex flex-wrap gap-1">
                    {(Object.entries(actionConfig) as [AIAction, typeof actionConfig[AIAction]][]).map(
                        ([action, config]) => {
                            const Icon = config.icon;
                            const isActive = currentAction === action && loading;

                            return (
                                <button
                                    key={action}
                                    onClick={() => handleAction(action)}
                                    disabled={loading}
                                    className={cn(
                                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all',
                                        isActive
                                            ? 'bg-[rgba(0,0,0,0.06)] text-[#333]'
                                            : 'text-[#666] hover:bg-[#F7F6F0] hover:text-[#1A1A1A]',
                                        loading && !isActive && 'opacity-50 cursor-not-allowed'
                                    )}
                                >
                                    {isActive ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Icon className="w-3.5 h-3.5" />
                                    )}
                                    {config.label}
                                </button>
                            );
                        }
                    )}
                </div>
            )}

            {/* 加载状态 */}
            {loading && !result && (
                <div className="px-4 py-3 border-t border-[rgba(0,0,0,0.06)] flex items-center gap-2 text-sm text-[#666]">
                    <Loader2 className="w-4 h-4 animate-spin text-[#333]" />
                    AI 正在处理...
                </div>
            )}

            {/* 结果预览 */}
            {result && (
                <div className="border-t border-[rgba(0,0,0,0.06)]">
                    <div className="p-3 max-h-48 overflow-y-auto">
                        <div className="text-xs text-[#999] mb-1">AI 结果预览</div>
                        <div className="text-sm text-[#1A1A1A] whitespace-pre-wrap">{result}</div>
                    </div>
                    <div className="p-2 border-t border-[rgba(0,0,0,0.06)] flex items-center justify-end gap-2">
                        <button
                            onClick={handleCancel}
                            className="px-3 py-1.5 text-sm text-[#666] hover:text-[#1A1A1A] transition-colors"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleApply}
                            className="px-3 py-1.5 bg-indigo-600 text-[#1A1A1A] text-sm rounded-lg hover:bg-indigo-500 transition-colors flex items-center gap-1.5"
                        >
                            <Check className="w-3.5 h-3.5" />
                            应用
                        </button>
                    </div>
                </div>
            )}

            {/* 选中文本预览 */}
            {!result && !loading && (
                <div className="px-3 py-2 border-t border-[rgba(0,0,0,0.06)] bg-[#F7F6F0]">
                    <div className="text-xs text-[#999] mb-1">选中的文本</div>
                    <div className="text-xs text-[#666] line-clamp-2">{selectedText}</div>
                </div>
            )}
        </div>
    );
}
