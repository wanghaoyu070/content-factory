'use client';

import { signIn } from 'next-auth/react';
import { Github } from 'lucide-react';

export default function GitHubSignInButton() {
  return (
    <button
      type="button"
      onClick={() => signIn('github', { callbackUrl: '/post-login' })}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-[#1A1A1A] rounded-xl font-semibold hover:bg-[#F7F6F0] hover:scale-[1.01] active:scale-[0.98] transition-all"
    >
      <Github className="w-5 h-5" />
      使用 GitHub 登录
    </button>
  );
}
