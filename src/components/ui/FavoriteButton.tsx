'use client';

import { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FavoriteButtonProps {
    insightId: number;
    isFavorited: boolean;
    onToggle?: (newState: boolean) => void;
    showLabel?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export default function FavoriteButton({
    insightId,
    isFavorited: initialFavorited,
    onToggle,
    showLabel = false,
    size = 'md',
}: FavoriteButtonProps) {
    const [favorited, setFavorited] = useState(initialFavorited);
    const [loading, setLoading] = useState(false);

    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6',
    };

    const handleToggle = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        setLoading(true);
        try {
            if (favorited) {
                // 取消收藏
                const response = await fetch(`/api/insights/favorites?insightId=${insightId}`, {
                    method: 'DELETE',
                });
                const result = await response.json();

                if (result.success) {
                    setFavorited(false);
                    onToggle?.(false);
                    toast.success('已取消收藏');
                } else {
                    toast.error(result.error || '操作失败');
                }
            } else {
                // 添加收藏
                const response = await fetch('/api/insights/favorites', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ insightId }),
                });
                const result = await response.json();

                if (result.success) {
                    setFavorited(true);
                    onToggle?.(true);
                    toast.success('已收藏');
                } else {
                    toast.error(result.error || '操作失败');
                }
            }
        } catch (error) {
            console.error('收藏操作失败:', error);
            toast.error('操作失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    // 触摸目标尺寸 - 确保至少 44x44px
    const touchTargetClasses = {
        sm: 'p-2.5 sm:p-2',
        md: 'p-2.5 sm:p-2',
        lg: 'p-2',
    };

    return (
        <button
            onClick={handleToggle}
            disabled={loading}
            className={cn(
                'flex items-center gap-1.5 transition-all duration-200 rounded-lg hover:bg-white/5 active:scale-95',
                touchTargetClasses[size],
                favorited
                    ? 'text-amber-400 hover:text-amber-300'
                    : 'text-slate-500 hover:text-amber-400',
                loading && 'opacity-50 cursor-not-allowed'
            )}
            title={favorited ? '取消收藏' : '收藏'}
            aria-label={favorited ? '取消收藏' : '收藏'}
        >
            {loading ? (
                <Loader2 className={cn(sizeClasses[size], 'animate-spin')} />
            ) : (
                <Star
                    className={cn(
                        sizeClasses[size],
                        'transition-transform hover:scale-110',
                        favorited && 'fill-current'
                    )}
                />
            )}
            {showLabel && (
                <span className="text-sm">{favorited ? '已收藏' : '收藏'}</span>
            )}
        </button>
    );
}
