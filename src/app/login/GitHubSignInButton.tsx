'use client';

import { signIn } from 'next-auth/react';
import { Github } from 'lucide-react';

export default function GitHubSignInButton() {
  return (
    <button
      type="button"
      onClick={() => signIn('github', { callbackUrl: '/post-login' })}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-slate-900 rounded-xl font-semibold hover:bg-slate-100 transition-colors"
    >
      <Github className="w-5 h-5" />
      使用 GitHub 登录
    </button>
  );
}
