// Unsplash API 集成模块

export interface UnsplashImage {
  id: string;
  url: string;
  thumbUrl: string;
  downloadUrl: string;
  width: number;
  height: number;
  description: string | null;
  photographer: string;
  photographerUrl: string;
}

export interface UnsplashConfig {
  accessKey: string;
}

// 搜索图片
export async function searchImages(
  config: UnsplashConfig,
  query: string,
  count: number = 3
): Promise<UnsplashImage[]> {
  if (!config.accessKey) {
    throw new Error('Unsplash Access Key 未配置');
  }

  const response = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`,
    {
      headers: {
        Authorization: `Client-ID ${config.accessKey}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Unsplash API 调用失败: ${response.status} - ${error}`);
  }

  const data = await response.json();

  return data.results.map((photo: {
    id: string;
    urls: { regular: string; thumb: string; full: string };
    width: number;
    height: number;
    description: string | null;
    alt_description: string | null;
    user: { name: string; links: { html: string } };
  }) => ({
    id: photo.id,
    url: photo.urls.regular,
    thumbUrl: photo.urls.thumb,
    downloadUrl: photo.urls.full,
    width: photo.width,
    height: photo.height,
    description: photo.description || photo.alt_description,
    photographer: photo.user.name,
    photographerUrl: photo.user.links.html,
  }));
}

// 获取随机图片
export async function getRandomImages(
  config: UnsplashConfig,
  query: string,
  count: number = 3
): Promise<UnsplashImage[]> {
  if (!config.accessKey) {
    throw new Error('Unsplash Access Key 未配置');
  }

  const response = await fetch(
    `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&count=${count}&orientation=landscape`,
    {
      headers: {
        Authorization: `Client-ID ${config.accessKey}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Unsplash API 调用失败: ${response.status} - ${error}`);
  }

  const data = await response.json();

  // 如果只请求一张图片，API 返回的是对象而不是数组
  const photos = Array.isArray(data) ? data : [data];

  return photos.map((photo: {
    id: string;
    urls: { regular: string; thumb: string; full: string };
    width: number;
    height: number;
    description: string | null;
    alt_description: string | null;
    user: { name: string; links: { html: string } };
  }) => ({
    id: photo.id,
    url: photo.urls.regular,
    thumbUrl: photo.urls.thumb,
    downloadUrl: photo.urls.full,
    width: photo.width,
    height: photo.height,
    description: photo.description || photo.alt_description,
    photographer: photo.user.name,
    photographerUrl: photo.user.links.html,
  }));
}

// 根据多个关键词获取图片
export async function getImagesForKeywords(
  config: UnsplashConfig,
  keywords: string[],
  countPerKeyword: number = 1
): Promise<UnsplashImage[]> {
  const allImages: UnsplashImage[] = [];

  for (const keyword of keywords.slice(0, 5)) { // 最多处理5个关键词
    try {
      const images = await searchImages(config, keyword, countPerKeyword);
      allImages.push(...images);
    } catch (err) {
      console.error(`获取关键词 "${keyword}" 的图片失败:`, err);
    }
  }

  // 去重
  const uniqueImages = allImages.filter(
    (img, index, self) => index === self.findIndex((t) => t.id === img.id)
  );

  return uniqueImages;
}
