'use client';

import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'interactive' | 'bordered';
    glow?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

const variantStyles = {
    default: 'glass-card',
    interactive: 'glass-card card-interactive cursor-pointer',
    bordered: 'bg-transparent border border-white/10 hover:border-white/20',
};

const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
    (
        {
            className,
            variant = 'default',
            glow = false,
            padding = 'md',
            children,
            ...props
        },
        ref
    ) => {
        return (
            <div
                ref={ref}
                className={cn(
                    'rounded-2xl transition-all',
                    variantStyles[variant],
                    paddingStyles[padding],
                    glow && 'card-glow',
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);

Card.displayName = 'Card';

// 卡片标题
export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
    ({ className, title, subtitle, icon, action, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn('flex items-center justify-between mb-4', className)}
                {...props}
            >
                <div className="flex items-center gap-3">
                    {icon && (
                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                            {icon}
                        </div>
                    )}
                    <div>
                        <h3 className="font-semibold text-slate-100">{title}</h3>
                        {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
                    </div>
                </div>
                {action && <div>{action}</div>}
            </div>
        );
    }
);

CardHeader.displayName = 'CardHeader';

// 卡片内容
export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, children, ...props }, ref) => {
        return (
            <div ref={ref} className={cn('', className)} {...props}>
                {children}
            </div>
        );
    }
);

CardContent.displayName = 'CardContent';

// 卡片底部
export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    'mt-4 pt-4 border-t border-white/5 flex items-center justify-between',
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);

CardFooter.displayName = 'CardFooter';
