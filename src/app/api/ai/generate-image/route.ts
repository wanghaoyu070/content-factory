import { auth } from '@/auth';
import { getImageGenConfig } from '@/lib/config';
import {
    badRequestResponse,
    createRequestId,
    errorResponse,
    successResponse,
    unauthorizedResponse,
} from '@/lib/api-response';
import { fetchWithTimeout, HttpTimeoutError } from '@/lib/http-client';

interface GenerateImageRequest {
    prompt: string;
    style?: string;
}

export async function POST(request: Request) {
    const requestId = createRequestId();
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorizedResponse('请先登录', requestId);
        }

        const body: GenerateImageRequest = await request.json();
        const { prompt, style } = body;

        if (!prompt) {
            return badRequestResponse('请提供图片描述', requestId);
        }

        // 获取图片生成配置
        const config = getImageGenConfig(session.user.id);
        if (!config || !config.baseUrl || !config.apiKey) {
            return badRequestResponse('请先配置图片生成 API（设置页面）', requestId);
        }

        // 优化 prompt
        const enhancedPrompt = style
            ? `${prompt}, ${style} style, high quality, professional`
            : `${prompt}, high quality, professional photography`;

        // Build provider-specific request body
        const isSeedream = config.provider === 'seedream';
        const requestBody = isSeedream
            ? {
                model: config.model,
                prompt: enhancedPrompt,
                size: '2K',
                output_format: 'png',
                response_format: 'url',
                watermark: false,
            }
            : {
                model: config.model || 'Kwai-Kolors/Kolors',
                prompt: enhancedPrompt,
                image_size: '1024x1024',
                batch_size: 1,
            };

        // Seedream generation can take longer (~15s)
        const timeout = isSeedream ? 30000 : 20000;

        const response = await fetchWithTimeout(config.baseUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        }, timeout);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[API ${requestId}] 图片生成 API 错误:`, errorText);
            return errorResponse('图片生成失败，请检查 API 配置', 502, 'UPSTREAM_ERROR', requestId);
        }

        const result = await response.json();

        // Parse result (supports both SiliconFlow and Seedream formats)
        let imageUrl = '';
        if (result.images && result.images.length > 0) {
            imageUrl = result.images[0].url;
        } else if (result.data && result.data.length > 0) {
            imageUrl = result.data[0].url;
        }

        if (!imageUrl) {
            return errorResponse('未能获取生成的图片', 502, 'UPSTREAM_INVALID_RESPONSE', requestId);
        }

        return successResponse({
            url: imageUrl,
            prompt: enhancedPrompt,
        }, 200, requestId);
    } catch (error) {
        if (error instanceof HttpTimeoutError) {
            return errorResponse(error.message, 504, 'UPSTREAM_TIMEOUT', requestId);
        }
        console.error(`[API ${requestId}] 图片生成失败:`, error);
        return errorResponse(error instanceof Error ? error.message : '生成失败', 500, 'INTERNAL_ERROR', requestId);
    }
}
