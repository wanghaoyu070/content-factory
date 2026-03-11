import {
  createGenerationJob,
  getGenerationJobById,
  updateGenerationJobProgress,
  type GenerationJobRecord,
  type GenerationJobStatus,
} from '@/lib/db';

export interface GenerationProgressPayload {
  step: string;
  message: string;
  progress: number;
  data?: {
    articleId?: number;
    [key: string]: unknown;
  };
}

export function createTrackedGenerationJob(input: {
  userId: number;
  searchId: number;
  insightId: number;
  style?: string;
  fetchImages?: boolean;
}): number {
  return createGenerationJob(input);
}

export function trackGenerationProgress(
  jobId: number,
  userId: number,
  event: GenerationProgressPayload
): void {
  const status: GenerationJobStatus =
    event.step === 'completed'
      ? 'completed'
      : event.step === 'error'
        ? 'failed'
        : 'processing';

  updateGenerationJobProgress(jobId, userId, {
    status,
    step: event.step,
    progress: event.progress,
    message: event.message,
    articleId: event.data?.articleId ?? null,
    errorMessage: status === 'failed' ? event.message : null,
  });
}

export function getGenerationJob(jobId: number, userId: number): GenerationJobRecord | undefined {
  return getGenerationJobById(jobId, userId);
}
