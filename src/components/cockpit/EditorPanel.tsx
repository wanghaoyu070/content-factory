"use client";
import React, { useRef, useCallback } from 'react';
import { handleSmartPaste } from '@/lib/cockpit/htmlToMarkdown';
import { addImage } from '@/lib/cockpit/imageStore';

interface EditorPanelProps {
    markdownInput: string;
    onInputChange: (value: string) => void;
    editorScrollRef: React.RefObject<HTMLTextAreaElement | null>;
    onEditorScroll: () => void;
    scrollSyncEnabled: boolean;
    onUndo: () => void;
    onRedo: () => void;
}

// Inject styles once
let styleInjected = false;
function injectDropStyles() {
    if (styleInjected) return;
    const style = document.createElement('style');
    style.textContent = `
        .editor-drop-active {
            box-shadow: inset 0 0 0 2px rgba(10,132,255,0.35), 0 0 20px rgba(10,132,255,0.08) !important;
            transition: box-shadow 0.25s ease;
        }
        .editor-drop-line {
            position: fixed;
            height: 2px;
            background: linear-gradient(90deg, transparent 0%, #0a84ff 8%, #0a84ff 92%, transparent 100%);
            border-radius: 1px;
            z-index: 100000;
            pointer-events: none;
            transition: top 0.08s ease-out, opacity 0.15s ease;
            box-shadow: 0 0 8px rgba(10,132,255,0.35);
        }
    `;
    document.head.appendChild(style);
    styleInjected = true;
}

/**
 * Create a mirror <pre> to detect character offset from screen coordinates.
 */
function createMirror(textarea: HTMLTextAreaElement): HTMLPreElement {
    const mirror = document.createElement('pre');
    const cs = window.getComputedStyle(textarea);
    const rect = textarea.getBoundingClientRect();

    mirror.style.cssText = `
        position:fixed; left:${rect.left}px; top:${rect.top}px;
        width:${rect.width}px; height:${rect.height}px;
        padding:${cs.padding}; font:${cs.font};
        letter-spacing:${cs.letterSpacing}; line-height:${cs.lineHeight};
        white-space:pre-wrap; word-wrap:break-word; overflow-wrap:break-word;
        overflow:hidden; box-sizing:${cs.boxSizing}; border:${cs.border};
        margin:0; z-index:99999; opacity:0.01; color:transparent;
    `;
    mirror.textContent = textarea.value;
    document.body.appendChild(mirror);
    mirror.scrollTop = textarea.scrollTop;
    void mirror.offsetHeight;
    return mirror;
}

/**
 * Get character offset at screen coordinates via mirror + caretRangeFromPoint.
 */
function getCharOffset(mirror: HTMLPreElement, x: number, y: number, maxLen: number): number {
    if (!document.caretRangeFromPoint) return 0;
    const range = document.caretRangeFromPoint(x, y);
    if (!range || !mirror.contains(range.startContainer)) return 0;

    const walker = document.createTreeWalker(mirror, NodeFilter.SHOW_TEXT);
    let offset = 0;
    let node: Node | null;
    while ((node = walker.nextNode())) {
        if (node === range.startContainer) {
            offset += range.startOffset;
            break;
        }
        offset += (node.textContent || '').length;
    }
    return Math.min(Math.max(0, offset), maxLen);
}

/**
 * Snap a character offset to the nearest line boundary.
 */
function snapToLineBoundary(text: string, offset: number): number {
    const before = text.lastIndexOf('\n', offset - 1);
    const lineStart = before === -1 ? 0 : before + 1;
    const after = text.indexOf('\n', offset);
    const lineEnd = after === -1 ? text.length : after;
    const distToStart = offset - lineStart;
    const distToEnd = lineEnd - offset;

    if (distToStart <= distToEnd) {
        return lineStart;
    } else {
        return lineEnd === text.length ? lineEnd : lineEnd + 1;
    }
}

export default function EditorPanel({ markdownInput, onInputChange, editorScrollRef, onEditorScroll, scrollSyncEnabled, onUndo, onRedo }: EditorPanelProps) {
    const dropLineRef = useRef<HTMLDivElement | null>(null);
    const isDraggingRef = useRef(false);

    const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        handleSmartPaste(e, markdownInput, onInputChange);
    };

    // Wrap selected text with prefix/suffix using execCommand to preserve undo stack
    const wrapSelection = useCallback((prefix: string, suffix: string) => {
        const textarea = editorScrollRef.current;
        if (!textarea) return;
        textarea.focus();

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = textarea.value.substring(start, end);

        textarea.setSelectionRange(start, end);
        const replacement = prefix + selected + suffix;
        document.execCommand('insertText', false, replacement);

        if (selected) {
            textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
        } else {
            textarea.setSelectionRange(start + prefix.length, start + prefix.length);
        }
    }, [editorScrollRef]);

    // Insert a block template at cursor
    const insertBlock = useCallback((block: string) => {
        const textarea = editorScrollRef.current;
        if (!textarea) return;
        textarea.focus();

        const pos = textarea.selectionStart;
        const before = textarea.value.substring(0, pos);
        const needNewlineBefore = before.length > 0 && !before.endsWith('\n');
        const insertion = (needNewlineBefore ? '\n' : '') + block + '\n';

        textarea.setSelectionRange(pos, pos);
        document.execCommand('insertText', false, insertion);

        const cursorPos = pos + (needNewlineBefore ? 1 : 0) + block.indexOf('\n') + 1;
        textarea.setSelectionRange(cursorPos, cursorPos);
    }, [editorScrollRef]);

    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const mod = e.metaKey || e.ctrlKey;
        if (!mod) return;

        switch (e.key) {
            case 'b':
                e.preventDefault();
                wrapSelection('**', '**');
                break;
            case 'i':
                e.preventDefault();
                wrapSelection('*', '*');
                break;
            case 'k':
                e.preventDefault();
                if (e.shiftKey) {
                    insertBlock('```\n\n```');
                } else {
                    const textarea = editorScrollRef.current;
                    if (!textarea) return;
                    const selected = markdownInput.substring(textarea.selectionStart, textarea.selectionEnd);
                    if (selected) {
                        wrapSelection('[', '](url)');
                    } else {
                        wrapSelection('[链接文字](', ')');
                    }
                }
                break;
            case 'z':
                e.preventDefault();
                if (e.shiftKey) {
                    onRedo();
                } else {
                    onUndo();
                }
                break;
        }
    };

    // Drop line indicator for image drag-drop
    const showDropLine = useCallback((textarea: HTMLTextAreaElement, clientY: number) => {
        injectDropStyles();
        const cs = window.getComputedStyle(textarea);
        const rect = textarea.getBoundingClientRect();
        const paddingLeft = parseFloat(cs.paddingLeft);
        const paddingRight = parseFloat(cs.paddingRight);
        const paddingTop = parseFloat(cs.paddingTop);
        const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.8;
        const relY = clientY - rect.top - paddingTop + textarea.scrollTop;
        const lineIndex = Math.round(relY / lineHeight);
        const snappedY = rect.top + paddingTop + lineIndex * lineHeight - textarea.scrollTop;
        const clampedY = Math.max(rect.top + paddingTop, Math.min(snappedY, rect.bottom - parseFloat(cs.paddingBottom)));

        if (!dropLineRef.current) {
            const el = document.createElement('div');
            el.className = 'editor-drop-line';
            document.body.appendChild(el);
            dropLineRef.current = el;
        }

        const line = dropLineRef.current;
        line.style.left = `${rect.left + paddingLeft}px`;
        line.style.top = `${clampedY}px`;
        line.style.width = `${rect.width - paddingLeft - paddingRight}px`;
        line.style.opacity = '1';
    }, []);

    const hideDropLine = useCallback(() => {
        const el = dropLineRef.current;
        if (!el) return;
        el.style.opacity = '0';
        dropLineRef.current = null;
        setTimeout(() => el.remove(), 160);
    }, []);

    const setEditorDropActive = useCallback((textarea: HTMLTextAreaElement, active: boolean) => {
        if (active) textarea.classList.add('editor-drop-active');
        else textarea.classList.remove('editor-drop-active');
    }, []);

    const onDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
        e.preventDefault();
        if (!isDraggingRef.current) {
            isDraggingRef.current = true;
            setEditorDropActive(e.currentTarget, true);
        }
        showDropLine(e.currentTarget, e.clientY);
    };

    const onDragLeave = (e: React.DragEvent<HTMLTextAreaElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const { clientX, clientY } = e;
        if (clientX <= rect.left || clientX >= rect.right || clientY <= rect.top || clientY >= rect.bottom) {
            isDraggingRef.current = false;
            hideDropLine();
            setEditorDropActive(e.currentTarget, false);
        }
    };

    const onDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
        isDraggingRef.current = false;
        hideDropLine();
        setEditorDropActive(e.currentTarget, false);

        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        if (files.length === 0) return;

        e.preventDefault();
        const textarea = e.currentTarget;
        const mirror = createMirror(textarea);
        const rawOffset = getCharOffset(mirror, e.clientX, e.clientY, markdownInput.length);
        mirror.remove();
        const insertPos = snapToLineBoundary(markdownInput, rawOffset);

        Promise.all(files.map(file => {
            return new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result || ''));
                reader.onerror = () => reject(new Error('Failed to read dropped image'));
                reader.readAsDataURL(file);
            });
        })).then(dataUrls => {
            const markdownImages = dataUrls
                .filter(Boolean)
                .map((dataUrl, index) => {
                    const refUrl = addImage(dataUrl);
                    return `![图片${dataUrls.length > 1 ? ` ${index + 1}` : ''}](${refUrl})`;
                })
                .join('\n\n');

            if (!markdownImages) return;

            const before = markdownInput.substring(0, insertPos);
            const after = markdownInput.substring(insertPos);
            const needNewlineBefore = before.length > 0 && !before.endsWith('\n');
            const needNewlineAfter = after.length > 0 && !after.startsWith('\n');
            const finalInsert = (needNewlineBefore ? '\n' : '') + markdownImages + (needNewlineAfter ? '\n' : '');
            onInputChange(before + finalInsert + after);
        });
    };

    return (
        <div className="flex flex-col relative z-30 bg-transparent flex-1 min-h-0">
            <textarea
                ref={editorScrollRef}
                className="w-full flex-1 p-6 md:p-8 resize-none bg-transparent outline-none font-mono text-[15px] md:text-[16px] leading-[1.8] no-scrollbar text-slate-800 placeholder-slate-400 transition-shadow duration-200"
                value={markdownInput}
                onChange={(e) => onInputChange(e.target.value)}
                onPaste={onPaste}
                onKeyDown={onKeyDown}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onScroll={scrollSyncEnabled ? onEditorScroll : undefined}
                placeholder="在这里输入 Markdown 内容..."
                spellCheck={false}
            />

            {/* Bottom Info Bar */}
            <div className="flex-shrink-0 flex items-center justify-between gap-2 px-4 sm:px-6 py-2.5 border-t border-slate-200 bg-slate-50/80">
                <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1"><kbd className="inline-flex items-center justify-center min-w-[20px] h-[18px] px-1 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono font-medium">⌘B</kbd> 加粗</span>
                    <span className="flex items-center gap-1"><kbd className="inline-flex items-center justify-center min-w-[20px] h-[18px] px-1 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono font-medium">⌘I</kbd> 斜体</span>
                    <span className="flex items-center gap-1"><kbd className="inline-flex items-center justify-center min-w-[20px] h-[18px] px-1 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono font-medium">⌘K</kbd> 链接</span>
                    <span className="flex items-center gap-1"><kbd className="inline-flex items-center justify-center min-w-[20px] h-[18px] px-1 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono font-medium">⌘Z</kbd> 撤销</span>
                </div>
                <div className="sm:hidden text-[11.5px] text-slate-400">
                    支持粘贴富文本 · 拖放图片
                </div>
                <div className="text-[11.5px] font-mono text-slate-400">
                    {markdownInput.length} 字
                </div>
            </div>
        </div>
    );
}
