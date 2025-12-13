import { cn } from '@/lib/utils';
import { type ArticleStatus, STATUS_CONFIG } from '@/lib/utils';

export interface BadgeProps {
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
    size?: 'sm' | 'md';
    children: React.ReactNode;
    className?: string;
}

const variantStyles = {
    default: 'bg-slate-500/10 text-slate-400',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
    info: 'bg-primary/10 text-primary',
};

const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
};

export function Badge({
    variant = 'default',
    size = 'sm',
    children,
    className,
}: BadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center font-medium rounded-full',
                variantStyles[variant],
                sizeStyles[size],
                className
            )}
        >
            {children}
        </span>
    );
}

// 状态徽章（专门用于文章状态）
export interface StatusBadgeProps {
    status: ArticleStatus;
    size?: 'sm' | 'md';
    className?: string;
}

export function StatusBadge({ status, size = 'sm', className }: StatusBadgeProps) {
    const config = STATUS_CONFIG[status];

    return (
        <span
            className={cn(
                'inline-flex items-center font-medium rounded-full',
                config.bgColor,
                config.textColor,
                sizeStyles[size],
                className
            )}
        >
            {config.label}
        </span>
    );
}

// 数字徽章（用于显示计数）
export interface CountBadgeProps {
    count: number;
    max?: number;
    variant?: 'default' | 'primary';
    className?: string;
}

export function CountBadge({
    count,
    max = 99,
    variant = 'default',
    className,
}: CountBadgeProps) {
    const displayCount = count > max ? `${max}+` : count;

    return (
        <span
            className={cn(
                'inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-medium rounded-full',
                variant === 'primary'
                    ? 'bg-primary text-white'
                    : 'bg-slate-600 text-slate-200',
                className
            )}
        >
            {displayCount}
        </span>
    );
}
