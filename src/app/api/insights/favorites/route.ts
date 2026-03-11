import { auth } from '@/auth';
import {
    addInsightFavorite,
    removeInsightFavorite,
    getUserFavoriteInsights,
    getUserFavoriteInsightIds,
    updateInsightFavoriteNote,
} from '@/lib/db';
import {
    badRequestResponse,
    createRequestId,
    notFoundResponse,
    serverErrorResponse,
    successResponse,
    unauthorizedResponse,
} from '@/lib/api-response';
import { positiveIdSchema } from '@/lib/validations';

// GET /api/insights/favorites - 获取用户收藏的洞察
export async function GET(request: Request) {
    const requestId = createRequestId();
    const session = await auth();
    if (!session?.user?.id) {
        return unauthorizedResponse('请先登录', requestId);
    }

    const { searchParams } = new URL(request.url);
    const idsOnly = searchParams.get('ids_only') === 'true';

    if (idsOnly) {
        const ids = getUserFavoriteInsightIds(session.user.id);
        return successResponse(ids, 200, requestId);
    }

    const favorites = getUserFavoriteInsights(session.user.id);
    return successResponse(favorites, 200, requestId);
}

// POST /api/insights/favorites - 添加收藏
export async function POST(request: Request) {
    const requestId = createRequestId();
    const session = await auth();
    if (!session?.user?.id) {
        return unauthorizedResponse('请先登录', requestId);
    }

    try {
        const { insightId, note } = await request.json();

        if (insightId === undefined || insightId === null || insightId === '') {
            return badRequestResponse('缺少洞察 ID', requestId);
        }

        const parsedId = positiveIdSchema.safeParse(insightId);
        if (!parsedId.success) {
            return badRequestResponse('无效的洞察 ID', requestId);
        }
        const numericInsightId = parsedId.data;
        const safeNote = typeof note === 'string' ? note : undefined;

        const success = addInsightFavorite(session.user.id, numericInsightId, safeNote);

        if (success) {
            return successResponse({ message: '收藏成功' }, 200, requestId);
        } else {
            return notFoundResponse('洞察不存在或无权访问', requestId);
        }
    } catch (error) {
        console.error(`[API ${requestId}] 收藏洞察失败:`, error);
        return serverErrorResponse('收藏失败', requestId);
    }
}

// DELETE /api/insights/favorites - 取消收藏
export async function DELETE(request: Request) {
    const requestId = createRequestId();
    const session = await auth();
    if (!session?.user?.id) {
        return unauthorizedResponse('请先登录', requestId);
    }

    const { searchParams } = new URL(request.url);
    const insightId = searchParams.get('insightId');

    if (!insightId) {
        return badRequestResponse('缺少洞察 ID', requestId);
    }

    const parsedId = positiveIdSchema.safeParse(insightId);
    if (!parsedId.success) {
        return badRequestResponse('无效的洞察 ID', requestId);
    }
    const numericInsightId = parsedId.data;

    const success = removeInsightFavorite(session.user.id, numericInsightId);

    if (success) {
        return successResponse({ message: '已取消收藏' }, 200, requestId);
    } else {
        return notFoundResponse('收藏记录不存在', requestId);
    }
}

// PATCH /api/insights/favorites - 更新备注
export async function PATCH(request: Request) {
    const requestId = createRequestId();
    const session = await auth();
    if (!session?.user?.id) {
        return unauthorizedResponse('请先登录', requestId);
    }

    try {
        const { insightId, note } = await request.json();

        if (insightId === undefined || insightId === null || insightId === '') {
            return badRequestResponse('缺少洞察 ID', requestId);
        }

        const parsedId = positiveIdSchema.safeParse(insightId);
        if (!parsedId.success) {
            return badRequestResponse('无效的洞察 ID', requestId);
        }
        const numericInsightId = parsedId.data;
        if (note !== undefined && typeof note !== 'string') {
            return badRequestResponse('note 必须为字符串', requestId);
        }

        const success = updateInsightFavoriteNote(session.user.id, numericInsightId, note || '');

        if (success) {
            return successResponse({ message: '备注更新成功' }, 200, requestId);
        } else {
            return notFoundResponse('收藏记录不存在', requestId);
        }
    } catch (error) {
        console.error(`[API ${requestId}] 更新备注失败:`, error);
        return serverErrorResponse('更新备注失败', requestId);
    }
}
