'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, ArrowLeft } from 'lucide-react';
import dynamic from 'next/dynamic';

interface HeaderProps {
  title: string;
  action?: React.ReactNode;
}

const UserMenu = dynamic(() => import('@/components/ui/UserMenu'), { ssr: false });
const MobileDrawer = dynamic(() => import('@/components/layout/MobileDrawer'), { ssr: false });

// 二级页面配置：路径 -> 兜底返回目标
const secondaryPages: Record<string, string> = {
  '/admin': '/',
  '/settings': '/',
};

// 动态路由的二级页面匹配
const secondaryPatterns = [
  { pattern: /^\/articles\/[^/]+$/, fallback: '/articles' },
  { pattern: /^\/analysis\/history\/[^/]+$/, fallback: '/analysis/history' },
  { pattern: /^\/analysis\/history$/, fallback: '/analysis' },
];

// 边缘滑动阈值（从屏幕左边缘多少像素内开始滑动才触发）
const EDGE_THRESHOLD = 20;
// 滑动多少像素后触发打开
const SWIPE_THRESHOLD = 50;

export default function Header({ title, action }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; isEdge: boolean } | null>(null);

  // 全局手势监听：从屏幕左边缘向右滑动打开抽屉
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      const isEdge = touch.clientX <= EDGE_THRESHOLD;
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        isEdge,
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current?.isEdge) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

      // 水平滑动距离大于垂直滑动，且向右滑动超过阈值
      if (deltaX > SWIPE_THRESHOLD && deltaX > deltaY * 2) {
        setDrawerOpen(true);
        touchStartRef.current = null;
      }
    };

    const handleTouchEnd = () => {
      touchStartRef.current = null;
    };

    // 只在移动端添加监听
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      document.addEventListener('touchstart', handleTouchStart, { passive: true });
      document.addEventListener('touchmove', handleTouchMove, { passive: true });
      document.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // 判断是否为二级页面
  const getSecondaryPageFallback = useCallback(() => {
    // 精确匹配
    if (secondaryPages[pathname]) {
      return secondaryPages[pathname];
    }
    // 模式匹配
    for (const { pattern, fallback } of secondaryPatterns) {
      if (pattern.test(pathname)) {
        return fallback;
      }
    }
    return null;
  }, [pathname]);

  const fallbackPath = getSecondaryPageFallback();
  const isSecondaryPage = fallbackPath !== null;

  // 返回按钮处理：优先 history.back()，兜底跳转父级页面
  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
    } else if (fallbackPath) {
      router.push(fallbackPath);
    } else {
      router.push('/');
    }
  }, [router, fallbackPath]);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <>
      <header className="h-16 sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6 backdrop-blur-xl bg-[#0f0f23]/80 border-b border-[#2d2d44]">
        {/* 左侧：返回按钮/汉堡菜单 + 标题 */}
        <div className="flex items-center gap-3">
          {/* 移动端：二级页面显示返回按钮，否则显示汉堡菜单 */}
          <div className="lg:hidden">
            {isSecondaryPage ? (
              <button
                onClick={handleBack}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#1a1a2e] active:bg-[#24243a] transition-colors"
                aria-label="返回"
              >
                <ArrowLeft className="w-5 h-5 text-slate-300" />
              </button>
            ) : (
              <button
                onClick={openDrawer}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#1a1a2e] active:bg-[#24243a] transition-colors"
                aria-label="打开菜单"
              >
                <Menu className="w-5 h-5 text-slate-300" />
              </button>
            )}
          </div>

          <h1 className="text-lg lg:text-xl font-semibold text-slate-100">{title}</h1>
        </div>

        {/* 右侧：操作按钮 + 用户菜单 */}
        <div className="flex items-center gap-2 lg:gap-4">
          {/* 移动端二级页面：显示汉堡菜单按钮 */}
          {isSecondaryPage && (
            <button
              onClick={openDrawer}
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#1a1a2e] active:bg-[#24243a] transition-colors"
              aria-label="打开菜单"
            >
              <Menu className="w-5 h-5 text-slate-300" />
            </button>
          )}
          {action}
          <div className="hidden lg:block">
            <UserMenu />
          </div>
        </div>
      </header>

      {/* 移动端抽屉导航 */}
      <MobileDrawer isOpen={drawerOpen} onClose={closeDrawer} />
    </>
  );
}
