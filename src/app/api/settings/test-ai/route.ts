import { lookup } from 'dns/promises';
import { isIP } from 'net';
import { auth } from '@/auth';
import {
  badRequestResponse,
  errorResponse,
  successResponse,
  unauthorizedResponse,
  withApiHandler,
} from '@/lib/api-response';
import { fetchWithTimeout, HttpTimeoutError } from '@/lib/http-client';
import { testAiConnectionSchema } from '@/lib/validations';

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];

const BLOCKED_HOSTNAMES = [
  'localhost',
  'metadata.google.internal',
  'metadata.internal',
  '169.254.169.254',
];

function isPrivateUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    if (url.protocol !== 'https:') {
      return true;
    }

    const hostname = url.hostname.toLowerCase();

    if (BLOCKED_HOSTNAMES.includes(hostname)) {
      return true;
    }

    if (PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(hostname))) {
      return true;
    }

    return false;
  } catch {
    return true;
  }
}

function isPrivateIp(ip: string): boolean {
  return PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(ip));
}

async function resolvesToPrivateAddress(hostname: string): Promise<boolean> {
  const normalized = hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.includes(normalized)) {
    return true;
  }

  if (isIP(normalized)) {
    return isPrivateIp(normalized);
  }

  try {
    const records = await lookup(normalized, { all: true });
    if (records.length === 0) {
      return true;
    }
    return records.some((record) => isPrivateIp(record.address));
  } catch {
    return true;
  }
}

export const POST = withApiHandler(async ({ request, requestId }) => {
  const session = await auth();
  if (!session?.user) {
    return unauthorizedResponse('请先登录', requestId);
  }

  const raw = await request.json().catch(() => ({}));
  const parsed = testAiConnectionSchema.safeParse(raw);
  if (!parsed.success) {
    return badRequestResponse('缺少必要参数', requestId);
  }

  const { baseUrl, apiKey } = parsed.data;

  if (isPrivateUrl(baseUrl)) {
    return badRequestResponse('不允许访问内部网络地址，请使用 HTTPS 公网地址', requestId);
  }

  const targetUrl = new URL(baseUrl);
  if (targetUrl.port && targetUrl.port !== '443') {
    return badRequestResponse('仅允许访问 HTTPS 默认端口（443）', requestId);
  }

  if (await resolvesToPrivateAddress(targetUrl.hostname)) {
    return badRequestResponse('目标地址解析到内网 IP，已拒绝访问', requestId);
  }

  try {
    const response = await fetchWithTimeout(
      `${baseUrl.replace(/\/+$/, '')}/models`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      },
      5000
    );

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      return errorResponse(
        `API 返回错误: ${response.status}${details ? ` (${details.slice(0, 200)})` : ''}`,
        502,
        'UPSTREAM_ERROR',
        requestId
      );
    }

    return successResponse({ message: '连接成功' }, 200, requestId);
  } catch (error) {
    if (error instanceof HttpTimeoutError) {
      return errorResponse(error.message, 504, 'UPSTREAM_TIMEOUT', requestId);
    }
    return errorResponse(
      error instanceof Error ? error.message : '连接失败',
      502,
      'UPSTREAM_ERROR',
      requestId
    );
  }
});
