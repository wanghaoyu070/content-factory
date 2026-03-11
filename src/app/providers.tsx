'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { type Session } from 'next-auth';
import { type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

// Dev mode bypass: provide a mock admin session for fast UI iteration
const DEV_BYPASS = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true';
const MOCK_SESSION: Session | undefined = DEV_BYPASS ? {
  user: {
    id: 1,
    name: 'wanghaoyu',
    image: 'https://avatars.githubusercontent.com/u/203200849?v=4',
    role: 'admin',
    githubLogin: 'wanghaoyu070',
    isPending: false,
    onboardingCompleted: true,
  },
  expires: '2099-12-31T23:59:59.999Z',
} : undefined;

// 动态导入 OnboardingModal 避免 SSR 问题
const OnboardingModal = dynamic(() => import('@/components/ui/OnboardingModal'), {
  ssr: false,
});

// 动态导入 KeyboardShortcuts
const KeyboardShortcuts = dynamic(
  () => import('@/components/ui/KeyboardShortcuts').then((mod) => ({ default: mod.KeyboardShortcuts })),
  { ssr: false }
);

function OnboardingManager({ children }: { children: ReactNode }) {
  const { data: session, status, update } = useSession();
  const user = session?.user;
  const showOnboarding =
    status === 'authenticated' && user
      ? !user.isPending && !user.onboardingCompleted
      : false;

  const handleComplete = async () => {
    // 刷新 session 以更新 onboardingCompleted 状态
    await update();
  };

  return (
    <>
      {children}
      {showOnboarding && <OnboardingModal onComplete={handleComplete} />}
      <KeyboardShortcuts />
    </>
  );
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider session={MOCK_SESSION}>
      <ErrorBoundary>
        <OnboardingManager>{children}</OnboardingManager>
      </ErrorBoundary>
    </SessionProvider>
  );
}
