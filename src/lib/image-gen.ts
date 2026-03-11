// AI 图片生成模块 - 多 Provider 支持 (SiliconFlow / Seedream)
import type { ImageGenConfig } from './config';

// Re-export the config type for convenience
export type { ImageGenConfig };

export interface GeneratedImage {
  url: string;
  seed?: number;
}

// SiliconFlow response format
interface SiliconFlowResponse {
  images: { url: string }[];
  timings?: { inference: number };
  seed?: number;
}

// Seedream (Volcengine Ark) response format
interface SeedreamResponse {
  data: { url: string; size?: string }[];
  usage?: { generated_images: number; output_tokens: number; total_tokens: number };
}

// Build request body based on provider
function buildRequestBody(config: ImageGenConfig, prompt: string): Record<string, unknown> {
  if (config.provider === 'seedream') {
    return {
      model: config.model,
      prompt,
      size: '2K',
      output_format: 'png',
      response_format: 'url',
      watermark: false,
    };
  }
  // Default: SiliconFlow
  return {
    model: config.model,
    prompt,
  };
}

// Parse image URL from response based on provider
function parseImageUrl(data: SiliconFlowResponse | SeedreamResponse): string | null {
  // SiliconFlow format: { images: [{ url }] }
  if ('images' in data && data.images?.length > 0) {
    return data.images[0].url;
  }
  // Seedream format: { data: [{ url }] }
  if ('data' in data && data.data?.length > 0) {
    return data.data[0].url;
  }
  return null;
}

// Generate a single image
export async function generateImage(
  config: ImageGenConfig,
  prompt: string
): Promise<GeneratedImage | null> {
  try {
    const response = await fetch(config.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(buildRequestBody(config, prompt)),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`图片生成 API 调用失败: ${response.status} - ${error}`);
      return null;
    }

    const data = await response.json();
    const url = parseImageUrl(data);

    if (url) {
      return { url, seed: 'seed' in data ? data.seed : undefined };
    }

    return null;
  } catch (error) {
    console.error('图片生成失败:', error);
    return null;
  }
}

// Batch generate images (serial to avoid rate limits)
export async function generateImages(
  config: ImageGenConfig,
  prompts: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<GeneratedImage[]> {
  const results: GeneratedImage[] = [];
  const total = prompts.length;

  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i];
    const image = await generateImage(config, prompt);

    if (image) {
      results.push(image);
    }

    onProgress?.(i + 1, total);
  }

  return results;
}

// Parallel image generation (for APIs supporting concurrency)
export async function generateImagesParallel(
  config: ImageGenConfig,
  prompts: string[],
  concurrency: number = 3
): Promise<(GeneratedImage | null)[]> {
  const results: (GeneratedImage | null)[] = new Array(prompts.length).fill(null);

  for (let i = 0; i < prompts.length; i += concurrency) {
    const batch = prompts.slice(i, i + concurrency);
    const batchPromises = batch.map((prompt, index) =>
      generateImage(config, prompt)
        .then(image => {
          results[i + index] = image;
          return image;
        })
        .catch(err => {
          console.error(`生成第 ${i + index + 1} 张图片失败:`, err);
          return null;
        })
    );

    await Promise.all(batchPromises);
  }

  return results;
}
