import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { createSearchRecord, updateSearchStatus } from '@/lib/db';
import {
    ensureAnalysisJobRecord,
    getAnalysisExecutionMode,
    startAnalysisJobNow,
    triggerAnalysisJobInBackground,
} from '@/lib/analysis-jobs';
import { startAnalysisSchema, validateBody } from '@/lib/validations';
import {
    badRequestResponse,
    createRequestId,
    serverErrorResponse,
    successResponse,
    unauthorizedResponse,
} from '@/lib/api-response';

export async function POST(request: NextRequest) {
    const requestId = createRequestId();
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorizedResponse('请先登录', requestId);
        }

        // 使用 Zod 验证请求体
        const validation = await validateBody(request, startAnalysisSchema);
        if (!validation.success) {
            return badRequestResponse(validation.error, requestId);
        }

        const { keyword, searchType } = validation.data;

        // 1. 创建搜索记录，并先标记为 pending
        const searchId = createSearchRecord(keyword, 0, session.user.id, {
            searchType,
        });
        updateSearchStatus(searchId, 'pending', 0, session.user.id);
        const executionMode = getAnalysisExecutionMode();
        ensureAnalysisJobRecord(searchId, session.user.id, executionMode);

        if (executionMode === 'inline') {
            const finalStatus = await startAnalysisJobNow({
                searchId,
                keyword,
                userId: session.user.id,
                searchType,
            });
            if (finalStatus === 'completed') {
                return successResponse({
                    searchId,
                    status: 'completed',
                    message: '分析任务已完成',
                }, 200, requestId);
            }
            if (finalStatus === 'skipped') {
                return successResponse({
                    searchId,
                    status: 'processing',
                    message: '分析任务已在执行中',
                }, 200, requestId);
            }
            return serverErrorResponse('分析任务失败', requestId);
        }

        triggerAnalysisJobInBackground({
            searchId,
            keyword,
            userId: session.user.id,
            searchType,
        });

        return successResponse({
            searchId,
            status: 'pending',
            message: '分析任务已入队'
        }, 200, requestId);

    } catch (error) {
        console.error(`[API ${requestId}] Failed to start analysis:`, error);
        return serverErrorResponse('启动任务失败', requestId);
    }
}
