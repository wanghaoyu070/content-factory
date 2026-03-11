"use client";
import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { THEMES, THEME_GROUPS, type Theme } from '@/lib/cockpit/themes';

// Extract representative colors from theme CSS styles
function extractStyle(styleStr: string, prop: string): string | null {
    const regex = new RegExp(`${prop}\\s*:\\s*([^;!]+)`, 'i');
    const match = styleStr.match(regex);
    return match ? match[1].trim() : null;
}

function ThemeSwatch({ styles }: { styles: Record<string, string> }) {
    const bg = extractStyle(styles.container || '', 'background-color') || '#fff';
    const textColor = extractStyle(styles.p || '', 'color') || '#333';
    const h1Color = extractStyle(styles.h1 || '', 'color') || textColor;
    const accentColor = extractStyle(styles.a || styles.blockquote || '', 'color') || h1Color;

    return (
        <div className="flex gap-0.5 h-4 rounded overflow-hidden border border-black/10 dark:border-white/10" style={{ width: '36px' }}>
            <div className="flex-1" style={{ backgroundColor: bg }} />
            <div className="flex-1" style={{ backgroundColor: h1Color }} />
            <div className="flex-1" style={{ backgroundColor: accentColor }} />
        </div>
    );
}

interface ThemePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    activeTheme: string;
    onSelectTheme: (themeId: string) => void;
}

export default function ThemePickerModal({ isOpen, onClose, activeTheme, onSelectTheme }: ThemePickerModalProps) {
    const panelRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Invisible backdrop for click-outside */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[99]"
                        onClick={onClose}
                    />
                    <motion.div
                        ref={panelRef}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                        className="fixed right-[60px] top-[60px] w-[520px] max-h-[70vh] bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-2xl border border-black/[0.06] dark:border-white/[0.06] z-[200] overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0">
                            <span className="text-[15px] font-semibold text-black dark:text-white">
                                选择排版风格 · {THEMES.length} 款
                            </span>
                            <button
                                onClick={onClose}
                                className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-[#86868b]"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Theme grid */}
                        <div className="overflow-y-auto px-5 pb-5 flex-1">
                            {THEME_GROUPS.map((group, groupIdx) => (
                                <div key={group.label}>
                                    <div className={`flex items-center gap-2 ${groupIdx > 0 ? 'mt-4 pt-4 border-t border-black/[0.06] dark:border-white/[0.06]' : 'mt-1'}`}>
                                        <span className="text-[12px] font-semibold text-[#86868b] uppercase tracking-widest">{group.label}</span>
                                        <span className="text-[11px] text-[#b0b0b5]">{group.themes.length} 款</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                        {group.themes.map((theme: Theme) => (
                                            <button
                                                key={theme.id}
                                                onClick={() => onSelectTheme(theme.id)}
                                                className={`relative flex flex-col items-start gap-1 p-2.5 rounded-xl text-left transition-all
                                                    ${activeTheme === theme.id
                                                        ? 'bg-black/5 dark:bg-white/10 ring-2 ring-black dark:ring-white'
                                                        : 'bg-[#f5f5f7] dark:bg-[#2c2c2e] hover:bg-[#ebebed] dark:hover:bg-[#3a3a3c]'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between w-full">
                                                    <ThemeSwatch styles={theme.styles} />
                                                    {activeTheme === theme.id && <span className="text-[10px]">✓</span>}
                                                </div>
                                                <span className="text-[12px] font-semibold text-black dark:text-white leading-tight">{theme.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
