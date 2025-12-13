import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getUserById, updateUserOnboarding } from '@/lib/db';

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const user = getUserById(session.user.id);
    if (!user) {
        return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    return NextResponse.json({
        success: true,
        data: {
            onboardingCompleted: user.onboarding_completed === 1,
        },
    });
}

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    try {
        const { completed } = await request.json();
        updateUserOnboarding(session.user.id, completed);

        return NextResponse.json({
            success: true,
            message: '更新成功',
        });
    } catch (error) {
        console.error('更新 onboarding 状态失败:', error);
        return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }
}
