import { NextResponse } from 'next/server';
import { getSetting, createArticle, getSearchById } from '@/lib/db';
import { AIConfig, generateArticle, generateImagePrompts, ImageInsertPosition } from '@/lib/ai';
import { generateImage, GeneratedImage, ImageGenConfig } from '@/lib/image-gen';
import { getImageGenConfig } from '@/lib/config';

interface GenerateRequest {
  insightId: number;
  searchId: number;
  insight: {
    title: string;
    description: string;
    suggestedTopics: string[];
    relatedArticles: string[];
  };
  keyword: string;
  style?: string;
  fetchImages?: boolean;
}

// 进度步骤定义
type ProgressStep = 'validating' | 'generating' | 'generating_prompts' | 'generating_images' | 'saving' | 'completed' | 'error';

interface ProgressEvent {
  step: ProgressStep;
  message: string;
  progress: number; // 0-100
  data?: unknown;
}

// 获取 AI 配置（优先环境变量，其次数据库配置）
function getAIConfig(): AIConfig | null {
  // 优先使用环境变量
  if (process.env.OPENAI_API_BASE_URL && process.env.OPENAI_API_KEY) {
    return {
      baseUrl: process.env.OPENAI_API_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4o',
    };
  }

  // 回退到数据库配置
  const aiConfigStr = getSetting('ai');
  if (aiConfigStr) {
    try {
      return JSON.parse(aiConfigStr);
    } catch {
      return null;
    }
  }

  return null;
}

// 将图片插入到文章内容中
function insertImagesIntoContent(
  content: string,
  imagePositions: ImageInsertPosition[],
  generatedImages: (GeneratedImage | null)[]
): string {
  // 找到所有段落
  const paragraphRegex = /<p[^>]*>[\s\S]*?<\/p>/gi;
  const paragraphs: { match: string; index: number; endIndex: number }[] = [];
  let match;

  while ((match = paragraphRegex.exec(content)) !== null) {
    paragraphs.push({
      match: match[0],
      index: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  if (paragraphs.length === 0) {
    return content;
  }

  // 构建插入点映射（段落编号 -> 图片HTML）
  const insertions: { position: number; html: string }[] = [];

  for (let i = 0; i < imagePositions.length; i++) {
    const pos = imagePositions[i];
    const image = generatedImages[i];

    if (!image || !image.url) continue;

    // 找到对应段落的结束位置
    const paragraphIndex = Math.min(pos.insertAfterParagraph - 1, paragraphs.length - 1);
    if (paragraphIndex < 0) continue;

    const insertPosition = paragraphs[paragraphIndex].endIndex;

    const imgHtml = `
<figure class="article-image" style="margin: 24px 0; text-align: center;">
  <img src="${image.url}" alt="${pos.description}" style="max-width: 100%; height: auto; border-radius: 8px;" />
  <figcaption style="text-align: center; color: #666; font-size: 14px; margin-top: 8px;">${pos.description}</figcaption>
</figure>`;

    insertions.push({ position: insertPosition, html: imgHtml });
  }

  // 从后往前插入，避免位置偏移
  insertions.sort((a, b) => b.position - a.position);

  let result = content;
  for (const insertion of insertions) {
    result = result.slice(0, insertion.position) + insertion.html + result.slice(insertion.position);
  }

  return result;
}

// POST /api/articles/generate - AI生成文章（SSE流式响应）
export async function POST(request: Request) {
  const body: GenerateRequest = await request.json();
  const { insightId, searchId, insight, keyword, style, fetchImages = false } = body;

  // 创建 SSE 流
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // 发送进度事件的辅助函数
      const sendProgress = (event: ProgressEvent) => {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      try {
        // 步骤1: 验证参数
        sendProgress({
          step: 'validating',
          message: '正在验证配置...',
          progress: 5,
        });

        if (!insight || !keyword) {
          sendProgress({
            step: 'error',
            message: '缺少必要参数',
            progress: 0,
          });
          controller.close();
          return;
        }

        // 获取 AI 配置（优先环境变量）
        const aiConfig = getAIConfig();
        if (!aiConfig) {
          sendProgress({
            step: 'error',
            message: '请先配置 AI 接口（环境变量或设置页面）',
            progress: 0,
          });
          controller.close();
          return;
        }

        if (!aiConfig.baseUrl || !aiConfig.apiKey || !aiConfig.model) {
          sendProgress({
            step: 'error',
            message: 'AI 配置不完整，请检查 Base URL、API Key 和 Model',
            progress: 0,
          });
          controller.close();
          return;
        }

        // 获取用户偏好设置
        const preferencesStr = getSetting('preferences');
        let preferences: { style?: string; minWords?: number; maxWords?: number } = {};
        if (preferencesStr) {
          try {
            preferences = JSON.parse(preferencesStr);
          } catch {
            // 使用默认值
          }
        }

        // 如果传入了 style 参数，覆盖偏好设置
        if (style) {
          preferences.style = style;
        }

        sendProgress({
          step: 'validating',
          message: '配置验证完成',
          progress: 10,
        });

        // 步骤2: 调用 AI 生成文章
        sendProgress({
          step: 'generating',
          message: 'AI 正在创作文章...',
          progress: 15,
        });

        const generated = await generateArticle(aiConfig, insight, keyword, preferences);

        sendProgress({
          step: 'generating',
          message: '文章创作完成',
          progress: 50,
        });

        // 步骤3: 生成图片（如果启用）
        let images: GeneratedImage[] = [];
        let coverImage = '';
        let contentWithImages = generated.content;

        // 清理文章中可能存在的旧图片标记
        contentWithImages = contentWithImages.replace(/\[INSERT_IMAGE:[^\]]+\]/g, '');

        if (fetchImages) {
          // 获取图片生成配置
          const imageGenConfig = getImageGenConfig();

          if (imageGenConfig && imageGenConfig.baseUrl && imageGenConfig.apiKey) {
            // 步骤3.1: 生成图片提示词
            sendProgress({
              step: 'generating_prompts',
              message: 'AI 正在分析文章，生成配图方案...',
              progress: 55,
            });

            const imagePositions = await generateImagePrompts(
              aiConfig,
              generated.title,
              generated.content,
              3 // 默认生成3张图片
            );

            if (imagePositions.length > 0) {
              sendProgress({
                step: 'generating_prompts',
                message: `已生成 ${imagePositions.length} 张配图方案`,
                progress: 65,
              });

              // 步骤3.2: 调用图片生成 API
              sendProgress({
                step: 'generating_images',
                message: '正在生成配图...',
                progress: 70,
              });

              const generatedImages: (GeneratedImage | null)[] = [];

              for (let i = 0; i < imagePositions.length; i++) {
                const pos = imagePositions[i];

                sendProgress({
                  step: 'generating_images',
                  message: `正在生成配图 (${i + 1}/${imagePositions.length})...`,
                  progress: 70 + Math.floor((i / imagePositions.length) * 15),
                });

                try {
                  const image = await generateImage(imageGenConfig, pos.prompt);
                  generatedImages.push(image);

                  if (image) {
                    images.push(image);
                  }
                } catch (imgErr) {
                  console.error(`生成第 ${i + 1} 张图片失败:`, imgErr);
                  generatedImages.push(null);
                }
              }

              // 将图片插入到文章中
              if (images.length > 0) {
                contentWithImages = insertImagesIntoContent(
                  contentWithImages,
                  imagePositions,
                  generatedImages
                );

                // 设置封面图为第一张成功生成的图片
                coverImage = images[0].url;
              }

              sendProgress({
                step: 'generating_images',
                message: `配图生成完成，成功 ${images.length} 张`,
                progress: 85,
              });
            } else {
              sendProgress({
                step: 'generating_images',
                message: '未能生成配图方案，跳过配图',
                progress: 85,
              });
            }
          } else {
            sendProgress({
              step: 'generating_images',
              message: '未配置图片生成 API，跳过配图',
              progress: 85,
            });
          }
        }

        // 步骤4: 保存文章到数据库
        sendProgress({
          step: 'saving',
          message: '正在保存文章...',
          progress: 90,
        });

        // 获取搜索记录以获取来源信息
        const search = searchId ? getSearchById(searchId) : null;
        const source = search ? `${search.keyword} · ${insight.title}` : insight.title;

        // 保存文章到数据库
        const articleId = createArticle({
          title: generated.title,
          content: contentWithImages,
          coverImage,
          images: images.map(img => img.url),
          source,
          sourceInsightId: insightId,
          sourceSearchId: searchId,
        });

        // 步骤5: 完成
        sendProgress({
          step: 'completed',
          message: '创作完成！',
          progress: 100,
          data: {
            articleId,
            title: generated.title,
            content: contentWithImages,
            summary: generated.summary,
            imageKeywords: generated.imageKeywords,
            images,
            coverImage,
          },
        });

        controller.close();
      } catch (error) {
        console.error('生成文章失败:', error);
        sendProgress({
          step: 'error',
          message: error instanceof Error ? error.message : '生成文章失败',
          progress: 0,
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
