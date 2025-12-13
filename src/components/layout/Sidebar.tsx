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
} from 'lucide-react';
import Logo from '@/components/icons/Logo';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

const navItems = [
  { href: '/', label: '仪表盘', icon: LayoutDashboard },
  { href: '/analysis', label: '选题分析', icon: Search },
  { href: '/create', label: '内容创作', icon: PenTool },
  { href: '/articles', label: '发布管理', icon: FileText },
  { href: '/settings', label: '设置', icon: Settings },
];

const SIDEBAR_STORAGE_KEY = 'sidebar-collapsed';
const SidebarUser = dynamic(() => import('./SidebarUser'), { ssr: false });

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (saved) {
      const value = JSON.parse(saved);
      setCollapsed(value);
      document.body.classList.toggle('sidebar-collapsed', value);
    }
    setHydrated(true);
    return () => {
      document.body.classList.remove('sidebar-collapsed');
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(collapsed));
  }, [collapsed, hydrated]);

  const toggleCollapse = () => setCollapsed((prev) => !prev);

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col h-screen fixed left-0 top-0 glass-sidebar text-white transition-all duration-300 z-40',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className="p-4 border-b border-[#2d2d44] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Logo className="w-9 h-9 flex-shrink-0" />
          {!collapsed && (
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
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
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
                        : 'text-slate-400 hover:bg-[#1a1a2e] hover:text-white'
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                  {collapsed && (
                    <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1 rounded-lg bg-[#1a1a2e] border border-[#2d2d44] text-xs text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-xl">
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
        className="absolute -right-3 top-20 w-7 h-7 bg-[#16162a] border border-[#2d2d44] rounded-full flex items-center justify-center hover:bg-[#1a1a2e] transition-colors"
        aria-label={collapsed ? '展开侧边栏' : '折叠侧边栏'}
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      <div className="p-4 border-t border-[#2d2d44]">
        <SidebarUser collapsed={collapsed} />
      </div>
    </aside>
  );
}
