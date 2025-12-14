'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Plus, Hash, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface XhsTagsManagerProps {
    tags: string[];
    onChange: (tags: string[]) => void;
    suggestedTags?: string[];
    maxTags?: number;
    className?: string;
}

// 热门话题标签（可后续从 API 获取）
const popularTags = [
    '干货分享', '自律打卡', '职场成长', '学习笔记', '效率提升',
    '知识分享', '成长日记', '办公神器', '技能提升', '每日精进',
];

export function XhsTagsManager({
    tags,
    onChange,
    suggestedTags = [],
    maxTags = 10,
    className,
}: XhsTagsManagerProps) {
    const [inputValue, setInputValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // 添加标签
    const addTag = (tag: string) => {
        const cleanTag = tag.trim().replace(/^#/, '');
        if (!cleanTag) return;
        if (tags.length >= maxTags) return;
        if (tags.includes(cleanTag)) return;

        onChange([...tags, cleanTag]);
        setInputValue('');
    };

    // 删除标签
    const removeTag = (index: number) => {
        onChange(tags.filter((_, i) => i !== index));
    };

    // 处理键盘事件
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(inputValue);
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            removeTag(tags.length - 1);
        }
    };

    // 合并推荐标签（去重）
    const allSuggestions = [...new Set([...suggestedTags, ...popularTags])].filter(
        tag => !tags.includes(tag)
    ).slice(0, 8);

    // 字数统计（小红书话题字符计算）
    const totalChars = tags.reduce((sum, tag) => sum + tag.length + 1, 0); // +1 for #

    return (
        <div className={cn('space-y-3', className)}>
            {/* 标签输入区 */}
            <div
                className={cn(
                    'p-3 rounded-xl border transition-colors min-h-[80px]',
                    isFocused ? 'border-indigo-500 bg-[#1a1a2e]' : 'border-[#2d2d44] bg-[#16162a]'
                )}
                onClick={() => inputRef.current?.focus()}
            >
                <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                        <span
                            key={index}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-500/20 text-red-400 rounded-full text-sm group"
                        >
                            <Hash className="w-3 h-3" />
                            {tag}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeTag(index);
                                }}
                                className="ml-0.5 p-0.5 hover:bg-red-500/30 rounded-full transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}

                    {tags.length < maxTags && (
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            placeholder={tags.length === 0 ? '输入话题标签，按回车添加' : '继续添加...'}
                            className="flex-1 min-w-[120px] bg-transparent text-slate-200 placeholder-slate-500 text-sm outline-none"
                        />
                    )}
                </div>
            </div>

            {/* 状态提示 */}
            <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                    {tags.length === 0 ? (
                        <span className="text-amber-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            建议添加 3-5 个话题标签
                        </span>
                    ) : tags.length >= 3 ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            标签数量合适
                        </span>
                    ) : (
                        <span className="text-slate-500">
                            已添加 {tags.length} / {maxTags} 个标签
                        </span>
                    )}
                </div>
                <span className="text-slate-600">
                    {totalChars} 字符
                </span>
            </div>

            {/* 推荐标签 */}
            {allSuggestions.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Sparkles className="w-3 h-3" />
                        推荐话题
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {allSuggestions.map((tag) => (
                            <button
                                key={tag}
                                onClick={() => addTag(tag)}
                                disabled={tags.length >= maxTags}
                                className={cn(
                                    'px-2 py-1 text-xs rounded-full transition-all',
                                    tags.length >= maxTags
                                        ? 'bg-slate-700/30 text-slate-600 cursor-not-allowed'
                                        : 'bg-[#1a1a2e] text-slate-400 hover:bg-red-500/10 hover:text-red-400 border border-[#2d2d44] hover:border-red-500/30'
                                )}
                            >
                                <span className="text-red-400/50">#</span>
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 提示说明 */}
            <div className="text-xs text-slate-600 bg-[#1a1a2e] rounded-lg p-3">
                <p className="mb-1">💡 <strong>话题标签技巧：</strong></p>
                <ul className="space-y-0.5 text-slate-500">
                    <li>• 使用热门话题可获得更多曝光</li>
                    <li>• 建议 3-5 个标签，避免过多</li>
                    <li>• 选择与内容相关的话题</li>
                </ul>
            </div>
        </div>
    );
}
