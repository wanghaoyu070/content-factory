import {
  LayoutDashboard,
  Search,
  FileText,
  Settings,
  PenTool,
} from 'lucide-react';

export interface MobileNavItem {
  href: string;
  label: string;
  shortLabel?: string;
  icon: typeof LayoutDashboard;
}

export const MOBILE_NAV_ITEMS: MobileNavItem[] = [
  { href: '/', label: '仪表盘', shortLabel: '首页', icon: LayoutDashboard },
  { href: '/analysis', label: '选题分析', shortLabel: '分析', icon: Search },
  { href: '/create', label: '内容创作', shortLabel: '创作', icon: PenTool },
  { href: '/articles', label: '发布管理', shortLabel: '文章', icon: FileText },
  { href: '/settings', label: '设置', icon: Settings },
];

export const PRIMARY_NAV_PATHS = new Set(MOBILE_NAV_ITEMS.map(item => item.href));
