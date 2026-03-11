import { auth } from '@/auth';
import { getArticleById, updateArticle } from '@/lib/db';
import { getXiaohongshuPublishConfig } from '@/lib/config';
import { fetchWithTimeout, HttpTimeoutError } from '@/lib/http-client';
import { safeJsonArray } from '@/lib/utils';
import {
  badRequestResponse,
  createRequestId,
  errorResponse,
  notFoundResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { positiveIdSchema } from '@/lib/validations';

// 请求参数
interface PublishRequest {
  articleId: number | string;
  tags?: string[];
}

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return typeof value === 'object' && value !== null ? (value as JsonRecord) : {};
}

// 从HTML内容中提取图片和纯文本
function extractContentAndImages(htmlContent: string): { text: string; images: string[] } {
  // 提取图片URL
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const images: string[] = [];
  let match;
  while ((match = imgRegex.exec(htmlContent)) !== null) {
    images.push(match[1]);
  }

  // HTML转纯文本
  const text = htmlContent
    .replace(/<br\s*\/?>/gi, '\n')           // br转换行
    .replace(/<\/p>/gi, '\n')                 // p结束转换行
    .replace(/<\/div>/gi, '\n')               // div结束转换行
    .replace(/<\/h[1-6]>/gi, '\n\n')          // 标题结束转双换行
    .replace(/<li>/gi, '• ')                  // 列表项添加符号
    .replace(/<\/li>/gi, '\n')                // 列表项结束转换行
    .replace(/<[^>]+>/g, '')                  // 去除所有HTML标签
    .replace(/&nbsp;/g, ' ')                  // 处理空格实体
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')               // 多个换行合并为两个
    .replace(/[ \t]+/g, ' ')                  // 多个空格合并
    .trim();

  return { text, images };
}

// POST /api/publish/xiaohongshu - 发布到小红书
export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const session = await auth();

    if (!session?.user) {
      return unauthorizedResponse('请先登录', requestId);
    }

    const body: PublishRequest = await request.json();
    const { articleId, tags = [] } = body;
    const parsedArticleId = positiveIdSchema.safeParse(articleId);

    // 验证参数
    if (!parsedArticleId.success) {
      return badRequestResponse('缺少必要参数: articleId', requestId);
    }
    const numericArticleId = parsedArticleId.data;

    // 获取配置
    const config = getXiaohongshuPublishConfig(session.user.id);

    if (!config || !config.endpoint || !config.apiKey) {
      return badRequestResponse('请先配置小红书发布API（环境变量或设置页面）', requestId);
    }

    // 获取文章内容
    const article = getArticleById(numericArticleId, session.user.id);
    if (!article) {
      return notFoundResponse('文章不存在', requestId);
    }

    // 图文分离
    const { text, images: contentImages } = extractContentAndImages(article.content || '');

    // 合并数据库中存储的图片和内容中提取的图片
    const storedImages = safeJsonArray<string>(article.images);

    // 去重合并图片
    const allImages = [...new Set([...contentImages, ...storedImages])];

    // 确定封面图：优先使用文章封面，否则使用第一张图片
    let coverImage = article.cover_image;
    if (!coverImage && allImages.length > 0) {
      coverImage = allImages[0];
    }

    // 验证封面图
    if (!coverImage) {
      return badRequestResponse('文章缺少封面图片，无法发布到小红书', requestId);
    }

    // 验证标题或内容
    if (!article.title && !text) {
      return badRequestResponse('文章标题和内容不能同时为空', requestId);
    }

    // 调用小红书发布API
    const publishResponse = await fetchWithTimeout(`${config.endpoint}/api/openapi/publish_note`, {
      method: 'POST',
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: article.title,
        content: text,
        coverImage: coverImage,
        images: allImages.length > 0 ? allImages : undefined,
        tags: tags.length > 0 ? tags : undefined,
      }),
    });

    const publishData = asRecord(await publishResponse.json().catch(() => ({})));
    const publishMeta = asRecord(publishData.data);

    if (publishResponse.ok && publishData.success === true) {
      // 更新文章状态为已发布
      updateArticle(numericArticleId, { status: 'published' }, session.user.id);

      // 根据API文档，publish_url 是发布页面URL，用于生成二维码
      const publishUrl = publishMeta.publish_url;
      const qrImageUrl = publishMeta.xiaohongshu_qr_image_url;

      return successResponse({
        id: publishMeta.id,
        noteId: publishMeta.note_id,
        title: article.title,
        publishUrl: publishUrl,
        qrImageUrl,
        coverImage: coverImage,
        imageCount: allImages.length,
        createdAt: publishMeta.created_at,
      }, 200, requestId);
    }

    return errorResponse(
      typeof publishData.error === 'string' ? publishData.error : '发布失败',
      publishResponse.status || 502,
      typeof publishData.code === 'string' ? publishData.code : 'UPSTREAM_ERROR',
      requestId
    );
  } catch (error) {
    if (error instanceof HttpTimeoutError) {
      return errorResponse(error.message, 504, 'UPSTREAM_TIMEOUT', requestId);
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('小红书发布失败:', error);
    }
    return errorResponse(
      error instanceof Error ? error.message : '发布失败',
      500,
      'INTERNAL_ERROR',
      requestId
    );
  }
}
