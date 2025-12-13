'use client';

import { useSession, signIn } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { LogIn } from 'lucide-react';

interface SidebarUserProps {
  collapsed: boolean;
}

export default function SidebarUser({ collapsed }: SidebarUserProps) {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className={cn('flex items-center gap-3 px-3 py-2 rounded-xl bg-[#1a1a2e]', collapsed && 'justify-center')}>
        <div className="w-9 h-9 rounded-full bg-[#24243a] animate-pulse" />
        {!collapsed && <p className="text-sm text-slate-400">加载中...</p>}
      </div>
    );
  }

  if (!session?.user) {
    return (
      <button
        onClick={() => signIn('github', { callbackUrl: '/post-login' })}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 rounded-xl border border-[#2d2d44] text-slate-300 hover:text-white hover:bg-[#1f1f33] transition-colors',
          collapsed && 'justify-center'
        )}
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center">
          <LogIn className="w-4 h-4" />
        </div>
        {!collapsed && <span className="text-sm">登录</span>}
      </button>
    );
  }

  const { user } = session;
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-xl bg-[#1a1a2e] border border-[#2d2d44]',
        collapsed && 'justify-center'
      )}
    >
      <div className="w-9 h-9 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-sm font-medium">
        {user.name?.[0] || user.githubLogin?.[0]?.toUpperCase() || 'U'}
      </div>
      {!collapsed && (
        <div>
          <p className="text-sm font-medium text-slate-200">{user.name || user.githubLogin}</p>
          <p className="text-xs text-slate-500">{user.role === 'admin' ? '管理员' : '普通用户'}</p>
        </div>
      )}
    </div>
  );
}
