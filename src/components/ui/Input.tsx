'use client';

import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, hint, icon, id, ...props }, ref) => {
        const inputId = id || label?.toLowerCase().replace(/\s/g, '-');

        return (
            <div className="space-y-1.5">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-medium text-slate-300"
                    >
                        {label}
                    </label>
                )}
                <div className="relative group">
                    {icon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                            {icon}
                        </div>
                    )}
                    {/* 发光效果 */}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" />
                    <input
                        ref={ref}
                        id={inputId}
                        className={cn(
                            'relative w-full px-4 py-3 bg-[#0f0f23]/80 border rounded-xl',
                            'text-slate-100 placeholder-slate-500',
                            'focus:outline-none focus:ring-2 focus:ring-primary/50',
                            'transition-all',
                            icon && 'pl-10',
                            error
                                ? 'border-danger/50 focus:ring-danger/50'
                                : 'border-white/10 hover:border-white/20',
                            className
                        )}
                        {...props}
                    />
                </div>
                {error && <p className="text-sm text-danger">{error}</p>}
                {hint && !error && <p className="text-sm text-slate-500">{hint}</p>}
            </div>
        );
    }
);

Input.displayName = 'Input';

// Textarea 组件
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, label, error, hint, id, ...props }, ref) => {
        const textareaId = id || label?.toLowerCase().replace(/\s/g, '-');

        return (
            <div className="space-y-1.5">
                {label && (
                    <label
                        htmlFor={textareaId}
                        className="block text-sm font-medium text-slate-300"
                    >
                        {label}
                    </label>
                )}
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" />
                    <textarea
                        ref={ref}
                        id={textareaId}
                        className={cn(
                            'relative w-full px-4 py-3 bg-[#0f0f23]/80 border rounded-xl',
                            'text-slate-100 placeholder-slate-500',
                            'focus:outline-none focus:ring-2 focus:ring-primary/50',
                            'transition-all resize-none',
                            error
                                ? 'border-danger/50 focus:ring-danger/50'
                                : 'border-white/10 hover:border-white/20',
                            className
                        )}
                        {...props}
                    />
                </div>
                {error && <p className="text-sm text-danger">{error}</p>}
                {hint && !error && <p className="text-sm text-slate-500">{hint}</p>}
            </div>
        );
    }
);

Textarea.displayName = 'Textarea';
