import { describe, expect, it, vi } from 'vitest';
import { auth } from '@/auth';
import { POST } from './route';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

describe('/api/publish/xiaohongshu', () => {
  const mockAuth = vi.mocked(auth);

  it('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);

    const request = new Request('http://localhost/api/publish/xiaohongshu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId: 1 }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 when articleId is invalid', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 1 } } as never);

    const request = new Request('http://localhost/api/publish/xiaohongshu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId: 'invalid-id' }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.code).toBe('BAD_REQUEST');
  });
});
