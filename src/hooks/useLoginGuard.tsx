'use client';

import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { toast } from 'sonner';

export function useLoginGuard(message = '请先登录后再执行该操作') {
  const router = useRouter();
  const { data: session, status } = useSession();
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
