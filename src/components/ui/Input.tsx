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
                        className="block text-sm font-medium text-[#1A1A1A]"
                    >
                        {label}
                    </label>
                )}
                <div className="relative group">
                    {icon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]">
                            {icon}
                        </div>
                    )}
                    {/* Focus ring */}
                    <div className="absolute inset-0 rounded-xl ring-2 ring-transparent group-focus-within:ring-[rgba(0,0,0,0.08)] transition-all pointer-events-none" />
                    <input
                        ref={ref}
                        id={inputId}
                        className={cn(
                            'relative w-full px-4 py-3 bg-white border rounded-xl',
                            'text-[#1A1A1A] placeholder-[#999]',
                            'focus:outline-none focus:ring-2 focus:ring-[rgba(0,0,0,0.08)]',
                            'transition-all',
                            icon && 'pl-10',
                            error
                                ? 'border-danger/50 focus:ring-danger/50'
                                : 'border-[rgba(0,0,0,0.1)] hover:border-[rgba(0,0,0,0.2)]',
                            className
                        )}
                        {...props}
                    />
                </div>
                {error && <p className="text-sm text-danger">{error}</p>}
                {hint && !error && <p className="text-sm text-[#999]">{hint}</p>}
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
                        className="block text-sm font-medium text-[#1A1A1A]"
                    >
                        {label}
                    </label>
                )}
                <div className="relative group">
                    <div className="absolute inset-0 rounded-xl ring-2 ring-transparent group-focus-within:ring-[rgba(0,0,0,0.08)] transition-all pointer-events-none" />
                    <textarea
                        ref={ref}
                        id={textareaId}
                        className={cn(
                            'relative w-full px-4 py-3 bg-white border rounded-xl',
                            'text-[#1A1A1A] placeholder-[#999]',
                            'focus:outline-none focus:ring-2 focus:ring-[rgba(0,0,0,0.08)]',
                            'transition-all resize-none',
                            error
                                ? 'border-danger/50 focus:ring-danger/50'
                                : 'border-[rgba(0,0,0,0.1)] hover:border-[rgba(0,0,0,0.2)]',
                            className
                        )}
                        {...props}
                    />
                </div>
                {error && <p className="text-sm text-danger">{error}</p>}
                {hint && !error && <p className="text-sm text-[#999]">{hint}</p>}
            </div>
        );
    }
);

Textarea.displayName = 'Textarea';
