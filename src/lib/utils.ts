import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ===== 样式工具 =====
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ===== 日期格式化 =====

/**
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDate(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * 格式化日期时间为 YYYY-MM-DD HH:mm
 */
export function formatDateTime(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 格式化为相对时间 (例如: 3分钟前, 2天前)
 */
export function formatRelativeTime(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay < 7) return `${diffDay}天前`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}周前`;
  return formatDate(date);
}

// ===== 文本处理 =====

/**
 * 截断文本并添加省略号
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * 移除 HTML 标签，获取纯文本
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

/**
 * 计算文章字数（去除 HTML 标签后）
 */
export function countWords(content: string): number {
  return stripHtml(content).length;
}

// ===== 状态配置 =====

export type ArticleStatus = 'draft' | 'pending_review' | 'approved' | 'published' | 'failed' | 'archived';

export const STATUS_CONFIG: Record<ArticleStatus, {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  badgeColor: 'default' | 'success' | 'warning' | 'danger' | 'info';
}> = {
  draft: {
    label: '草稿',
    color: '#64748b',
    bgColor: 'bg-slate-500/10',
    textColor: 'text-slate-400',
    badgeColor: 'default'
  },
  pending_review: {
    label: '待审核',
    color: '#f59e0b',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-400',
    badgeColor: 'warning'
  },
  approved: {
    label: '已审核',
    color: '#10b981',
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-400',
    badgeColor: 'success'
  },
  published: {
    label: '已发布',
    color: '#6366f1',
    bgColor: 'bg-indigo-500/10',
    textColor: 'text-indigo-400',
    badgeColor: 'success'
  },
  failed: {
    label: '发布失败',
    color: '#ef4444',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-400',
    badgeColor: 'danger'
  },
  archived: {
    label: '已归档',
    color: '#8b5cf6',
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-400',
    badgeColor: 'info'
  },
};

/**
 * 获取状态标签文本
 */
export function getStatusLabel(status: ArticleStatus): string {
  return STATUS_CONFIG[status]?.label || status;
}

/**
 * 获取状态对应的徽章颜色
 */
export function getStatusColor(status: ArticleStatus): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  return STATUS_CONFIG[status]?.badgeColor || 'default';
}

// ===== 数字格式化 =====

/**
 * 格式化大数字 (例如: 1.2k, 3.5万)
 */
export function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}

// ===== 异步工具 =====

/**
 * 延迟执行
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 防抖函数
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

