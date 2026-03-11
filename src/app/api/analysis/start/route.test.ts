import { describe, expect, it, vi, beforeEach } from 'vitest';
import { auth } from '@/auth';
import { createSearchRecord, updateSearchStatus } from '@/lib/db';
import {
  ensureAnalysisJobRecord,
  getAnalysisExecutionMode,
  startAnalysisJobNow,
  triggerAnalysisJobInBackground,
} from '@/lib/analysis-jobs';
import { POST } from './route';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  createSearchRecord: vi.fn(),
  updateSearchStatus: vi.fn(),
}));

vi.mock('@/lib/analysis-jobs', () => ({
  ensureAnalysisJobRecord: vi.fn(),
  getAnalysisExecutionMode: vi.fn(),
  startAnalysisJobNow: vi.fn(),
  triggerAnalysisJobInBackground: vi.fn(),
}));

describe('/api/analysis/start', () => {
  const mockAuth = vi.mocked(auth);
  const mockCreateSearchRecord = vi.mocked(createSearchRecord);
  const mockUpdateSearchStatus = vi.mocked(updateSearchStatus);
  const mockEnsureAnalysisJobRecord = vi.mocked(ensureAnalysisJobRecord);
  const mockGetAnalysisExecutionMode = vi.mocked(getAnalysisExecutionMode);
  const mockStartAnalysisJobNow = vi.mocked(startAnalysisJobNow);
  const mockTriggerAnalysisJobInBackground = vi.mocked(triggerAnalysisJobInBackground);

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateSearchRecord.mockReturnValue(101);
    mockGetAnalysisExecutionMode.mockReturnValue('background');
    mockTriggerAnalysisJobInBackground.mockReturnValue(true);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);

    const request = new Request('http://localhost/api/analysis/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: 'AI' }),
    });

    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('queues a background job and returns pending status', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 1 } } as never);

    const request = new Request('http://localhost/api/analysis/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: 'AI', searchType: 'keyword' }),
    });

    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockCreateSearchRecord).toHaveBeenCalledWith('AI', 0, 1, { searchType: 'keyword' });
    expect(mockUpdateSearchStatus).toHaveBeenCalledWith(101, 'pending', 0, 1);
    expect(mockEnsureAnalysisJobRecord).toHaveBeenCalledWith(101, 1, 'background');
    expect(mockTriggerAnalysisJobInBackground).toHaveBeenCalledWith({
      searchId: 101,
      keyword: 'AI',
      userId: 1,
      searchType: 'keyword',
    });
    expect(body.data.status).toBe('pending');
  });

  it('returns completed status in inline mode when job finishes', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 1 } } as never);
    mockGetAnalysisExecutionMode.mockReturnValueOnce('inline');
    mockStartAnalysisJobNow.mockResolvedValueOnce('completed');

    const request = new Request('http://localhost/api/analysis/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: 'AI' }),
    });

    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockStartAnalysisJobNow).toHaveBeenCalledWith({
      searchId: 101,
      keyword: 'AI',
      userId: 1,
      searchType: 'keyword',
    });
    expect(body.data.status).toBe('completed');
  });
});
