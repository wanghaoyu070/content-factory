import {
  claimAnalysisJob,
  completeAnalysisJob,
  createAnalysisJob,
  failAnalysisJob,
  getAnalysisJobBySearchId,
  touchAnalysisJob,
  updateSearchStatus,
} from '@/lib/db';
import { runAnalysisTask } from '@/lib/analysis-service';

type SearchType = 'keyword' | 'account';
type ExecutionMode = 'background' | 'inline';

interface AnalysisJobInput {
  searchId: number;
  keyword: string;
  userId: number;
  searchType: SearchType;
}

const runningJobs = new Set<number>();

export function getAnalysisExecutionMode(): ExecutionMode {
  return process.env.ANALYSIS_EXECUTION_MODE === 'inline' ? 'inline' : 'background';
}

export function ensureAnalysisJobRecord(searchId: number, userId: number, executionMode = getAnalysisExecutionMode()) {
  createAnalysisJob(searchId, userId, executionMode);
}

async function executeClaimedJob(input: AnalysisJobInput): Promise<'completed' | 'failed'> {
  const { searchId, keyword, userId, searchType } = input;

  runningJobs.add(searchId);
  try {
    touchAnalysisJob(searchId, userId);
    const result = await runAnalysisTask(searchId, keyword, userId, searchType);

    if (result === 'completed') {
      completeAnalysisJob(searchId, userId);
      return 'completed';
    }

    failAnalysisJob(searchId, userId, '分析任务执行失败');
    return 'failed';
  } catch (error) {
    const message = error instanceof Error ? error.message : '分析任务执行异常';
    updateSearchStatus(searchId, 'failed', undefined, userId);
    failAnalysisJob(searchId, userId, message);
    return 'failed';
  } finally {
    runningJobs.delete(searchId);
  }
}

export async function startAnalysisJobNow(input: AnalysisJobInput): Promise<'completed' | 'failed' | 'skipped'> {
  const { searchId, userId } = input;
  if (runningJobs.has(searchId)) {
    return 'skipped';
  }

  ensureAnalysisJobRecord(searchId, userId, 'inline');
  if (!claimAnalysisJob(searchId, userId)) {
    return 'skipped';
  }

  return executeClaimedJob(input);
}

export function triggerAnalysisJobInBackground(input: AnalysisJobInput): boolean {
  const { searchId, userId } = input;
  if (runningJobs.has(searchId)) {
    return false;
  }

  ensureAnalysisJobRecord(searchId, userId, 'background');
  if (!claimAnalysisJob(searchId, userId)) {
    return false;
  }

  void executeClaimedJob(input);
  return true;
}

export function getEffectiveAnalysisStatus(
  searchStatus: 'pending' | 'processing' | 'completed' | 'failed' | undefined,
  jobStatus: string | undefined
): 'pending' | 'processing' | 'completed' | 'failed' {
  if (jobStatus === 'running') return 'processing';
  if (jobStatus === 'pending') return 'pending';
  if (jobStatus === 'failed') return 'failed';
  if (jobStatus === 'completed') return 'completed';
  return searchStatus || 'completed';
}

export function maybeRecoverAnalysisJob(input: AnalysisJobInput): boolean {
  const existing = getAnalysisJobBySearchId(input.searchId, input.userId);
  if (!existing) {
    ensureAnalysisJobRecord(input.searchId, input.userId);
    return triggerAnalysisJobInBackground(input);
  }

  if (existing.status === 'pending') {
    return triggerAnalysisJobInBackground(input);
  }

  if (existing.status === 'running' && existing.heartbeat_at) {
    const heartbeatTs = new Date(existing.heartbeat_at).getTime();
    const staleMs = 5 * 60 * 1000;
    if (Number.isFinite(heartbeatTs) && Date.now() - heartbeatTs > staleMs) {
      return triggerAnalysisJobInBackground(input);
    }
  }

  return false;
}
