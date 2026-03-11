"use client";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
    label: string;
    children: React.ReactNode;
    side?: 'right' | 'top' | 'bottom' | 'left';
    delay?: number;
    disabled?: boolean;
}

export default function Tooltip({ label, children, side = 'bottom', delay = 300, disabled = false }: TooltipProps) {
    const [show, setShow] = useState(false);
    const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

    const onEnter = () => {
        const t = setTimeout(() => setShow(true), delay);
        setTimer(t);
    };

    const onLeave = () => {
        if (timer) clearTimeout(timer);
        setTimer(null);
        setShow(false);
    };

    const positionClass = {
        right: 'left-full ml-2.5 top-1/2 -translate-y-1/2',
        left: 'right-full mr-2.5 top-1/2 -translate-y-1/2',
        top: 'bottom-full mb-2.5 left-1/2 -translate-x-1/2',
        bottom: 'top-full mt-2.5 left-1/2 -translate-x-1/2',
    }[side];

    const initial = {
        right: { opacity: 0, x: -4 },
        left: { opacity: 0, x: 4 },
        top: { opacity: 0, y: 4 },
        bottom: { opacity: 0, y: -4 },
    }[side];

    return (
        <div className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
            {children}
            <AnimatePresence>
                {show && !disabled && (
                    <motion.div
                        initial={{ ...initial, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                        exit={{ ...initial, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className={`absolute ${positionClass} z-[200] pointer-events-none`}
                    >
                        <div className="px-2.5 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap bg-[#1d1d1f] dark:bg-[#f5f5f7] text-white dark:text-black shadow-lg">
                            {label}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
