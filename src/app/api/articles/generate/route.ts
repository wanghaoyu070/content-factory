import { auth } from '@/auth';
import { getSetting, createArticle, getSearchById } from '@/lib/db';
import { createTrackedGenerationJob, getGenerationJob, trackGenerationProgress } from '@/lib/generation-jobs';
import { generateArticle, generateImagePrompts, ImageInsertPosition } from '@/lib/ai';
import { generateImagesParallel, GeneratedImage } from '@/lib/image-gen';
import { captureScreenshots, insertScreenshotsIntoMarkdown } from '@/lib/screenshot';
import { getImageGenConfig, getAIConfig as getAIUserConfig } from '@/lib/config';
import {
  badRequestResponse,
  createRequestId,
  notFoundResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { positiveIdSchema } from '@/lib/validations';
import { z } from 'zod';

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

const generateRequestSchema = z.object({
  insightId: positiveIdSchema,
  searchId: positiveIdSchema,
  insight: z.object({
    title: z.string().min(1, '选题标题不能为空'),
    description: z.string().default(''),
    suggestedTopics: z.array(z.string()).default([]),
    relatedArticles: z.array(z.string()).default([]),
  }),
  keyword: z.string().min(1, '关键词不能为空'),
  style: z.string().optional(),
  fetchImages: z.boolean().optional().default(false),
});

// 进度步骤定义
type ProgressStep = 'validating' | 'generating' | 'generating_prompts' | 'generating_images' | 'screenshots' | 'saving' | 'completed' | 'error';

interface ProgressEvent {
  step: ProgressStep;
  message: string;
  progress: number; // 0-100
  data?: unknown;
}

// Insert Markdown images into content (split by double newline)
// Heading-aware: never place an image directly after a heading line
function insertImagesIntoContent(
  content: string,
  imagePositions: ImageInsertPosition[],
  generatedImages: (GeneratedImage | null)[]
): string {
  // Split content into blocks by double newline
  const blocks = content.split(/\n\n+/);

  if (blocks.length === 0) {
    return content;
  }

  const isHeading = (block: string) => /^#{1,6}\s/.test(block.trim());

  // Build insertion map: block index → markdown image string
  const insertions: Map<number, string[]> = new Map();

  for (let i = 0; i < imagePositions.length; i++) {
    const pos = imagePositions[i];
    const image = generatedImages[i];

    if (!image || !image.url) continue;

    // Target block index (0-based, from 1-based insertAfterParagraph)
    let targetIndex = Math.min(pos.insertAfterParagraph - 1, blocks.length - 1);
    if (targetIndex < 0) continue;

    // If target lands on a heading, push forward to the next non-heading block
    while (targetIndex < blocks.length - 1 && isHeading(blocks[targetIndex])) {
      targetIndex++;
    }

    const imgMarkdown = `![${pos.description}](${image.url})`;

    if (!insertions.has(targetIndex)) {
      insertions.set(targetIndex, []);
    }
    insertions.get(targetIndex)!.push(imgMarkdown);
  }

  // Rebuild content with images inserted after target blocks
  const result: string[] = [];
  for (let i = 0; i < blocks.length; i++) {
    result.push(blocks[i]);
    const images = insertions.get(i);
    if (images) {
      result.push(...images);
    }
  }

  return result.join('\n\n');
}

// POST /api/articles/generate - AI生成文章（SSE流式响应）
export async function POST(request: Request) {
  const requestId = createRequestId();
  const session = await auth();
  if (!session?.user) {
    return unauthorizedResponse('请先登录', requestId);
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return badRequestResponse('请求体必须是有效的 JSON', requestId);
  }
  const parsedBody = generateRequestSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    const message = parsedBody.error.issues[0]?.message || '请求参数不合法';
    return badRequestResponse(message, requestId);
  }

  const {
    insightId,
    searchId,
    insight,
    keyword,
    style,
    fetchImages = false,
  }: GenerateRequest = parsedBody.data;
  const userId = session.user.id;
  const generationJobId = createTrackedGenerationJob({
    userId,
    searchId,
    insightId,
    style,
    fetchImages,
  });

  // 创建 SSE 流
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // 发送进度事件的辅助函数
      const sendProgress = (event: ProgressEvent) => {
        trackGenerationProgress(generationJobId, userId, {
          ...event,
          data: {
            generationJobId,
            ...(typeof event.data === 'object' && event.data !== null ? event.data as Record<string, unknown> : {}),
          },
        });
        const enrichedEvent = {
          ...event,
          data: {
            generationJobId,
            ...(typeof event.data === 'object' && event.data !== null ? event.data as Record<string, unknown> : {}),
          },
        };
        const data = `data: ${JSON.stringify(enrichedEvent)}\n\n`;
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

        const ownerSearch = getSearchById(searchId, userId);
        if (!ownerSearch) {
          sendProgress({
            step: 'error',
            message: '搜索记录不存在或无权访问',
            progress: 0,
          });
          controller.close();
          return;
        }

        // 获取 AI 配置（优先环境变量）
        const aiConfig = getAIUserConfig(userId);
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
        const preferencesStr = getSetting('preferences', userId);
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
        const images: GeneratedImage[] = [];
        let coverImage = '';
        let contentWithImages = generated.content;

        // Clean up any leftover [INSERT_IMAGE:...] markers from AI output
        contentWithImages = contentWithImages.replace(/\[INSERT_IMAGE:[^\]]+\]/g, '');

        // CyberZen style skips AI image generation — uses real screenshots instead
        const isCyberZenStyle = style === 'cyberzen';

        if (fetchImages && !isCyberZenStyle) {
          // 获取图片生成配置
          const imageGenConfig = getImageGenConfig(userId);

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

              // 步骤3.2: 调用图片生成 API（并行生成提高效率）
              sendProgress({
                step: 'generating_images',
                message: `正在并行生成 ${imagePositions.length} 张配图...`,
                progress: 70,
              });

              // 提取所有 prompt 并行生成
              const prompts = imagePositions.map(pos => pos.prompt);
              const generatedImages = await generateImagesParallel(imageGenConfig, prompts, 3);

              // 收集成功生成的图片
              for (const image of generatedImages) {
                if (image) {
                  images.push(image);
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

        // CyberZen: capture real screenshots via Playwright
        if (isCyberZenStyle && generated.screenshotSuggestions?.length) {
          sendProgress({
            step: 'screenshots',
            message: `正在截取 ${generated.screenshotSuggestions.length} 张真实截图...`,
            progress: 55,
          });

          try {
            const screenshots = await captureScreenshots(generated.screenshotSuggestions);

            if (screenshots.length > 0) {
              contentWithImages = insertScreenshotsIntoMarkdown(
                contentWithImages,
                screenshots
              );

              sendProgress({
                step: 'screenshots',
                message: `已截取 ${screenshots.length} 张精准截图`,
                progress: 80,
              });
            } else {
              sendProgress({
                step: 'screenshots',
                message: '截图失败，文章将不包含截图',
                progress: 80,
              });
            }
          } catch (screenshotError) {
            console.error(`[${requestId}] Screenshot capture failed:`, screenshotError);
            sendProgress({
              step: 'screenshots',
              message: '截图服务异常，跳过截图',
              progress: 80,
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
        const source = ownerSearch ? `${ownerSearch.keyword} · ${insight.title}` : insight.title;

        // 保存文章到数据库
        const articleId = createArticle({
          title: generated.title,
          content: contentWithImages,
          markdown_content: contentWithImages,
          coverImage,
          images: images.map(img => img.url),
          source,
          sourceInsightId: insightId,
          sourceSearchId: searchId,
          userId,
          xhsTags: generated.xhsTags,
        });

        // 步骤5: 完成
        sendProgress({
          step: 'completed',
          message: '创作完成！',
          progress: 100,
          data: {
            generationJobId,
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
        console.error(`[${requestId}] 生成文章失败:`, error);
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
      'X-Request-Id': requestId,
      'X-Generation-Job-Id': String(generationJobId),
    },
  });
}

export async function GET(request: Request) {
  const requestId = createRequestId();
  const session = await auth();
  if (!session?.user) {
    return unauthorizedResponse('请先登录', requestId);
  }

  const { searchParams } = new URL(request.url);
  const jobIdParam = searchParams.get('jobId');
  if (!jobIdParam) {
    return badRequestResponse('缺少 jobId 参数', requestId);
  }

  const parsedId = positiveIdSchema.safeParse(jobIdParam);
  if (!parsedId.success) {
    return badRequestResponse('无效的 jobId 参数', requestId);
  }

  const job = getGenerationJob(parsedId.data, session.user.id);
  if (!job) {
    return notFoundResponse('生成任务不存在', requestId);
  }

  return successResponse({
    jobId: job.id,
    status: job.status,
    step: job.step,
    progress: job.progress,
    message: job.message,
    articleId: job.article_id,
    errorMessage: job.error_message,
    searchId: job.search_id,
    insightId: job.insight_id,
    startedAt: job.started_at,
    completedAt: job.completed_at,
    updatedAt: job.updated_at,
  }, 200, requestId);
}
