'use client';

import { useEffect, useCallback, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    subtitle?: string;
    children: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    showCloseButton?: boolean;
    closeOnOverlayClick?: boolean;
    closeOnEscape?: boolean;
    footer?: ReactNode;
}

const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl',
};

export function Modal({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
    size = 'md',
    showCloseButton = true,
    closeOnOverlayClick = true,
    closeOnEscape = true,
    footer,
}: ModalProps) {
    // ESC 键关闭
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (closeOnEscape && e.key === 'Escape') {
                onClose();
            }
        },
        [closeOnEscape, onClose]
    );

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* 背景遮罩 */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm modal-backdrop"
                onClick={closeOnOverlayClick ? onClose : undefined}
            />

            {/* 模态框内容 */}
            <div
                className={cn(
                    'relative w-full glass-card rounded-2xl overflow-hidden modal-content',
                    sizeStyles[size]
                )}
            >
                {/* 头部 */}
                {(title || showCloseButton) && (
                    <div className="flex items-start justify-between p-6 border-b border-white/5">
                        <div>
                            {title && (
                                <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
                            )}
                            {subtitle && (
                                <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
                            )}
                        </div>
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                )}

                {/* 内容 */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">{children}</div>

                {/* 底部 */}
                {footer && (
                    <div className="p-6 border-t border-white/5 flex items-center justify-end gap-3">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}

// 确认对话框
export interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    loading?: boolean;
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = '确认',
    cancelText = '取消',
    variant = 'danger',
    loading = false,
}: ConfirmModalProps) {
    const variantStyles = {
        danger: 'bg-danger text-white hover:bg-danger/80',
        warning: 'bg-warning text-black hover:bg-warning/80',
        info: 'bg-primary text-white hover:bg-primary-hover',
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="sm"
            footer={
                <>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={cn(
                            'px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2',
                            variantStyles[variant],
                            loading && 'opacity-50 cursor-not-allowed'
                        )}
                    >
                        {loading && (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        )}
                        {confirmText}
                    </button>
                </>
            }
        >
            <p className="text-slate-300">{message}</p>
        </Modal>
    );
}
