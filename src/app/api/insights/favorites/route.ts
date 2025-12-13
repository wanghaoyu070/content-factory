import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
    addInsightFavorite,
    removeInsightFavorite,
    getUserFavoriteInsights,
    getUserFavoriteInsightIds,
    updateInsightFavoriteNote,
} from '@/lib/db';

// GET /api/insights/favorites - 获取用户收藏的洞察
export async function GET(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const idsOnly = searchParams.get('ids_only') === 'true';

    if (idsOnly) {
        const ids = getUserFavoriteInsightIds(session.user.id);
        return NextResponse.json({ success: true, data: ids });
    }

    const favorites = getUserFavoriteInsights(session.user.id);
    return NextResponse.json({ success: true, data: favorites });
}

// POST /api/insights/favorites - 添加收藏
export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    try {
        const { insightId, note } = await request.json();

        if (!insightId) {
            return NextResponse.json({ error: '缺少洞察 ID' }, { status: 400 });
        }

        const success = addInsightFavorite(session.user.id, insightId, note);

        if (success) {
            return NextResponse.json({ success: true, message: '收藏成功' });
        } else {
            return NextResponse.json({ error: '收藏失败' }, { status: 500 });
        }
    } catch (error) {
        console.error('收藏洞察失败:', error);
        return NextResponse.json({ error: '收藏失败' }, { status: 500 });
    }
}

// DELETE /api/insights/favorites - 取消收藏
export async function DELETE(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const insightId = searchParams.get('insightId');

    if (!insightId) {
        return NextResponse.json({ error: '缺少洞察 ID' }, { status: 400 });
    }

    const success = removeInsightFavorite(session.user.id, parseInt(insightId));

    if (success) {
        return NextResponse.json({ success: true, message: '已取消收藏' });
    } else {
        return NextResponse.json({ error: '取消收藏失败' }, { status: 500 });
    }
}

// PATCH /api/insights/favorites - 更新备注
export async function PATCH(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    try {
        const { insightId, note } = await request.json();

        if (!insightId) {
            return NextResponse.json({ error: '缺少洞察 ID' }, { status: 400 });
        }

        const success = updateInsightFavoriteNote(session.user.id, insightId, note || '');

        if (success) {
            return NextResponse.json({ success: true, message: '备注更新成功' });
        } else {
            return NextResponse.json({ error: '更新备注失败' }, { status: 500 });
        }
    } catch (error) {
        console.error('更新备注失败:', error);
        return NextResponse.json({ error: '更新备注失败' }, { status: 500 });
    }
}
