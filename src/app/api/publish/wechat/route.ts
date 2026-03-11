import { auth } from '@/auth';
import { getArticleById, updateArticle } from '@/lib/db';
import { getWechatPublishConfig } from '@/lib/config';
import { fetchWithTimeout, HttpTimeoutError } from '@/lib/http-client';
import {
  badRequestResponse,
  createRequestId,
  errorResponse,
  notFoundResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { positiveIdSchema } from '@/lib/validations';

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
type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return typeof value === 'object' && value !== null ? (value as JsonRecord) : {};
}

// POST /api/publish/wechat - 公众号发布相关操作
export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const session = await auth();
    const body: RequestBody = await request.json();

    // 获取配置 - 优先环境变量，其次用户数据库配置
    const config = getWechatPublishConfig(session?.user?.id);

    // 获取账号列表 - 需要登录
    if (body.action === 'get_accounts') {
      if (!session?.user?.id) {
        return unauthorizedResponse('请先登录', requestId);
      }

      if (!config || !config.endpoint || !config.apiKey) {
        return badRequestResponse('请先配置公众号发布API（环境变量或设置页面）', requestId);
      }

      const response = await fetchWithTimeout(`${config.endpoint}/api/openapi/wechat-accounts`, {
        method: 'POST',
        headers: {
          'X-API-Key': config.apiKey,
          'Content-Type': 'application/json',
        },
      }, 8000);

      const raw = await response.text();

      let data: RemoteWechatAccountsResponse | null = null;
      try {
        data = JSON.parse(raw) as RemoteWechatAccountsResponse;
      } catch {
        // JSON 解析失败，返回错误
      }

      if (!response.ok || !data) {
        return errorResponse('获取公众号列表失败', 502, 'UPSTREAM_ERROR', requestId);
      }

      // 根据实际API返回格式判断成功（API返回 { success: true, data: { accounts: [...] } }）
      if (!data.success) {
        return errorResponse(
          data.error || data.message || '获取公众号列表失败',
          502,
          'UPSTREAM_ERROR',
          requestId
        );
      }

      // 正确提取accounts数组
      return successResponse(data.data?.accounts || [], 200, requestId);
    }

    // 发布文章 - 需要登录和配置
    if (body.action === 'publish') {
      // 发布操作必须登录
      if (!session?.user?.id) {
        return unauthorizedResponse('请先登录', requestId);
      }

      // 发布操作必须有配置
      if (!config || !config.endpoint || !config.apiKey) {
        return badRequestResponse('请先配置公众号发布API（环境变量或设置页面）', requestId);
      }

      const {
        articleId,
        wechatAppid,
        contentFormat = 'html',
        articleType = 'news',
        author,
        summary,
      } = body;

      const parsedArticleId = positiveIdSchema.safeParse(articleId);
      if (!parsedArticleId.success || !wechatAppid) {
        return badRequestResponse('缺少必要参数: articleId, wechatAppid', requestId);
      }
      const numericArticleId = parsedArticleId.data;

      // 获取文章内容
      const article = getArticleById(numericArticleId, session.user.id);
      if (!article) {
        return notFoundResponse('文章不存在', requestId);
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
      const publishResponse = await fetchWithTimeout(`${config.endpoint}/api/openapi/wechat-publish`, {
        method: 'POST',
        headers: {
          'X-API-Key': config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }, 12000);

      const publishData = asRecord(await publishResponse.json().catch(() => ({})));
      const publishMeta = asRecord(publishData.data);

      if (publishResponse.ok && publishData.success === true) {
        // 更新文章状态为已发布
        updateArticle(numericArticleId, { status: 'published' }, session.user.id);

        return successResponse({
          publicationId: publishMeta.publicationId,
          materialId: publishMeta.materialId,
          mediaId: publishMeta.mediaId,
          message: typeof publishMeta.message === 'string' ? publishMeta.message : '文章已成功发布到公众号草稿箱',
        }, 200, requestId);
      }

      return errorResponse(
        (typeof publishData.error === 'string' ? publishData.error : undefined) ||
          (typeof publishData.message === 'string' ? publishData.message : undefined) ||
          '发布失败',
        publishResponse.status || 502,
        typeof publishData.code === 'string' ? publishData.code : 'UPSTREAM_ERROR',
        requestId
      );
    }

    return badRequestResponse('未知操作', requestId);
  } catch (error) {
    if (error instanceof HttpTimeoutError) {
      return errorResponse(error.message, 504, 'UPSTREAM_TIMEOUT', requestId);
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('公众号发布失败:', error);
    }
    return errorResponse(
      error instanceof Error ? error.message : '发布失败',
      500,
      'INTERNAL_ERROR',
      requestId
    );
  }
}
