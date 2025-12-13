import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getArticleById, updateArticle } from '@/lib/db';
import { getWechatPublishConfig } from '@/lib/config';

// 获取公众号列表请求
interface GetAccountsRequest {
  action: 'get_accounts';
}

// 发布文章请求
interface PublishArticleRequest {
  action: 'publish';
  articleId: number;
  wechatAppid: string;
  contentFormat?: 'markdown' | 'html';
  articleType?: 'news' | 'newspic';
  author?: string;
}

type RequestBody = GetAccountsRequest | PublishArticleRequest;

// POST /api/publish/wechat - 公众号发布相关操作
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const body: RequestBody = await request.json();

    const config = getWechatPublishConfig(session.user.id);
    if (!config || !config.endpoint || !config.apiKey) {
      return NextResponse.json(
        { success: false, error: '请先配置公众号发布API（环境变量或设置页面）' },
        { status: 400 }
      );
    }

    // 获取公众号列表
    if (body.action === 'get_accounts') {
      const response = await fetch(`${config.endpoint}/api/openapi/wechat-accounts`, {
        method: 'POST',
        headers: {
          'X-API-Key': config.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`获取公众号列表失败: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

    // 发布文章
    if (body.action === 'publish') {
      const { articleId, wechatAppid, contentFormat = 'html', articleType = 'news', author } = body;

      if (!articleId || !wechatAppid) {
        return NextResponse.json(
          { success: false, error: '缺少必要参数: articleId, wechatAppid' },
          { status: 400 }
        );
      }

      // 获取文章内容
      const article = getArticleById(articleId, session.user.id);
      if (!article) {
        return NextResponse.json(
          { success: false, error: '文章不存在' },
          { status: 404 }
        );
      }

      // 调用公众号发布API
      const publishResponse = await fetch(`${config.endpoint}/api/openapi/wechat-publish`, {
        method: 'POST',
        headers: {
          'X-API-Key': config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wechatAppid,
          title: article.title,
          content: article.content,
          summary: article.content?.slice(0, 120).replace(/<[^>]*>/g, '') || '',
          coverImage: article.cover_image || undefined,
          author: author || undefined,
          contentFormat,
          articleType,
        }),
      });

      const publishData = await publishResponse.json();

      if (publishData.success) {
        // 更新文章状态为已发布
        updateArticle(articleId, { status: 'published' }, session.user.id);

        return NextResponse.json({
          success: true,
          data: {
            publicationId: publishData.data?.publicationId,
            materialId: publishData.data?.materialId,
            mediaId: publishData.data?.mediaId,
            message: publishData.data?.message || '文章已成功发布到公众号草稿箱',
          },
        });
      } else {
        return NextResponse.json({
          success: false,
          error: publishData.error || '发布失败',
          code: publishData.code,
        });
      }
    }

    return NextResponse.json(
      { success: false, error: '未知操作' },
      { status: 400 }
    );
  } catch (error) {
    console.error('公众号发布失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '发布失败',
      },
      { status: 500 }
    );
  }
}
