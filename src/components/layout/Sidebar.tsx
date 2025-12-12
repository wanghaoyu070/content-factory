'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Search, FileText, Settings, PenTool } from 'lucide-react';
import Logo from '@/components/icons/Logo';

const navItems = [
  { href: '/', label: '仪表盘', icon: LayoutDashboard },
  { href: '/analysis', label: '选题分析', icon: Search },
  { href: '/create', label: '内容创作', icon: PenTool },
  { href: '/articles', label: '发布管理', icon: FileText },
  { href: '/settings', label: '设置', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-[#0a0a1a] text-white flex flex-col h-screen fixed left-0 top-0 border-r border-[#2d2d44]">
      <div className="p-4 border-b border-[#2d2d44]">
        <Link href="/" className="flex items-center gap-3">
          <Logo className="w-9 h-9" />
          <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            内容工厂
          </span>
        </Link>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
                      : 'text-slate-400 hover:bg-[#1a1a2e] hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-[#2d2d44]">
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-sm font-medium">
            U
          </div>
          <span className="text-sm text-slate-400">用户</span>
        </div>
      </div>
    </aside>
  );
}
