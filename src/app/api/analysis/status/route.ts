import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { getSearchById, getArticlesBySearchId, getTopicInsightsBySearchId, getAnalysisJobBySearchId, type SourceArticle, type TopicInsightRecord } from '@/lib/db';
import { getEffectiveAnalysisStatus, maybeRecoverAnalysisJob } from '@/lib/analysis-jobs';
import { badRequestResponse, createRequestId, notFoundResponse, serverErrorResponse, successResponse, unauthorizedResponse } from '@/lib/api-response';
import { positiveIdSchema } from '@/lib/validations';

export async function GET(request: NextRequest) {
    const requestId = createRequestId();
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorizedResponse('请先登录', requestId);
        }

        const { searchParams } = new URL(request.url);
        const searchId = searchParams.get('id');

        if (!searchId) {
            return badRequestResponse('ID 不能为空', requestId);
        }

        const parsedId = positiveIdSchema.safeParse(searchId);
        if (!parsedId.success) {
            return badRequestResponse('无效的 ID', requestId);
        }
        const id = parsedId.data;

        // 查询任务状态
        const searchRecord = getSearchById(id, session.user.id);
        if (!searchRecord) {
            return notFoundResponse('未找到记录', requestId);
        }

        // 根据状态返回不同的数据
        const analysisJob = getAnalysisJobBySearchId(id, session.user.id);
        const effectiveStatus = getEffectiveAnalysisStatus(searchRecord.status, analysisJob?.status);

        if (effectiveStatus === 'pending' || effectiveStatus === 'processing') {
            maybeRecoverAnalysisJob({
                searchId: id,
                keyword: searchRecord.keyword,
                userId: session.user.id,
                searchType: searchRecord.search_type,
            });
        }

        const responseData: {
            status: string;
            searchId: number;
            job?: {
                status: string;
                attempts: number;
                errorMessage: string | null;
                startedAt: string | null;
                completedAt: string | null;
            };
            articles?: SourceArticle[];
            insights?: TopicInsightRecord[];
            wordCloud?: Array<{ word: string; count: number }>;
        } = {
            status: effectiveStatus,
            searchId: id,
        };

        if (analysisJob) {
            responseData.job = {
                status: analysisJob.status,
                attempts: analysisJob.attempts,
                errorMessage: analysisJob.error_message,
                startedAt: analysisJob.started_at,
                completedAt: analysisJob.completed_at,
            };
        }

        if (responseData.status === 'completed') {
            // 如果已完成，返回完整数据
            const articles = getArticlesBySearchId(id, session.user.id);
            const insights = getTopicInsightsBySearchId(id, session.user.id);

            // 简单生成词云
            const wordCloud = articles.length > 0 ? generateSimpleWordCloud(articles) : [];

            responseData.articles = articles;
            responseData.insights = insights;
            responseData.wordCloud = wordCloud;
        } else if (responseData.status === 'processing') {
            // 如果处理中，试着返回已有的文章
            const articles = getArticlesBySearchId(id, session.user.id);
            if (articles.length > 0) {
                responseData.articles = articles;
            }
        }

        return successResponse(responseData, 200, requestId);

    } catch (error) {
        console.error(`[API ${requestId}] Failed to get analysis status:`, error);
        return serverErrorResponse('查询状态失败', requestId);
    }
}

function generateSimpleWordCloud(articles: SourceArticle[]) {
    const words: Record<string, number> = {};
    articles.forEach((article) => {
        const text = article.title + ' ' + (article.content || '');
        // 简单的中文分词模拟
        const matches = text.match(/[\u4e00-\u9fa5]{2,}/g) || [];
        matches.forEach((word: string) => {
            if (word.length >= 2 && word.length <= 4) {
                words[word] = (words[word] || 0) + 1;
            }
        });
    });
    return Object.entries(words)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([word, count]) => ({ word, count }));
}
