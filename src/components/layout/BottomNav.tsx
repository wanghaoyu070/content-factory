'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { MOBILE_NAV_ITEMS } from '@/components/layout/mobileNavConfig';

export default function BottomNav() {
  const pathname = usePathname();

  // 登录相关页面不显示底部导航
  if (pathname.startsWith('/login') || pathname.startsWith('/invite') || pathname.startsWith('/post-login')) {
    return null;
  }

  const shouldShow = MOBILE_NAV_ITEMS.some(item => pathname === item.href);

  if (!shouldShow) {
    return null;
  }

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-sidebar border-t border-[#2d2d44]"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
      }}
      aria-label="底部导航"
    >
      <ul className="flex items-center justify-around h-full">
        {MOBILE_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 py-2 transition-colors',
                  isActive
                    ? 'text-indigo-400'
                    : 'text-slate-500 active:text-slate-300'
                )}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className={cn('w-5 h-5', isActive && 'drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]')} />
                <span className={cn('text-xs', isActive ? 'font-medium' : 'font-normal')}>
                  {item.shortLabel || item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
