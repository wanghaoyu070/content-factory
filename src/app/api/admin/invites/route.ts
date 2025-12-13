import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  getInviteCodes,
  createInviteCodeRecord,
  deleteInviteCode,
  getInviteCode,
} from '@/lib/db';

function requireAdmin(session: Awaited<ReturnType<typeof auth>>) {
  if (!session?.user) {
    return { ok: false, response: NextResponse.json({ success: false, error: '请先登录' }, { status: 401 }) };
  }
  if (session.user.role !== 'admin') {
    return { ok: false, response: NextResponse.json({ success: false, error: '仅管理员可访问' }, { status: 403 }) };
  }
  return { ok: true };
}

function generateCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
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
  const session = await auth();
  const authResult = requireAdmin(session);
  if (!authResult.ok) return authResult.response;

  const invites = getInviteCodes();
  return NextResponse.json({ success: true, data: invites });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const authResult = requireAdmin(session);
  if (!authResult.ok) return authResult.response;

  const body = await request.json().catch(() => ({}));
  const count = Math.min(Math.max(Number(body?.count) || 1, 1), 10);

  const codes = await generateUniqueCodes(count);
  const created = codes.map((code) => {
    const id = createInviteCodeRecord(code, session!.user!.id);
    return { id, code };
  });

  const invites = getInviteCodes();
  return NextResponse.json({ success: true, data: { created, invites } });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  const authResult = requireAdmin(session);
  if (!authResult.ok) return authResult.response;

  const body = await request.json().catch(() => ({}));
  const id = Number(body?.id);
  if (!id) {
    return NextResponse.json({ success: false, error: '缺少邀请码 ID' }, { status: 400 });
  }

  const success = deleteInviteCode(id);
  if (!success) {
    return NextResponse.json({ success: false, error: '邀请码不存在或已被使用' }, { status: 400 });
  }

  const invites = getInviteCodes();
  return NextResponse.json({ success: true, data: invites });
}
