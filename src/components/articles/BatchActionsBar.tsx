'use client';

import { useState, useEffect } from 'react';
import {
    CheckSquare,
    Square,
    Trash2,
    Archive,
    Download,
    Send,
    X,
    AlertTriangle,
    Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface BatchActionsBarProps {
    selectedIds: number[];
    totalCount: number;
    onSelectAll: () => void;
    onClearSelection: () => void;
    onDelete: (ids: number[]) => Promise<void>;
    onArchive?: (ids: number[]) => Promise<void>;
    onExport?: (ids: number[]) => Promise<void>;
    onPublish?: (ids: number[]) => Promise<void>;
}

export default function BatchActionsBar({
    selectedIds,
    totalCount,
    onSelectAll,
    onClearSelection,
    onDelete,
    onArchive,
    onExport,
    onPublish,
}: BatchActionsBarProps) {
    const [loading, setLoading] = useState<string | null>(null);
    const [showConfirm, setShowConfirm] = useState<'delete' | null>(null);

    // 没有选中项时不显示
    if (selectedIds.length === 0) return null;

    const handleAction = async (
        action: 'delete' | 'archive' | 'export' | 'publish',
        handler?: (ids: number[]) => Promise<void>
    ) => {
        if (!handler) return;

        setLoading(action);
        try {
            await handler(selectedIds);
            onClearSelection();
        } catch (error) {
            console.error(`${action} failed:`, error);
        } finally {
            setLoading(null);
            setShowConfirm(null);
        }
    };

    const isAllSelected = selectedIds.length === totalCount;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-fade-in-up">
            <div className="bg-[#16162a] border border-[#2d2d44] rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-4">
                {/* 选择信息 */}
                <div className="flex items-center gap-3 border-r border-[#2d2d44] pr-4">
                    <button
                        onClick={isAllSelected ? onClearSelection : onSelectAll}
                        className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors"
                    >
                        {isAllSelected ? (
                            <CheckSquare className="w-4 h-4" />
                        ) : (
                            <Square className="w-4 h-4" />
                        )}
                    </button>
                    <span className="text-sm text-slate-300">
                        已选择 <span className="font-medium text-indigo-400">{selectedIds.length}</span> 项
                    </span>
                    <button
                        onClick={onClearSelection}
                        className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-2">
                    {/* 导出 */}
                    {onExport && (
                        <button
                            onClick={() => handleAction('export', onExport)}
                            disabled={loading !== null}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all',
                                'text-slate-300 hover:bg-[#1a1a2e] hover:text-emerald-400',
                                loading === 'export' && 'opacity-50 cursor-not-allowed'
                            )}
                        >
                            {loading === 'export' ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            导出
                        </button>
                    )}

                    {/* 归档 */}
                    {onArchive && (
                        <button
                            onClick={() => handleAction('archive', onArchive)}
                            disabled={loading !== null}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all',
                                'text-slate-300 hover:bg-[#1a1a2e] hover:text-amber-400',
                                loading === 'archive' && 'opacity-50 cursor-not-allowed'
                            )}
                        >
                            {loading === 'archive' ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Archive className="w-4 h-4" />
                            )}
                            归档
                        </button>
                    )}

                    {/* 发布 */}
                    {onPublish && (
                        <button
                            onClick={() => handleAction('publish', onPublish)}
                            disabled={loading !== null}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all',
                                'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30',
                                loading === 'publish' && 'opacity-50 cursor-not-allowed'
                            )}
                        >
                            {loading === 'publish' ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                            批量发布
                        </button>
                    )}

                    {/* 删除 */}
                    <button
                        onClick={() => setShowConfirm('delete')}
                        disabled={loading !== null}
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all',
                            'text-slate-300 hover:bg-red-500/20 hover:text-red-400',
                            loading === 'delete' && 'opacity-50 cursor-not-allowed'
                        )}
                    >
                        {loading === 'delete' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Trash2 className="w-4 h-4" />
                        )}
                        删除
                    </button>
                </div>
            </div>

            {/* 删除确认弹窗 */}
            {showConfirm === 'delete' && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-[#16162a] border border-[#2d2d44] rounded-2xl p-6 max-w-sm w-full mx-4 modal-content">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-200">确认删除</h3>
                                <p className="text-sm text-slate-400">
                                    确定要删除选中的 {selectedIds.length} 篇文章吗？
                                </p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-500 mb-6">
                            此操作不可撤销，文章将被永久删除。
                        </p>
                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={() => setShowConfirm(null)}
                                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={() => handleAction('delete', onDelete)}
                                disabled={loading === 'delete'}
                                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors flex items-center gap-2"
                            >
                                {loading === 'delete' && <Loader2 className="w-4 h-4 animate-spin" />}
                                确认删除
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// 批量选择复选框组件
interface BatchSelectCheckboxProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    className?: string;
}

export function BatchSelectCheckbox({
    checked,
    onChange,
    className,
}: BatchSelectCheckboxProps) {
    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onChange(!checked);
            }}
            className={cn(
                'p-1 rounded transition-colors',
                checked
                    ? 'text-indigo-400'
                    : 'text-slate-500 hover:text-slate-300',
                className
            )}
        >
            {checked ? (
                <CheckSquare className="w-5 h-5" />
            ) : (
                <Square className="w-5 h-5" />
            )}
        </button>
    );
}
