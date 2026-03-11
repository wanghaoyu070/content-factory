import { getApiErrorMessage } from '@/lib/api-error';
import type { ApiResponse, ApiSuccessResponse } from '@/types/api';

export async function fetchJsonWithApiError<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  fallbackMessage = '请求失败'
): Promise<T> {
  const response = await fetch(input, init);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload, fallbackMessage));
  }

  return payload as T;
}

export async function fetchApiSuccessOrThrow<
  T,
  TMeta extends object = Record<string, unknown>,
>(
  input: RequestInfo | URL,
  init?: RequestInit,
  fallbackMessage = '请求失败'
): Promise<ApiSuccessResponse<T, TMeta>> {
  const payload = await fetchJsonWithApiError<ApiResponse<T, TMeta>>(
    input,
    init,
    fallbackMessage
  );

  if (!payload.success) {
    throw new Error(getApiErrorMessage(payload, fallbackMessage));
  }

  return payload;
}
