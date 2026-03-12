'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Search,
  FileText,
  Settings,
  PenTool,
  ChevronLeft,
  ChevronRight,
  Flame,
} from 'lucide-react';
import Logo from '@/components/icons/Logo';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

const navItems = [
  { href: '/', label: '工作台', icon: LayoutDashboard },
  { href: '/analysis', label: '选题分析', icon: Search },
  { href: '/viral', label: '爆文发现', icon: Flame },
  { href: '/create', label: '内容创作', icon: PenTool },
  { href: '/articles', label: '发布管理', icon: FileText },
  { href: '/settings', label: '设置', icon: Settings },
];

const SIDEBAR_STORAGE_KEY = 'sidebar-collapsed';
const SidebarFooter = dynamic(() => import('./SidebarUser'), { ssr: false });

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (!saved) return false;
    try {
      return JSON.parse(saved) === true;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(collapsed));
    return () => {
      document.body.classList.remove('sidebar-collapsed');
    };
  }, [collapsed]);

  const toggleCollapse = () => setCollapsed((prev) => !prev);

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col h-screen fixed left-0 top-0 glass-sidebar transition-all duration-300 z-40',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className="p-4 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Logo className="w-9 h-9 flex-shrink-0" />
          {!collapsed && (
            <span className="text-xl font-bold text-[#1A1A1A]">
              内容工厂
            </span>
          )}
        </Link>
      </div>

      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <div className="relative group">
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200',
                      collapsed && 'justify-center',
                      isActive
                        ? 'bg-[rgba(0,0,0,0.04)] text-[#1A1A1A] font-medium'
                        : 'text-[#666] hover:text-[#1A1A1A] hover:translate-x-[3px] hover:scale-[1.02] active:scale-[0.98]'
                    )}
                    style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                  {collapsed && (
                    <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1 rounded-lg bg-white border border-[rgba(0,0,0,0.06)] text-xs text-[#1A1A1A] opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-lg">
                      {item.label}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </nav>

      <button
        type="button"
        onClick={toggleCollapse}
        className="absolute -right-3 top-20 w-7 h-7 bg-white border border-[rgba(0,0,0,0.1)] rounded-full flex items-center justify-center hover:bg-[#F7F6F0] transition-colors text-[#666] shadow-sm"
        aria-label={collapsed ? '展开侧边栏' : '折叠侧边栏'}
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      <div className="p-4 border-t border-[rgba(0,0,0,0.06)]">
        <SidebarFooter collapsed={collapsed} />
      </div>
    </aside>
  );
}
