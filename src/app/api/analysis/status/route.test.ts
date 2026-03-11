import { beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from '@/auth';
import {
  getAnalysisJobBySearchId,
  getArticlesBySearchId,
  getSearchById,
  getTopicInsightsBySearchId,
} from '@/lib/db';
import { getEffectiveAnalysisStatus, maybeRecoverAnalysisJob } from '@/lib/analysis-jobs';
import { GET } from './route';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  getSearchById: vi.fn(),
  getAnalysisJobBySearchId: vi.fn(),
  getArticlesBySearchId: vi.fn(),
  getTopicInsightsBySearchId: vi.fn(),
}));

vi.mock('@/lib/analysis-jobs', () => ({
  getEffectiveAnalysisStatus: vi.fn(),
  maybeRecoverAnalysisJob: vi.fn(),
}));

describe('/api/analysis/status', () => {
  const mockAuth = vi.mocked(auth);
  const mockGetSearchById = vi.mocked(getSearchById);
  const mockGetAnalysisJobBySearchId = vi.mocked(getAnalysisJobBySearchId);
  const mockGetArticlesBySearchId = vi.mocked(getArticlesBySearchId);
  const mockGetTopicInsightsBySearchId = vi.mocked(getTopicInsightsBySearchId);
  const mockGetEffectiveAnalysisStatus = vi.mocked(getEffectiveAnalysisStatus);
  const mockMaybeRecoverAnalysisJob = vi.mocked(maybeRecoverAnalysisJob);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);

    const request = new Request('http://localhost/api/analysis/status?id=1');
    const response = await GET(request as never);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('returns processing status and attempts recovery for pending work', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 1 } } as never);
    mockGetSearchById.mockReturnValueOnce({
      id: 9,
      user_id: 1,
      keyword: 'AI',
      article_count: 0,
      search_type: 'keyword',
      account_name: null,
      account_avatar: null,
      status: 'pending',
      created_at: '2026-03-06T00:00:00.000Z',
    });
    mockGetAnalysisJobBySearchId.mockReturnValueOnce({
      id: 1,
      search_id: 9,
      user_id: 1,
      status: 'running',
      attempts: 1,
      execution_mode: 'background',
      error_message: null,
      started_at: '2026-03-06T00:00:00.000Z',
      heartbeat_at: '2026-03-06T00:00:00.000Z',
      completed_at: null,
      created_at: '2026-03-06T00:00:00.000Z',
      updated_at: '2026-03-06T00:00:00.000Z',
    });
    mockGetEffectiveAnalysisStatus.mockReturnValueOnce('processing');
    mockGetArticlesBySearchId.mockReturnValueOnce([]);

    const request = new Request('http://localhost/api/analysis/status?id=9');
    const response = await GET(request as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockMaybeRecoverAnalysisJob).toHaveBeenCalledWith({
      searchId: 9,
      keyword: 'AI',
      userId: 1,
      searchType: 'keyword',
    });
    expect(body.data.status).toBe('processing');
    expect(body.data.job.attempts).toBe(1);
  });

  it('returns completed data when analysis has finished', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 1 } } as never);
    mockGetSearchById.mockReturnValueOnce({
      id: 9,
      user_id: 1,
      keyword: 'AI',
      article_count: 2,
      search_type: 'keyword',
      account_name: null,
      account_avatar: null,
      status: 'completed',
      created_at: '2026-03-06T00:00:00.000Z',
    });
    mockGetAnalysisJobBySearchId.mockReturnValueOnce(undefined);
    mockGetEffectiveAnalysisStatus.mockReturnValueOnce('completed');
    mockGetArticlesBySearchId.mockReturnValueOnce([
      {
        id: 1,
        search_id: 9,
        title: 'AI 趋势分析',
        content: 'AI 内容趋势解读',
        cover_image: '',
        read_count: 1000,
        like_count: 100,
        wow_count: 10,
        publish_time: '2026-03-06',
        source_url: 'https://example.com',
        wx_name: '测试号',
        wx_id: 'gh_test',
        is_original: 1,
      },
    ]);
    mockGetTopicInsightsBySearchId.mockReturnValueOnce([
      {
        id: 1,
        search_id: 9,
        title: '洞察一',
        description: '描述',
        evidence: '证据',
        suggested_topics: '[]',
        related_articles: '[]',
        created_at: '2026-03-06T00:00:00.000Z',
      },
    ]);

    const request = new Request('http://localhost/api/analysis/status?id=9');
    const response = await GET(request as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.status).toBe('completed');
    expect(body.data.articles).toHaveLength(1);
    expect(body.data.insights).toHaveLength(1);
    expect(Array.isArray(body.data.wordCloud)).toBe(true);
  });
});
