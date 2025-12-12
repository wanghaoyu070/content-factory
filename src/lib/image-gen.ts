// AI 图片生成模块 - 硅基流动 API 封装

export interface ImageGenConfig {
  baseUrl: string;      // API 地址
  apiKey: string;       // API Key
  model: string;        // 模型名称，如 Kwai-Kolors/Kolors
}

export interface GeneratedImage {
  url: string;
  seed?: number;
}

interface ImageGenResponse {
  images: {
    url: string;
  }[];
  timings?: {
    inference: number;
  };
  seed?: number;
}

// 生成单张图片
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
      body: JSON.stringify({
        model: config.model,
        prompt,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`图片生成 API 调用失败: ${response.status} - ${error}`);
      return null;
    }

    const data: ImageGenResponse = await response.json();

    if (data.images && data.images.length > 0) {
      return {
        url: data.images[0].url,
        seed: data.seed,
      };
    }

    return null;
  } catch (error) {
    console.error('图片生成失败:', error);
    return null;
  }
}

// 批量生成图片（串行执行，避免并发限制）
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
