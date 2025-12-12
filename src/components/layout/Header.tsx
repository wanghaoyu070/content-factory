'use client';

import { Bell, Search } from 'lucide-react';

interface HeaderProps {
  title: string;
  action?: React.ReactNode;
}

export default function Header({ title, action }: HeaderProps) {
  return (
    <header className="h-16 bg-[#0f0f23] border-b border-[#2d2d44] flex items-center justify-between px-6">
      <h1 className="text-xl font-semibold text-slate-100">{title}</h1>

      <div className="flex items-center gap-4">
        {action}
        <button className="p-2 text-slate-400 hover:text-slate-200 hover:bg-[#1a1a2e] rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
