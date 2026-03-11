import { describe, expect, it, vi } from 'vitest';
import { auth } from '@/auth';
import { POST } from './route';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/config', () => ({
  getWechatPublishConfig: vi.fn(() => null),
}));

describe('/api/publish/wechat', () => {
  const mockAuth = vi.mocked(auth);

  it('returns 401 for publish action when user is not authenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);

    const request = new Request('http://localhost/api/publish/wechat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'publish', articleId: 1, wechatAppid: 'wx_1' }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 for unknown action', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 1 } } as never);

    const request = new Request('http://localhost/api/publish/wechat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unknown' }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.code).toBe('BAD_REQUEST');
  });
});
