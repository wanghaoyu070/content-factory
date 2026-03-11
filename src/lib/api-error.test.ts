import { describe, expect, it } from 'vitest';
import { getApiErrorMessage } from './api-error';

describe('getApiErrorMessage', () => {
  it('returns fallback when payload is not an API error response', () => {
    expect(getApiErrorMessage(null, '默认错误')).toBe('默认错误');
    expect(getApiErrorMessage({ success: true }, '默认错误')).toBe('默认错误');
  });

  it('builds message with hint and requestId', () => {
    const message = getApiErrorMessage({
      success: false,
      error: '发布失败',
      code: 'UPSTREAM_TIMEOUT',
      requestId: 'req-123',
    });
    expect(message).toContain('发布失败');
    expect(message).toContain('服务响应慢');
    expect(message).toContain('req-123');
  });

  it('builds message without hint when code is unknown', () => {
    const message = getApiErrorMessage({
      success: false,
      error: '自定义错误',
      code: 'UNKNOWN_CODE',
    });
    expect(message).toBe('自定义错误');
  });
});
