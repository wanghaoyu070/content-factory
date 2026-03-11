'use client';

import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { toast } from 'sonner';

// Dev mode bypass: skip all client-side auth checks for fast UI iteration
const DEV_BYPASS = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true';

export function useLoginGuard(message = '请先登录后再执行该操作') {
  const router = useRouter();
  const { data: session, status } = useSession();

  // In dev bypass mode, always treat as authenticated
  if (DEV_BYPASS) {
    return {
      ensureLogin: () => true,
      session,
      status: 'authenticated' as const,
      isAuthenticated: true,
    };
  }

  const isAuthenticated = status === 'authenticated' && !!session?.user && !session.user.isPending;

  const ensureLogin = () => {
    if (status === 'loading') {
      toast.info('正在检测登录状态，请稍候');
      return false;
    }
    if (!session?.user) {
      toast.error(message);
      signIn('github', { callbackUrl: '/post-login' });
      return false;
    }
    if (session.user.isPending) {
      toast.error('请先完成邀请码验证');
      router.push('/invite');
      return false;
    }
    return true;
  };

  return { ensureLogin, session, status, isAuthenticated };
}
