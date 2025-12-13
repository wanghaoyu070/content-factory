'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { ChevronDown, LogOut, Shield, User, Settings as SettingsIcon } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

export default function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);

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

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#1a1a2e] border border-[#2d2d44] hover:bg-[#24243a] transition-colors"
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
          {user.name?.[0] || user.githubLogin?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="text-left hidden sm:block">
          <p className="text-sm text-white font-medium">{user.name || user.githubLogin || '未命名用户'}</p>
          <p className="text-xs text-slate-400">
            {user.role === 'admin' ? '管理员' : '普通用户'}
          </p>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-[#1a1a2e] border border-[#2d2d44] rounded-2xl shadow-2xl z-50">
          <div className="px-4 py-3 border-b border-[#2d2d44]">
            <p className="text-sm font-semibold text-white">{user.name || user.githubLogin || '未命名用户'}</p>
            <p className="text-xs text-slate-500 truncate">{user.githubLogin || 'GitHub 用户'}</p>
          </div>
          <div className="py-2">
            <Link
              href="/settings"
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-[#24243a]"
            >
              <SettingsIcon className="w-4 h-4" />
              个人设置
            </Link>
            {user.role === 'admin' && (
              <Link
                href="/admin"
                className="flex items-center gap-2 px-4 py-2 text-sm text-indigo-300 hover:bg-[#24243a]"
              >
                <Shield className="w-4 h-4" />
                管理后台
              </Link>
            )}
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-300 hover:bg-[#2a1a1a]"
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
