import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getArticleById, updateArticle } from '@/lib/db';
import { getWechatPublishConfig } from '@/lib/config';

interface RemoteWechatAccount {
  name: string;
  wechatAppid: string;
  username?: string;
  avatar?: string;
  type?: string;
  verified?: boolean;
  status?: string;
}

interface RemoteWechatAccountsResponse {
  success: boolean;
  data?: {
    accounts: RemoteWechatAccount[];
    total: number;
  };
  error?: string;
  message?: string;
}

// 获取公众号列表请求
interface GetAccountsRequest {
  action: 'get_accounts';
}

// 发布文章请求
interface PublishArticleRequest {
  action: 'publish';
  articleId: number | string;
  wechatAppid: string;
  contentFormat?: 'markdown' | 'html';
  articleType?: 'news' | 'newspic';
  author?: string;
  summary?: string;
}

type RequestBody = GetAccountsRequest | PublishArticleRequest;

// POST /api/publish/wechat - 公众号发布相关操作
export async function POST(request: Request) {
  try {
    const session = await auth();
    const body: RequestBody = await request.json();

    // 获取配置 - 优先环境变量，其次用户数据库配置
    const config = getWechatPublishConfig(session?.user?.id);

    // 获取账号列表 - 需要登录
    if (body.action === 'get_accounts') {
      if (!session?.user?.id) {
        return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
      }

      if (!config || !config.endpoint || !config.apiKey) {
        return NextResponse.json(
          { success: false, error: '请先配置公众号发布API（环境变量或设置页面）' },
          { status: 400 }
        );
      }

      const response = await fetch(`${config.endpoint}/api/openapi/wechat-accounts`, {
        method: 'POST',
        headers: {
          'X-API-Key': config.apiKey,
          'Content-Type': 'application/json',
        },
      });

      const raw = await response.text();

      let data: RemoteWechatAccountsResponse | null = null;
      try {
        data = JSON.parse(raw) as RemoteWechatAccountsResponse;
      } catch {
        // JSON 解析失败，返回错误
      }

      if (!response.ok || !data) {
        return NextResponse.json(
          { success: false, error: '获取公众号列表失败' },
          { status: 502 }
        );
      }

      // 根据实际API返回格式判断成功（API返回 { success: true, data: { accounts: [...] } }）
      if (!data.success) {
        return NextResponse.json(
          { success: false, error: data.error || data.message || '获取公众号列表失败' },
          { status: 500 }
        );
      }

      // 正确提取accounts数组
      return NextResponse.json({ success: true, data: data.data?.accounts || [] });
    }

    // 发布文章 - 需要登录和配置
    if (body.action === 'publish') {
      // 发布操作必须登录
      if (!session?.user?.id) {
        return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
      }

      // 发布操作必须有配置
      if (!config || !config.endpoint || !config.apiKey) {
        return NextResponse.json(
          { success: false, error: '请先配置公众号发布API（环境变量或设置页面）' },
          { status: 400 }
        );
      }

      const {
        articleId,
        wechatAppid,
        contentFormat = 'html',
        articleType = 'news',
        author,
        summary,
      } = body;

      const numericArticleId = Number(articleId);

      if (!numericArticleId || Number.isNaN(numericArticleId) || !wechatAppid) {
        return NextResponse.json(
          { success: false, error: '缺少必要参数: articleId, wechatAppid' },
          { status: 400 }
        );
      }

      // 获取文章内容
      const article = getArticleById(numericArticleId, session.user.id);
      if (!article) {
        return NextResponse.json(
          { success: false, error: '文章不存在' },
          { status: 404 }
        );
      }

      const stripHtml = (content: string) => content.replace(/<[^>]*>/g, '');
      const fallbackSummary = stripHtml(article.content || '').slice(0, 120);
      const finalSummary = summary?.trim()
        ? summary.trim().slice(0, 120)
        : fallbackSummary;

      const payload = {
        wechatAppid,
        title: article.title,
        content: article.content,
        summary: finalSummary,
        coverImage: article.cover_image || undefined,
        author: author?.trim() || undefined,
        contentFormat,
        articleType,
      };

      // 调用公众号发布API
      const publishResponse = await fetch(`${config.endpoint}/api/openapi/wechat-publish`, {
        method: 'POST',
        headers: {
          'X-API-Key': config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      let publishData: Record<string, any> = {};
      try {
        publishData = await publishResponse.json();
      } catch {
        // JSON 解析失败
      }

      if (publishResponse.ok && publishData.success) {
        // 更新文章状态为已发布
        updateArticle(numericArticleId, { status: 'published' }, session.user.id);

        return NextResponse.json({
          success: true,
          data: {
            publicationId: publishData.data?.publicationId,
            materialId: publishData.data?.materialId,
            mediaId: publishData.data?.mediaId,
            message: publishData.data?.message || '文章已成功发布到公众号草稿箱',
          },
        });
      }

      return NextResponse.json({
        success: false,
        error: publishData.error || publishData.message || '发布失败',
        code: publishData.code,
      }, { status: publishResponse.status || 500 });
    }

    return NextResponse.json(
      { success: false, error: '未知操作' },
      { status: 400 }
    );
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('公众号发布失败:', error);
    }
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '发布失败',
      },
      { status: 500 }
    );
  }
}
