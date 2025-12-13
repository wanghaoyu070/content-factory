'use client';

import { Search } from 'lucide-react';
import dynamic from 'next/dynamic';

interface HeaderProps {
  title: string;
  action?: React.ReactNode;
}

const UserMenu = dynamic(() => import('@/components/ui/UserMenu'), { ssr: false });

export default function Header({ title, action }: HeaderProps) {
  return (
    <header className="h-16 sticky top-0 z-30 flex items-center justify-between px-6 backdrop-blur-xl bg-[#0f0f23]/80 border-b border-[#2d2d44]">
      <h1 className="text-xl font-semibold text-slate-100">{title}</h1>

      <div className="flex items-center gap-4">
        {action}
        <UserMenu />
      </div>
    </header>
  );
}
