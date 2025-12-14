'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Search,
  FileText,
  Settings,
  PenTool,
  Shield,
  LogOut,
  X,
} from 'lucide-react';
import Logo from '@/components/icons/Logo';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: '仪表盘', icon: LayoutDashboard },
  { href: '/analysis', label: '选题分析', icon: Search },
  { href: '/create', label: '内容创作', icon: PenTool },
  { href: '/articles', label: '发布管理', icon: FileText },
  { href: '/settings', label: '设置', icon: Settings },
];

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const drawerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchCurrent, setTouchCurrent] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const user = session?.user;
  const isAdmin = user?.role === 'admin';

  // 关闭抽屉时重置状态
  useEffect(() => {
    if (!isOpen) {
      setTouchStart(null);
      setTouchCurrent(null);
      setIsDragging(false);
    }
  }, [isOpen]);

  // 禁止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // 手势处理：开始触摸
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
    setIsDragging(true);
  }, []);

  // 手势处理：触摸移动
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStart === null) return;
    setTouchCurrent(e.touches[0].clientX);
  }, [touchStart]);

  // 手势处理：触摸结束
  const handleTouchEnd = useCallback(() => {
    if (touchStart === null || touchCurrent === null) {
      setIsDragging(false);
      return;
    }

    const diff = touchStart - touchCurrent;
    // 向左滑动超过 80px 则关闭
    if (diff > 80) {
      onClose();
    }

    setTouchStart(null);
    setTouchCurrent(null);
    setIsDragging(false);
  }, [touchStart, touchCurrent, onClose]);

  // 计算抽屉的位移
  const getDrawerTransform = () => {
    if (!isDragging || touchStart === null || touchCurrent === null) {
      return isOpen ? 'translateX(0)' : 'translateX(-100%)';
    }
    const diff = touchStart - touchCurrent;
    if (diff > 0) {
      // 向左滑动，限制最大位移
      const translateX = Math.min(diff, 280);
      return `translateX(-${translateX}px)`;
    }
    return 'translateX(0)';
  };

  const handleNavClick = () => {
    onClose();
  };

  if (!isOpen && !isDragging) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-50">
      {/* 遮罩层 */}
      <div
        className={cn(
          'absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />

      {/* 抽屉 */}
      <div
        ref={drawerRef}
        className={cn(
          'absolute left-0 top-0 h-full w-[280px] bg-[#0f0f23] border-r border-[#2d2d44] flex flex-col',
          !isDragging && 'transition-transform duration-300 ease-out'
        )}
        style={{ transform: getDrawerTransform() }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* 头部：Logo + 关闭按钮 */}
        <div className="p-4 border-b border-[#2d2d44] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3" onClick={handleNavClick}>
            <Logo className="w-9 h-9 flex-shrink-0" />
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              内容工厂
            </span>
          </Link>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1a1a2e] transition-colors"
            aria-label="关闭菜单"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* 用户信息 */}
        {user && (
          <div className="p-4 border-b border-[#2d2d44]">
            <div className="flex items-center gap-3">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name || 'avatar'}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-lg">
                  {user.name?.[0] || user.githubLogin?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">
                  {user.name || user.githubLogin || '未命名用户'}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  @{user.githubLogin || 'GitHub 用户'}
                </p>
                <span className={cn(
                  'inline-block mt-1 px-2 py-0.5 text-xs rounded-full',
                  isAdmin
                    ? 'bg-indigo-500/20 text-indigo-300'
                    : 'bg-slate-500/20 text-slate-400'
                )}>
                  {isAdmin ? '管理员' : '普通用户'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 导航列表 */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={handleNavClick}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
                        : 'text-slate-400 hover:bg-[#1a1a2e] hover:text-white active:bg-[#24243a]'
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}

            {/* 管理后台 - 仅管理员可见 */}
            {isAdmin && (
              <li className="pt-2 mt-2 border-t border-[#2d2d44]">
                <Link
                  href="/admin"
                  onClick={handleNavClick}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                    pathname === '/admin'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
                      : 'text-indigo-300 hover:bg-[#1a1a2e] hover:text-indigo-200 active:bg-[#24243a]'
                  )}
                >
                  <Shield className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">管理后台</span>
                </Link>
              </li>
            )}
          </ul>
        </nav>

        {/* 底部：退出登录 */}
        {user && (
          <div className="p-3 border-t border-[#2d2d44]">
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 active:bg-red-500/20 transition-colors"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">退出登录</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
