'use client';

import { useMemo } from 'react';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface XhsContentCheckerProps {
    content: string;
    className?: string;
}

const XHS_CHAR_LIMIT = 1000;
const XHS_CHAR_WARNING = 800;

/**
 * 小红书内容检测组件
 * 检测内容是否符合小红书的字数限制
 */
export function XhsContentChecker({ content, className }: XhsContentCheckerProps) {
    // 从 HTML 中提取纯文本并计算字数
    const stats = useMemo(() => {
        const plainText = content
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n')
            .replace(/<\/h[1-6]>/gi, '\n\n')
            .replace(/<li>/gi, '• ')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\n{3,}/g, '\n\n')
            .replace(/[ \t]+/g, ' ')
            .trim();

        const charCount = plainText.length;
        const wordCount = plainText.split(/\s+/).filter(Boolean).length;
        const isOverLimit = charCount > XHS_CHAR_LIMIT;
        const isNearLimit = charCount > XHS_CHAR_WARNING && charCount <= XHS_CHAR_LIMIT;
        const excessChars = charCount - XHS_CHAR_LIMIT;
        const percentage = Math.min((charCount / XHS_CHAR_LIMIT) * 100, 100);

        return {
            charCount,
            wordCount,
            isOverLimit,
            isNearLimit,
            excessChars,
            percentage,
        };
    }, [content]);

    const { charCount, isOverLimit, isNearLimit, excessChars, percentage } = stats;

    // 状态配置
    const statusConfig = {
        over: {
            icon: AlertTriangle,
            bgColor: 'bg-red-500/10',
            borderColor: 'border-red-500/30',
            textColor: 'text-red-400',
            progressColor: 'bg-red-500',
            message: `超出 ${excessChars} 字`,
            description: '小红书限制约 1000 字，建议精简内容',
        },
        warning: {
            icon: Info,
            bgColor: 'bg-amber-500/10',
            borderColor: 'border-amber-500/30',
            textColor: 'text-amber-400',
            progressColor: 'bg-amber-500',
            message: '接近字数限制',
            description: '建议保留一些余量',
        },
        ok: {
            icon: CheckCircle,
            bgColor: 'bg-emerald-500/10',
            borderColor: 'border-emerald-500/30',
            textColor: 'text-emerald-400',
            progressColor: 'bg-emerald-500',
            message: '字数合适',
            description: '适合发布到小红书',
        },
    };

    const status = isOverLimit ? 'over' : isNearLimit ? 'warning' : 'ok';
    const config = statusConfig[status];
    const Icon = config.icon;

    return (
        <div className={cn('space-y-3', className)}>
            {/* 状态卡片 */}
            <div className={cn(
                'p-3 rounded-xl border transition-colors',
                config.bgColor,
                config.borderColor
            )}>
                <div className="flex items-start gap-3">
                    <Icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', config.textColor)} />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                            <span className={cn('font-medium', config.textColor)}>
                                {config.message}
                            </span>
                            <span className="text-sm text-slate-400">
                                {charCount} / {XHS_CHAR_LIMIT} 字
                            </span>
                        </div>
                        <p className="text-xs text-slate-500">{config.description}</p>
                    </div>
                </div>
            </div>

            {/* 进度条 */}
            <div className="space-y-1.5">
                <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                        className={cn(
                            'h-full rounded-full transition-all duration-300',
                            config.progressColor
                        )}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                </div>
                {isOverLimit && (
                    <div className="flex justify-end">
                        <span className="text-xs text-red-400">
                            超出 {Math.round((excessChars / XHS_CHAR_LIMIT) * 100)}%
                        </span>
                    </div>
                )}
            </div>

            {/* 优化建议（仅当超出时显示） */}
            {isOverLimit && (
                <div className="bg-[#1a1a2e] rounded-lg p-3 text-xs">
                    <p className="text-slate-400 mb-2">💡 <strong>精简建议：</strong></p>
                    <ul className="space-y-1 text-slate-500">
                        <li>• 删除冗余的过渡句和修饰语</li>
                        <li>• 将长段落拆分为要点列表</li>
                        <li>• 保留核心观点，删除次要内容</li>
                        <li>• 使用更简洁的表达方式</li>
                    </ul>
                </div>
            )}
        </div>
    );
}
