import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createSearchRecord } from '@/lib/db';
import { runAnalysisTask } from '@/lib/analysis-service';
import { startAnalysisSchema, validateBody } from '@/lib/validations';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
        }

        // 使用 Zod 验证请求体
        const validation = await validateBody(request, startAnalysisSchema);
        if (!validation.success) {
            return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
        }

        const { keyword, searchType } = validation.data;

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
