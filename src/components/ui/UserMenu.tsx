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
      <div className="flex items-center gap-2 text-[#999]">
        <div className="w-8 h-8 rounded-full bg-[#F0EFE9] animate-pulse" />
        <span className="text-sm">加载中...</span>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <button
        onClick={() => signIn('github', { callbackUrl: '/post-login' })}
        className="px-4 py-2 rounded-xl bg-[#333] text-white text-sm font-medium hover:bg-[#444] shadow-md"
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
        className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white border border-[rgba(0,0,0,0.06)] hover:bg-[#F7F6F0] transition-colors"
      >
        {/* 头像：优先使用 GitHub 头像 */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={user.name || 'avatar'}
            className="w-9 h-9 rounded-full object-cover"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-[#F5F5F5] flex items-center justify-center text-[#666] font-semibold">
            {user.name?.[0] || user.githubLogin?.[0]?.toUpperCase() || 'U'}
          </div>
        )}
        <div className="text-left hidden sm:block">
          <p className="text-sm text-[#1A1A1A] font-medium">{user.name || user.githubLogin || '未命名用户'}</p>
          <p className="text-xs text-[#999]">
            {user.role === 'admin' ? '管理员' : '普通用户'}
          </p>
        </div>
        <ChevronDown className={`w-4 h-4 text-[#999] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-[rgba(0,0,0,0.06)] rounded-2xl shadow-xl z-50 animate-fade-in">
          {/* User info header */}
          <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.06)] flex items-center gap-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={user.name || 'avatar'}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#F5F5F5] flex items-center justify-center text-[#666] font-semibold">
                {user.name?.[0] || user.githubLogin?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#1A1A1A] truncate">{user.name || user.githubLogin || '未命名用户'}</p>
              <p className="text-xs text-[#999] truncate">@{user.githubLogin || 'GitHub 用户'}</p>
            </div>
          </div>

          {/* 菜单项 */}
          <div className="py-2">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#666] hover:bg-[rgba(0,0,0,0.02)] transition-colors"
            >
              <SettingsIcon className="w-4 h-4" />
              <div>
                <span>系统设置</span>
                <p className="text-xs text-[#999]">API 配置、偏好设置</p>
              </div>
            </Link>
            {user.role === 'admin' && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#666] hover:bg-[rgba(0,0,0,0.02)] transition-colors"
              >
                <Shield className="w-4 h-4" />
                <div>
                  <span>管理后台</span>
                  <p className="text-xs text-[#999]">用户管理、邀请码</p>
                </div>
              </Link>
            )}
          </div>

          {/* 退出登录 */}
          <div className="py-2 border-t border-[rgba(0,0,0,0.06)]">
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
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

