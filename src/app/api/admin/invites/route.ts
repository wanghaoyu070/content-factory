import { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { auth } from '@/auth';
import {
  getInviteCodes,
  createInviteCodeRecord,
  deleteInviteCode,
  getInviteCode,
} from '@/lib/db';
import {
  badRequestResponse,
  createRequestId,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';

function requireAdmin(session: Awaited<ReturnType<typeof auth>>, requestId: string) {
  if (!session?.user) {
    return { ok: false, response: unauthorizedResponse('请先登录', requestId) };
  }
  if (session.user.role !== 'admin') {
    return { ok: false, response: forbiddenResponse('仅管理员可访问', requestId) };
  }
  return { ok: true };
}

function generateCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

async function generateUniqueCodes(count: number) {
  const codes: string[] = [];
  while (codes.length < count) {
    const code = generateCode();
    if (!getInviteCode(code)) {
      codes.push(code);
    }
  }
  return codes;
}

export async function GET() {
  const requestId = createRequestId();
  const session = await auth();
  const authResult = requireAdmin(session, requestId);
  if (!authResult.ok) return authResult.response;

  const invites = getInviteCodes();
  return successResponse(invites, 200, requestId);
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  const session = await auth();
  const authResult = requireAdmin(session, requestId);
  if (!authResult.ok) return authResult.response;

  const body = await request.json().catch(() => ({}));
  const count = Math.min(Math.max(Number(body?.count) || 1, 1), 10);

  const codes = await generateUniqueCodes(count);
  const created = codes.map((code) => {
    const id = createInviteCodeRecord(code, session!.user!.id);
    return { id, code };
  });

  const invites = getInviteCodes();
  return successResponse({ created, invites }, 200, requestId);
}

export async function DELETE(request: NextRequest) {
  const requestId = createRequestId();
  const session = await auth();
  const authResult = requireAdmin(session, requestId);
  if (!authResult.ok) return authResult.response;

  const body = await request.json().catch(() => ({}));
  const id = Number(body?.id);
  if (!id) {
    return badRequestResponse('缺少邀请码 ID', requestId);
  }

  const success = deleteInviteCode(id);
  if (!success) {
    return badRequestResponse('邀请码不存在或已被使用', requestId);
  }

  const invites = getInviteCodes();
  return successResponse(invites, 200, requestId);
}
