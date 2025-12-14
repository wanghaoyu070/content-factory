import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createSearchRecord } from '@/lib/db';
import { runAnalysisTask } from '@/lib/analysis-service';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
        }

        const body = await request.json();
        const { keyword, searchType = 'keyword' } = body;

        if (!keyword) {
            return NextResponse.json({ success: false, error: '关键词不能为空' }, { status: 400 });
        }

        // 1. 创建搜索记录，标记为 processing
        const searchId = createSearchRecord(keyword, 0, session.user.id, {
            searchType,
            status: 'pending' // 初始状态
        } as any);

        // 2. 触发后台任务 (Fire-and-forget)
        // 注意：这里没有 await，故意让它在后台跑
        runAnalysisTask(searchId, keyword, session.user.id, searchType).catch(err => {
            console.error('Background task crashed:', err);
        });

        // 3. 立即返回 ID
        return NextResponse.json({
            success: true,
            data: {
                searchId,
                message: '分析任务已后台启动'
            }
        });

    } catch (error) {
        console.error('Failed to start analysis:', error);
        return NextResponse.json({ success: false, error: '启动任务失败' }, { status: 500 });
    }
}
