'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
}

const variantStyles: Record<ButtonVariant, string> = {
    primary: 'btn-primary bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/20',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
    success: 'bg-success/20 text-success hover:bg-success/30 border border-success/20',
};

const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
    md: 'px-4 py-2 text-sm rounded-xl gap-2',
    lg: 'px-6 py-3 text-base rounded-xl gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            variant = 'primary',
            size = 'md',
            loading = false,
            disabled,
            icon,
            iconPosition = 'left',
            children,
            ...props
        },
        ref
    ) => {
        const isDisabled = disabled || loading;

        return (
            <button
                ref={ref}
                disabled={isDisabled}
                className={cn(
                    'inline-flex items-center justify-center font-medium transition-all',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    variantStyles[variant],
                    sizeStyles[size],
                    className
                )}
                {...props}
            >
                {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    icon && iconPosition === 'left' && icon
                )}
                {children}
                {!loading && icon && iconPosition === 'right' && icon}
            </button>
        );
    }
);

Button.displayName = 'Button';

// 图标按钮
export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    icon: React.ReactNode;
    tooltip?: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
    ({ className, variant = 'ghost', size = 'md', icon, tooltip, ...props }, ref) => {
        const iconSizes: Record<ButtonSize, string> = {
            sm: 'w-7 h-7',
            md: 'w-9 h-9',
            lg: 'w-11 h-11',
        };

        return (
            <button
                ref={ref}
                title={tooltip}
                className={cn(
                    'inline-flex items-center justify-center rounded-lg transition-all',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    variantStyles[variant],
                    iconSizes[size],
                    className
                )}
                {...props}
            >
                {icon}
            </button>
        );
    }
);

IconButton.displayName = 'IconButton';
