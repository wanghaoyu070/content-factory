'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { HelpCircle, MessageSquare, Keyboard, ExternalLink } from 'lucide-react';

interface SidebarFooterProps {
  collapsed: boolean;
}

export default function SidebarFooter({ collapsed }: SidebarFooterProps) {
  const { data: session } = useSession();

  // 快捷入口配置
  const quickLinks = [
    {
      icon: HelpCircle,
      label: '帮助中心',
      href: '/help',
      external: false,
    },
    {
      icon: MessageSquare,
      label: '问题反馈',
      href: 'https://github.com/wanghaoyu070/content-factory/issues',
      external: true,
    },
  ];

  return (
    <div className="space-y-2">
      {/* 快捷入口 */}
      {quickLinks.map((link, index) => (
        <Link
          key={index}
          href={link.href}
          target={link.external ? '_blank' : undefined}
          rel={link.external ? 'noopener noreferrer' : undefined}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-[#1a1a2e] transition-colors group',
            collapsed && 'justify-center'
          )}
        >
          <link.icon className="w-5 h-5 flex-shrink-0" />
          {!collapsed && (
            <span className="text-sm flex-1">{link.label}</span>
          )}
          {!collapsed && link.external && (
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </Link>
      ))}

      {/* 键盘快捷键提示（仅展开时显示） */}
      {!collapsed && (
        <div className="px-3 py-2 mt-2">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Keyboard className="w-3 h-3" />
            <span>按 <kbd className="px-1 py-0.5 bg-[#1a1a2e] rounded text-slate-400">?</kbd> 查看快捷键</span>
          </div>
        </div>
      )}

      {/* 版本号 */}
      {!collapsed && (
        <div className="px-3 pt-2 border-t border-[#2d2d44]">
          <p className="text-xs text-slate-600">
            Content Factory v1.0.0
          </p>
        </div>
      )}
    </div>
  );
}
