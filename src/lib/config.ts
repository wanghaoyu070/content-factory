// 统一配置管理模块
import { getSetting } from './db';

// AI 配置
export interface AIConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

// 公众号文章API配置
export interface WechatArticleConfig {
  endpoint: string;
  apiKey: string;
}

// 公众号发布API配置
export interface WechatPublishConfig {
  endpoint: string;
  apiKey: string;
}

// Unsplash配置
export interface UnsplashConfig {
  accessKey: string;
}

// AI 图片生成配置
export interface ImageGenConfig {
  baseUrl: string;      // API 地址
  apiKey: string;       // API Key
  model: string;        // 模型名称
}

// 获取 AI 配置（优先环境变量，其次数据库配置）
export function getAIConfig(): AIConfig | null {
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

// 获取公众号文章API配置
export function getWechatArticleConfig(): WechatArticleConfig | null {
  // 优先使用环境变量
  if (process.env.WECHAT_ARTICLE_ENDPOINT && process.env.WECHAT_ARTICLE_API_KEY) {
    return {
      endpoint: process.env.WECHAT_ARTICLE_ENDPOINT,
      apiKey: process.env.WECHAT_ARTICLE_API_KEY,
    };
  }

  // 回退到数据库配置
  const configStr = getSetting('wechatArticle');
  if (configStr) {
    try {
      return JSON.parse(configStr);
    } catch {
      return null;
    }
  }

  return null;
}

// 获取公众号发布API配置
export function getWechatPublishConfig(): WechatPublishConfig | null {
  // 优先使用环境变量
  if (process.env.WECHAT_PUBLISH_ENDPOINT && process.env.WECHAT_PUBLISH_API_KEY) {
    return {
      endpoint: process.env.WECHAT_PUBLISH_ENDPOINT,
      apiKey: process.env.WECHAT_PUBLISH_API_KEY,
    };
  }

  // 回退到数据库配置
  const configStr = getSetting('wechatPublish');
  if (configStr) {
    try {
      return JSON.parse(configStr);
    } catch {
      return null;
    }
  }

  return null;
}

// 小红书发布API配置
export interface XiaohongshuPublishConfig {
  endpoint: string;
  apiKey: string;
}

// 获取小红书发布API配置
export function getXiaohongshuPublishConfig(): XiaohongshuPublishConfig | null {
  // 优先使用环境变量
  if (process.env.XIAOHONGSHU_PUBLISH_ENDPOINT && process.env.XIAOHONGSHU_PUBLISH_API_KEY) {
    return {
      endpoint: process.env.XIAOHONGSHU_PUBLISH_ENDPOINT,
      apiKey: process.env.XIAOHONGSHU_PUBLISH_API_KEY,
    };
  }

  // 回退到数据库配置
  const configStr = getSetting('xiaohongshu');
  if (configStr) {
    try {
      return JSON.parse(configStr);
    } catch {
      return null;
    }
  }

  return null;
}

// 获取Unsplash配置
export function getUnsplashConfig(): UnsplashConfig | null {
  // 优先使用环境变量
  if (process.env.UNSPLASH_ACCESS_KEY) {
    return {
      accessKey: process.env.UNSPLASH_ACCESS_KEY,
    };
  }

  // 回退到数据库配置
  const configStr = getSetting('unsplash');
  if (configStr) {
    try {
      return JSON.parse(configStr);
    } catch {
      return null;
    }
  }

  return null;
}

// 获取 AI 图片生成配置（优先环境变量，其次数据库配置）
export function getImageGenConfig(): ImageGenConfig | null {
  // 优先使用环境变量
  if (process.env.IMAGE_GEN_API_URL && process.env.IMAGE_GEN_API_KEY) {
    return {
      baseUrl: process.env.IMAGE_GEN_API_URL,
      apiKey: process.env.IMAGE_GEN_API_KEY,
      model: process.env.IMAGE_GEN_MODEL || 'Kwai-Kolors/Kolors',
    };
  }

  // 回退到数据库配置
  const configStr = getSetting('imageGen');
  if (configStr) {
    try {
      return JSON.parse(configStr);
    } catch {
      return null;
    }
  }

  return null;
}
