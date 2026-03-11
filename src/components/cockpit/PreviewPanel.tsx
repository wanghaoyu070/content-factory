"use client";
import React from 'react';
import { motion } from 'framer-motion';
import DeviceFrame from './DeviceFrame';
import { sanitizeHtml } from '@/lib/sanitize';

interface PreviewPanelProps {
    renderedHtml: string;
    deviceWidthClass: string;
    previewDevice: 'mobile' | 'pc';
    previewRef: React.RefObject<HTMLDivElement | null>;
    previewOuterScrollRef: React.RefObject<HTMLDivElement | null>;
    previewInnerScrollRef: React.RefObject<HTMLDivElement | null>;
    onPreviewOuterScroll: () => void;
    onPreviewInnerScroll: () => void;
    scrollSyncEnabled: boolean;
    activeTheme?: string;
}

export default function PreviewPanel({
    renderedHtml,
    deviceWidthClass,
    previewDevice,
    previewRef,
    previewOuterScrollRef,
    previewInnerScrollRef,
    onPreviewOuterScroll,
    onPreviewInnerScroll,
    scrollSyncEnabled,
    activeTheme
}: PreviewPanelProps) {
    const isFramedDevice = previewDevice !== 'pc';
    const safeHtml = sanitizeHtml(renderedHtml);

    return (
        <div
            ref={previewOuterScrollRef}
            onScroll={scrollSyncEnabled && !isFramedDevice ? onPreviewOuterScroll : undefined}
            className="relative overflow-y-auto no-scrollbar bg-slate-100/60 dark:bg-[#000000] flex flex-col z-20 flex-1 min-h-0 w-full overflow-x-hidden"
        >
            <motion.div
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                className={`${deviceWidthClass} ${isFramedDevice ? 'self-center mt-4 mb-8 px-4 lg:px-8' : 'mt-8 mb-32 ml-4 md:ml-6 mr-auto'} h-fit min-h-[calc(100%-48px)] flex items-start justify-center relative`}
            >
                {isFramedDevice ? (
                    <DeviceFrame
                        device={previewDevice as 'mobile'}
                        scrollRef={previewInnerScrollRef}
                        onScroll={scrollSyncEnabled ? onPreviewInnerScroll : undefined}
                        activeTheme={activeTheme}
                    >
                        <div
                            ref={previewRef}
                            dangerouslySetInnerHTML={{ __html: safeHtml }}
                            className="preview-content min-w-full transition-opacity duration-150"
                        />
                    </DeviceFrame>
                ) : (
                    <div className="bg-white dark:bg-[#1c1c1e] rounded-[20px] overflow-hidden transition-all duration-500 ring-1 ring-black/[0.06] dark:ring-white/[0.06] w-full"
                        style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)' }}
                    >
                        {/* Document top bar */}
                        <div className="h-8 bg-[#f8f8f8] dark:bg-[#2c2c2e] border-b border-black/[0.04] dark:border-white/[0.04] flex items-center px-3.5 gap-1.5">
                            <div className="w-[9px] h-[9px] rounded-full bg-[#ff5f57] opacity-60" />
                            <div className="w-[9px] h-[9px] rounded-full bg-[#febc2e] opacity-60" />
                            <div className="w-[9px] h-[9px] rounded-full bg-[#28c840] opacity-60" />
                        </div>
                        <div
                            ref={previewRef}
                            dangerouslySetInnerHTML={{ __html: safeHtml }}
                            className="preview-content min-w-full transition-opacity duration-150"
                        />
                    </div>
                )}
            </motion.div>
        </div>
    );
}
