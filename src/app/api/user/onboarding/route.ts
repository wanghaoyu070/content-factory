import { auth } from '@/auth';
import { getUserById, updateUserOnboarding } from '@/lib/db';
import {
    badRequestResponse,
    notFoundResponse,
    successResponse,
    unauthorizedResponse,
    withApiHandler,
} from '@/lib/api-response';
import { onboardingUpdateSchema } from '@/lib/validations';

export const GET = withApiHandler(async ({ requestId }) => {
    const session = await auth();
    if (!session?.user?.id) {
        return unauthorizedResponse('请先登录', requestId);
    }

    const user = getUserById(session.user.id);
    if (!user) {
        return notFoundResponse('用户不存在', requestId);
    }

    return successResponse({
        onboardingCompleted: user.onboarding_completed === 1,
    }, 200, requestId);
});

export const POST = withApiHandler(async ({ request, requestId }) => {
    const session = await auth();
    if (!session?.user?.id) {
        return unauthorizedResponse('请先登录', requestId);
    }

    const raw = await request.json().catch(() => ({}));
    const parsed = onboardingUpdateSchema.safeParse(raw);
    if (!parsed.success) {
        return badRequestResponse('completed 必须为布尔值', requestId);
    }

    updateUserOnboarding(session.user.id, parsed.data.completed);

    return successResponse({
        message: '更新成功',
    }, 200, requestId);
});
