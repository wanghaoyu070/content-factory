import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import {
  consumeInviteCodeForPendingUser,
  getUserById,
} from '@/lib/db';
import { getToken } from 'next-auth/jwt';
import { encode } from 'next-auth/jwt';
import {
  badRequestResponse,
  createRequestId,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { completeInviteSchema } from '@/lib/validations';

export async function POST(req: NextRequest) {
  const requestId = createRequestId();
  const session = await auth();

  if (!session?.user) {
    return unauthorizedResponse('请先登录', requestId);
  }

  if (session.user.role !== 'pending') {
    return badRequestResponse('无需邀请码', requestId);
  }

  const body = await req.json().catch(() => ({}));
  const parsed = completeInviteSchema.safeParse(body);
  if (!parsed.success) {
    return badRequestResponse('请输入有效邀请码', requestId);
  }
  const code = parsed.data.code.trim();

  const consumeResult = consumeInviteCodeForPendingUser(code, session.user.id);
  if (!consumeResult.success) {
    if (consumeResult.reason === 'NOT_PENDING') {
      return badRequestResponse('无需邀请码', requestId);
    }
    return badRequestResponse('邀请码无效或已被使用', requestId);
  }

  const user = getUserById(session.user.id);

  const token = await getToken({ req, raw: false });
  const response = successResponse({ completed: true }, 200, requestId);

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
