import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  getInviteCode,
  markInviteCodeUsed,
  updateUserRole,
  getUserById,
} from '@/lib/db';
import { getToken } from 'next-auth/jwt';
import { encode } from 'next-auth/jwt';

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
  }

  if (session.user.role !== 'pending') {
    return NextResponse.json({ success: false, error: '无需邀请码' }, { status: 400 });
  }

  const { code } = await req.json().catch(() => ({ code: '' }));
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ success: false, error: '请输入邀请码' }, { status: 400 });
  }

  const inviteCode = getInviteCode(code.trim());
  if (!inviteCode || inviteCode.used_by) {
    return NextResponse.json({ success: false, error: '邀请码无效或已被使用' }, { status: 400 });
  }

  updateUserRole(session.user.id, 'user');
  markInviteCodeUsed(code.trim(), session.user.id);

  const user = getUserById(session.user.id);

  const token = await getToken({ req, raw: false });
  const response = NextResponse.json({ success: true });

  if (token && process.env.NEXTAUTH_SECRET) {
    token.role = 'user';
    if (user) {
      token.name = user.name || user.github_login || token.name;
      token.githubLogin = user.github_login;
    }

    const encodedToken = await encode({ token, secret: process.env.NEXTAUTH_SECRET });
    const secureCookieName = '__Secure-next-auth.session-token';
    const defaultCookieName = 'next-auth.session-token';
    const hasSecure = req.cookies.has(secureCookieName);
    const sessionCookieName = hasSecure ? secureCookieName : defaultCookieName;

    const existing = req.cookies.get(sessionCookieName);
    const isSecureRequest = existing?.name?.startsWith('__Secure-')
      || req.nextUrl.protocol === 'https:'
      || (process.env.NEXTAUTH_URL?.startsWith('https://') ?? false);
    response.cookies.set(sessionCookieName, encodedToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: isSecureRequest,
      maxAge: 30 * 24 * 60 * 60,
    });
  }

  return response;
}
