import { describe, it, expect } from 'vitest';
import { cn, formatDate, formatRelativeTime, truncateText, getStatusLabel, getStatusColor } from './utils';

describe('cn (className merge)', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });

  it('should merge tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });
});

describe('formatDate', () => {
  it('should format date string', () => {
    const result = formatDate('2024-01-15T10:30:00Z');
    expect(result).toContain('2024');
  });

  it('should handle invalid date', () => {
    const result = formatDate('invalid');
    expect(result).toBe('Invalid Date');
  });
});

describe('formatRelativeTime', () => {
  it('should return "刚刚" for recent times', () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe('刚刚');
  });

  it('should return minutes ago', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fiveMinutesAgo)).toBe('5分钟前');
  });

  it('should return hours ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twoHoursAgo)).toBe('2小时前');
  });
});

describe('truncateText', () => {
  it('should not truncate short text', () => {
    expect(truncateText('Hello', 10)).toBe('Hello');
  });

  it('should truncate long text with ellipsis', () => {
    expect(truncateText('Hello World', 5)).toBe('Hello...');
  });

  it('should handle empty string', () => {
    expect(truncateText('', 10)).toBe('');
  });
});

describe('getStatusLabel', () => {
  it('should return correct label for draft', () => {
    expect(getStatusLabel('draft')).toBe('草稿');
  });

  it('should return correct label for published', () => {
    expect(getStatusLabel('published')).toBe('已发布');
  });

  it('should return correct label for archived', () => {
    expect(getStatusLabel('archived')).toBe('已归档');
  });
});

describe('getStatusColor', () => {
  it('should return correct color for draft', () => {
    expect(getStatusColor('draft')).toBe('default');
  });

  it('should return correct color for published', () => {
    expect(getStatusColor('published')).toBe('success');
  });

  it('should return correct color for failed', () => {
    expect(getStatusColor('failed')).toBe('danger');
  });
});
