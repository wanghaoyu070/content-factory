'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Command,
    X,
    Search,
    PenTool,
    FileText,
    Settings,
    LayoutDashboard,
    Keyboard
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Shortcut {
    keys: string[];
    label: string;
    description: string;
    action: () => void;
    category: 'navigation' | 'action';
}

export function KeyboardShortcuts() {
    const router = useRouter();
    const [showHelp, setShowHelp] = useState(false);

    // 快捷键定义
    const shortcuts: Shortcut[] = [
        // 导航快捷键
        {
            keys: ['g', 'd'],
            label: 'G D',
            description: '前往仪表盘',
            action: () => router.push('/'),
            category: 'navigation',
        },
        {
            keys: ['g', 'a'],
            label: 'G A',
            description: '前往选题分析',
            action: () => router.push('/analysis'),
            category: 'navigation',
        },
        {
            keys: ['g', 'c'],
            label: 'G C',
            description: '前往内容创作',
            action: () => router.push('/create'),
            category: 'navigation',
        },
        {
            keys: ['g', 'p'],
            label: 'G P',
            description: '前往发布管理',
            action: () => router.push('/articles'),
            category: 'navigation',
        },
        {
            keys: ['g', 's'],
            label: 'G S',
            description: '前往设置',
            action: () => router.push('/settings'),
            category: 'navigation',
        },
        // 操作快捷键
        {
            keys: ['?'],
            label: '?',
            description: '显示快捷键帮助',
            action: () => setShowHelp(true),
            category: 'action',
        },
    ];

    // 处理键盘事件
    const [keySequence, setKeySequence] = useState<string[]>([]);
    const sequenceTimeoutRef = { current: null as NodeJS.Timeout | null };

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // 忽略输入框中的按键
        if (
            e.target instanceof HTMLInputElement ||
            e.target instanceof HTMLTextAreaElement ||
            e.target instanceof HTMLSelectElement ||
            (e.target as HTMLElement).isContentEditable
        ) {
            return;
        }

        // Escape 关闭帮助
        if (e.key === 'Escape' && showHelp) {
            setShowHelp(false);
            return;
        }

        const key = e.key.toLowerCase();

        // 清除之前的超时
        if (sequenceTimeoutRef.current) {
            clearTimeout(sequenceTimeoutRef.current);
        }

        // 添加到序列
        const newSequence = [...keySequence, key];
        setKeySequence(newSequence);

        // 检查是否匹配快捷键
        for (const shortcut of shortcuts) {
            if (
                shortcut.keys.length === newSequence.length &&
                shortcut.keys.every((k, i) => k === newSequence[i])
            ) {
                e.preventDefault();
                shortcut.action();
                setKeySequence([]);
                return;
            }
        }

        // 检查是否有可能匹配的快捷键
        const hasPotentialMatch = shortcuts.some(
            (s) =>
                s.keys.length > newSequence.length &&
                s.keys.slice(0, newSequence.length).every((k, i) => k === newSequence[i])
        );

        if (!hasPotentialMatch) {
            // 没有可能匹配，重置
            setKeySequence([]);
        } else {
            // 设置超时重置
            sequenceTimeoutRef.current = setTimeout(() => {
                setKeySequence([]);
            }, 1000);
        }
    }, [keySequence, shortcuts, showHelp, router]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (sequenceTimeoutRef.current) {
                clearTimeout(sequenceTimeoutRef.current);
            }
        };
    }, [handleKeyDown]);

    // 帮助弹窗
    if (!showHelp) {
        return null;
    }

    const navigationShortcuts = shortcuts.filter((s) => s.category === 'navigation');
    const actionShortcuts = shortcuts.filter((s) => s.category === 'action');

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => setShowHelp(false)}
            />
            <div className="relative w-full max-w-lg bg-[#16162a] rounded-2xl border border-[#2d2d44] shadow-2xl overflow-hidden animate-slide-up">
                {/* 头部 */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#2d2d44]">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Keyboard className="w-5 h-5 text-indigo-400" />
                        键盘快捷键
                    </h2>
                    <button
                        onClick={() => setShowHelp(false)}
                        className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-[#2d2d44] rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 内容 */}
                <div className="p-6 space-y-6">
                    {/* 导航 */}
                    <div>
                        <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                            <Command className="w-4 h-4" />
                            导航快捷键
                        </h3>
                        <div className="space-y-2">
                            {navigationShortcuts.map((shortcut) => (
                                <div
                                    key={shortcut.label}
                                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#1a1a2e]"
                                >
                                    <span className="text-sm text-slate-300">{shortcut.description}</span>
                                    <kbd className="px-2 py-1 bg-[#2d2d44] rounded text-xs text-slate-400 font-mono">
                                        {shortcut.label}
                                    </kbd>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 操作 */}
                    <div>
                        <h3 className="text-sm font-medium text-slate-400 mb-3">
                            其他快捷键
                        </h3>
                        <div className="space-y-2">
                            {actionShortcuts.map((shortcut) => (
                                <div
                                    key={shortcut.label}
                                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#1a1a2e]"
                                >
                                    <span className="text-sm text-slate-300">{shortcut.description}</span>
                                    <kbd className="px-2 py-1 bg-[#2d2d44] rounded text-xs text-slate-400 font-mono">
                                        {shortcut.label}
                                    </kbd>
                                </div>
                            ))}
                            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#1a1a2e]">
                                <span className="text-sm text-slate-300">关闭弹窗</span>
                                <kbd className="px-2 py-1 bg-[#2d2d44] rounded text-xs text-slate-400 font-mono">
                                    ESC
                                </kbd>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 底部 */}
                <div className="px-6 py-4 border-t border-[#2d2d44] bg-[#1a1a2e]/50">
                    <p className="text-xs text-slate-500 text-center">
                        按 <kbd className="px-1.5 py-0.5 bg-[#2d2d44] rounded text-slate-400">?</kbd> 随时查看快捷键
                    </p>
                </div>
            </div>
        </div>
    );
}
