import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

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

    if (PRIVATE_IP_PATTERNS.some(pattern => pattern.test(hostname))) {
      return true;
    }

    return false;
  } catch {
    return true;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

    const { baseUrl, apiKey } = await request.json();

    if (!baseUrl || !apiKey) {
      return NextResponse.json({ success: false, error: '缺少必要参数' });
    }

    if (isPrivateUrl(baseUrl)) {
      return NextResponse.json({
        success: false,
        error: '不允许访问内部网络地址，请使用 HTTPS 公网地址',
      });
    }

    const response = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      return NextResponse.json({ success: true, message: '连接成功' });
    } else {
      const error = await response.text();
      return NextResponse.json({
        success: false,
        error: `API 返回错误: ${response.status}`,
        details: error,
      });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '连接失败',
    });
  }
}
