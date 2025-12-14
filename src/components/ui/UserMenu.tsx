'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { ChevronDown, LogOut, Shield, Settings as SettingsIcon, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

export default function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <div className="w-8 h-8 rounded-full bg-[#1a1a2e] animate-pulse" />
        <span className="text-sm">加载中...</span>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <button
        onClick={() => signIn('github', { callbackUrl: '/post-login' })}
        className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium hover:from-indigo-500 hover:to-purple-500"
      >
        登录
      </button>
    );
  }

  const { user } = session;
  const avatarUrl = user.image; // GitHub 头像

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#1a1a2e] border border-[#2d2d44] hover:bg-[#24243a] transition-colors"
      >
        {/* 头像：优先使用 GitHub 头像 */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={user.name || 'avatar'}
            className="w-9 h-9 rounded-full object-cover"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
            {user.name?.[0] || user.githubLogin?.[0]?.toUpperCase() || 'U'}
          </div>
        )}
        <div className="text-left hidden sm:block">
          <p className="text-sm text-white font-medium">{user.name || user.githubLogin || '未命名用户'}</p>
          <p className="text-xs text-slate-400">
            {user.role === 'admin' ? '管理员' : '普通用户'}
          </p>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-[#1a1a2e] border border-[#2d2d44] rounded-2xl shadow-2xl z-50 animate-fade-in">
          {/* 用户信息头部 */}
          <div className="px-4 py-3 border-b border-[#2d2d44] flex items-center gap-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={user.name || 'avatar'}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                {user.name?.[0] || user.githubLogin?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{user.name || user.githubLogin || '未命名用户'}</p>
              <p className="text-xs text-slate-500 truncate">@{user.githubLogin || 'GitHub 用户'}</p>
            </div>
          </div>

          {/* 菜单项 */}
          <div className="py-2">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-[#24243a] transition-colors"
            >
              <SettingsIcon className="w-4 h-4" />
              <div>
                <span>系统设置</span>
                <p className="text-xs text-slate-500">API 配置、偏好设置</p>
              </div>
            </Link>
            {user.role === 'admin' && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-indigo-300 hover:bg-[#24243a] transition-colors"
              >
                <Shield className="w-4 h-4" />
                <div>
                  <span>管理后台</span>
                  <p className="text-xs text-slate-500">用户管理、邀请码</p>
                </div>
              </Link>
            )}
          </div>

          {/* 退出登录 */}
          <div className="py-2 border-t border-[#2d2d44]">
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

