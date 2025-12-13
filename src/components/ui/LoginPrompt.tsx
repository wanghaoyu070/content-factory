'use client';

import { Github } from 'lucide-react';
import { signIn } from 'next-auth/react';

interface LoginPromptProps {
  title?: string;
  description?: string;
  actionLabel?: string;
}

export default function LoginPrompt({
  title = '登录后解锁完整功能',
  description = '当前操作需要登录才能继续，请使用 GitHub 账号安全登录。',
  actionLabel = '立即登录',
}: LoginPromptProps) {
  return (
    <div className="w-full bg-[#16162a] border border-dashed border-[#2d2d44] rounded-2xl p-8 flex flex-col items-center text-center gap-4">
      <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
        <Github className="w-8 h-8" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-sm text-slate-400 mt-2 max-w-md">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => signIn('github', { callbackUrl: '/post-login' })}
        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-500 hover:to-purple-500 transition-colors"
      >
        {actionLabel}
      </button>
    </div>
  );
}
