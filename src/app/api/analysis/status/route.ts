import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSearchById, getArticlesBySearchId, getTopicInsightsBySearchId } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const searchId = searchParams.get('id');

        if (!searchId) {
            return NextResponse.json({ success: false, error: 'ID不能为空' }, { status: 400 });
        }

        const id = parseInt(searchId);
        if (isNaN(id)) {
            return NextResponse.json({ success: false, error: '无效的ID' }, { status: 400 });
        }

        // 查询任务状态
        const searchRecord = getSearchById(id, session.user.id);
        if (!searchRecord) {
            return NextResponse.json({ success: false, error: '未找到记录' }, { status: 404 });
        }

        // 根据状态返回不同的数据
        const responseData: any = {
            status: searchRecord.status || 'completed', // 兼容旧数据
            searchId: id
        };

        if (responseData.status === 'completed') {
            // 如果已完成，返回完整数据
            const articles = getArticlesBySearchId(id);
            const insights = getTopicInsightsBySearchId(id);

            // 简单生成词云
            const wordCloud = articles.length > 0 ? generateSimpleWordCloud(articles) : [];

            responseData.articles = articles;
            responseData.insights = insights;
            responseData.wordCloud = wordCloud;
        } else if (responseData.status === 'processing') {
            // 如果处理中，试着返回已有的文章
            const articles = getArticlesBySearchId(id);
            if (articles.length > 0) {
                responseData.articles = articles;
            }
        }

        return NextResponse.json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error('Failed to get analysis status:', error);
        return NextResponse.json({ success: false, error: '查询状态失败' }, { status: 500 });
    }
}

function generateSimpleWordCloud(articles: any[]) {
    const words: Record<string, number> = {};
    articles.forEach((article) => {
        const text = article.title + ' ' + (article.digest || '');
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
