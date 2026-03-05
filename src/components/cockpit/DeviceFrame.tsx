"use client";
import React from 'react';

interface DeviceFrameProps {
    device: 'mobile' | 'tablet';
    children: React.ReactNode;
    scrollRef?: React.RefObject<HTMLDivElement | null>;
    onScroll?: () => void;
    activeTheme?: string;
}

export default function DeviceFrame({ device, children, scrollRef, onScroll }: DeviceFrameProps) {
    const isMobile = device === 'mobile';
    const frameClass = isMobile ? 'preview-device-mobile' : 'preview-device-tablet';

    return (
        <div className={`preview-device-shell ${frameClass}`}>
            <div className="preview-device-screen">
                {/* Content fills the entire screen — no chrome */}
                <div
                    ref={scrollRef}
                    onScroll={onScroll}
                    className="preview-device-scroll no-scrollbar"
                    style={{ flex: 1, minHeight: 0 }}
                >
                    {children}
                </div>
            </div>
        </div>
    );
}
