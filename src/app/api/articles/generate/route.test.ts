import { describe, expect, it, vi } from 'vitest';
import { auth } from '@/auth';
import { getGenerationJob } from '@/lib/generation-jobs';
import { GET, POST } from './route';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/generation-jobs', () => ({
  createTrackedGenerationJob: vi.fn(() => 1),
  trackGenerationProgress: vi.fn(),
  getGenerationJob: vi.fn(),
}));

describe('/api/articles/generate', () => {
  const mockAuth = vi.mocked(auth);
  const mockGetGenerationJob = vi.mocked(getGenerationJob);

  it('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);

    const request = new Request('http://localhost/api/articles/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 when request body is invalid JSON', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 1 } } as never);

    const request = new Request('http://localhost/api/articles/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{invalid-json}',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.code).toBe('BAD_REQUEST');
  });

  it('returns 400 when jobId is missing for GET', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 1 } } as never);

    const request = new Request('http://localhost/api/articles/generate');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('BAD_REQUEST');
  });

  it('returns generation job status for GET', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 1 } } as never);
    mockGetGenerationJob.mockReturnValueOnce({
      id: 7,
      user_id: 1,
      search_id: 2,
      insight_id: 3,
      status: 'processing',
      step: 'generating',
      progress: 45,
      message: 'AI 正在创作文章...',
      style: 'professional',
      fetch_images: 1,
      article_id: null,
      error_message: null,
      created_at: '2026-03-06T00:00:00.000Z',
      started_at: '2026-03-06T00:00:00.000Z',
      completed_at: null,
      updated_at: '2026-03-06T00:00:00.000Z',
    });

    const request = new Request('http://localhost/api/articles/generate?jobId=7');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.jobId).toBe(7);
    expect(body.data.status).toBe('processing');
    expect(body.data.progress).toBe(45);
  });
});
