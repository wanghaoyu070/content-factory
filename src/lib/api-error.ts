import type { ApiErrorCode, ApiErrorResponse } from '@/types/api';

const ERROR_HINT_MAP: Partial<Record<ApiErrorCode, string>> = {
  BAD_REQUEST: '请检查输入后重试',
  UNAUTHORIZED: '请先登录',
  FORBIDDEN: '当前账号无权限',
  NOT_FOUND: '目标数据不存在',
  UNPROCESSABLE_ENTITY: '当前操作不符合规则',
  UPSTREAM_TIMEOUT: '服务响应慢，请稍后再试',
  UPSTREAM_ERROR: '上游服务异常，请稍后再试',
  SERVICE_UNAVAILABLE: '服务暂不可用，请联系管理员',
  INTERNAL_ERROR: '系统异常，请稍后重试',
};

function isApiErrorResponse(payload: unknown): payload is ApiErrorResponse {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'success' in payload &&
    (payload as { success?: unknown }).success === false
  );
}

export function getApiErrorMessage(payload: unknown, fallback = '请求失败'): string {
  if (!isApiErrorResponse(payload)) {
    return fallback;
  }

  const base = payload.error || fallback;
  const hint = payload.code ? ERROR_HINT_MAP[payload.code] : undefined;
  const requestSuffix = payload.requestId ? `（请求ID: ${payload.requestId}）` : '';

  if (hint) {
    return `${base}，${hint}${requestSuffix}`;
  }
  return `${base}${requestSuffix}`;
}
