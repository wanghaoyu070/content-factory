import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getUserById } from '@/lib/db';

// GET /api/debug/session - 调试 session 状态
export async function GET() {
    try {
        const session = await auth();

        let dbUser = null;
        if (session?.user?.id) {
            dbUser = getUserById(session.user.id);
        }

        return NextResponse.json({
            hasSession: !!session,
            session: session ? {
                user: session.user,
                expires: session.expires,
            } : null,
            dbUser: dbUser ? {
                id: dbUser.id,
                githubLogin: dbUser.github_login,
                role: dbUser.role,
            } : null,
            issue: !session
                ? 'No session - user not logged in'
                : !session.user?.id
                    ? 'Session exists but no user ID'
                    : !dbUser
                        ? 'User ID in session but not found in database'
                        : null,
        });
    } catch (error) {
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
