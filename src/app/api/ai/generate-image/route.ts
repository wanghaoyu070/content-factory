import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getImageGenConfig } from '@/lib/config';

interface GenerateImageRequest {
    prompt: string;
    style?: string;
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
        }

        const body: GenerateImageRequest = await request.json();
        const { prompt, style } = body;

        if (!prompt) {
            return NextResponse.json(
                { success: false, error: '请提供图片描述' },
                { status: 400 }
            );
        }

        // 获取图片生成配置
        const config = getImageGenConfig(session.user.id);
        if (!config || !config.baseUrl || !config.apiKey) {
            return NextResponse.json(
                { success: false, error: '请先配置图片生成 API（设置页面）' },
                { status: 400 }
            );
        }

        // 优化 prompt
        const enhancedPrompt = style
            ? `${prompt}, ${style} style, high quality, professional`
            : `${prompt}, high quality, professional photography`;

        // 调用图片生成 API（硅基流动）
        const response = await fetch(config.baseUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: config.model || 'Kwai-Kolors/Kolors',
                prompt: enhancedPrompt,
                image_size: '1024x1024',
                batch_size: 1,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('图片生成 API 错误:', errorText);
            return NextResponse.json(
                { success: false, error: '图片生成失败，请检查 API 配置' },
                { status: 500 }
            );
        }

        const result = await response.json();

        // 解析结果（适配硅基流动 API 格式）
        let imageUrl = '';
        if (result.images && result.images.length > 0) {
            imageUrl = result.images[0].url;
        } else if (result.data && result.data.length > 0) {
            imageUrl = result.data[0].url;
        }

        if (!imageUrl) {
            return NextResponse.json(
                { success: false, error: '未能获取生成的图片' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                url: imageUrl,
                prompt: enhancedPrompt,
            },
        });
    } catch (error) {
        console.error('图片生成失败:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : '生成失败' },
            { status: 500 }
        );
    }
}
