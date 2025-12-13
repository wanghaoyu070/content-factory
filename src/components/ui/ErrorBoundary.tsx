'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ errorInfo });

        // 这里可以添加错误上报逻辑
        // reportError(error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center p-6">
                    <div className="max-w-lg w-full glass-card rounded-2xl p-8 text-center">
                        {/* 图标 */}
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-danger/10 flex items-center justify-center">
                            <AlertTriangle className="w-10 h-10 text-danger" />
                        </div>

                        {/* 标题 */}
                        <h1 className="text-2xl font-bold text-slate-100 mb-2">
                            哎呀，出错了
                        </h1>
                        <p className="text-slate-400 mb-6">
                            页面遇到了一些问题，请尝试刷新或返回首页
                        </p>

                        {/* 错误详情（开发环境显示） */}
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="mb-6 p-4 bg-danger/5 border border-danger/20 rounded-xl text-left overflow-auto max-h-40">
                                <p className="text-sm font-mono text-danger">
                                    {this.state.error.toString()}
                                </p>
                                {this.state.errorInfo && (
                                    <pre className="text-xs text-slate-500 mt-2 whitespace-pre-wrap">
                                        {this.state.errorInfo.componentStack}
                                    </pre>
                                )}
                            </div>
                        )}

                        {/* 操作按钮 */}
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={this.handleRetry}
                                className="px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors flex items-center gap-2 btn-primary"
                            >
                                <RefreshCw className="w-4 h-4" />
                                重试
                            </button>
                            <Link
                                href="/"
                                className="px-5 py-2.5 bg-white/5 text-slate-300 rounded-xl hover:bg-white/10 transition-colors flex items-center gap-2"
                            >
                                <Home className="w-4 h-4" />
                                返回首页
                            </Link>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// 用于包装异步组件的 Suspense 边界错误处理
export function ErrorFallback({
    error,
    resetErrorBoundary
}: {
    error: Error;
    resetErrorBoundary: () => void;
}) {
    return (
        <div className="p-6 glass-card rounded-xl">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-danger" />
                </div>
                <div>
                    <h3 className="font-medium text-slate-200">加载失败</h3>
                    <p className="text-sm text-slate-400">{error.message}</p>
                </div>
            </div>
            <button
                onClick={resetErrorBoundary}
                className="px-4 py-2 text-sm bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors"
            >
                重试
            </button>
        </div>
    );
}
