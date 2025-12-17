import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getAIConfig,
  getWechatArticleConfig,
  getWechatPublishConfig,
  getXiaohongshuPublishConfig,
  getImageGenConfig,
} from './config';

// Mock the db module
vi.mock('./db', () => ({
  getSetting: vi.fn(),
}));

import { getSetting } from './db';

const mockedGetSetting = vi.mocked(getSetting);

describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    // Reset environment variables
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getAIConfig', () => {
    it('should return config from environment variables when available', () => {
      process.env.OPENAI_API_BASE_URL = 'https://api.openai.com/v1';
      process.env.OPENAI_API_KEY = 'sk-test-key';
      process.env.OPENAI_MODEL = 'gpt-4';

      const config = getAIConfig();

      expect(config).toEqual({
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test-key',
        model: 'gpt-4',
      });
    });

    it('should use default model when OPENAI_MODEL is not set', () => {
      process.env.OPENAI_API_BASE_URL = 'https://api.openai.com/v1';
      process.env.OPENAI_API_KEY = 'sk-test-key';
      delete process.env.OPENAI_MODEL;

      const config = getAIConfig();

      expect(config?.model).toBe('gpt-4o');
    });

    it('should return null when no env vars and no userId', () => {
      delete process.env.OPENAI_API_BASE_URL;
      delete process.env.OPENAI_API_KEY;

      const config = getAIConfig();

      expect(config).toBeNull();
    });

    it('should fallback to database config when env vars not set', () => {
      delete process.env.OPENAI_API_BASE_URL;
      delete process.env.OPENAI_API_KEY;

      mockedGetSetting.mockReturnValue(
        JSON.stringify({
          baseUrl: 'https://db-api.com',
          apiKey: 'db-key',
          model: 'gpt-3.5',
        })
      );

      const config = getAIConfig(1);

      expect(mockedGetSetting).toHaveBeenCalledWith('ai', 1);
      expect(config).toEqual({
        baseUrl: 'https://db-api.com',
        apiKey: 'db-key',
        model: 'gpt-3.5',
      });
    });

    it('should return null when database config is invalid JSON', () => {
      delete process.env.OPENAI_API_BASE_URL;
      delete process.env.OPENAI_API_KEY;

      mockedGetSetting.mockReturnValue('invalid json');

      const config = getAIConfig(1);

      expect(config).toBeNull();
    });

    it('should return null when no database config exists', () => {
      delete process.env.OPENAI_API_BASE_URL;
      delete process.env.OPENAI_API_KEY;

      mockedGetSetting.mockReturnValue(null);

      const config = getAIConfig(1);

      expect(config).toBeNull();
    });
  });

  describe('getWechatArticleConfig', () => {
    it('should return config from environment variables', () => {
      process.env.WECHAT_ARTICLE_ENDPOINT = 'https://wechat-api.com';
      process.env.WECHAT_ARTICLE_API_KEY = 'wechat-key';

      const config = getWechatArticleConfig();

      expect(config).toEqual({
        endpoint: 'https://wechat-api.com',
        apiKey: 'wechat-key',
      });
    });

    it('should return null when no env vars and no userId', () => {
      delete process.env.WECHAT_ARTICLE_ENDPOINT;
      delete process.env.WECHAT_ARTICLE_API_KEY;

      const config = getWechatArticleConfig();

      expect(config).toBeNull();
    });

    it('should fallback to database config', () => {
      delete process.env.WECHAT_ARTICLE_ENDPOINT;
      delete process.env.WECHAT_ARTICLE_API_KEY;

      mockedGetSetting.mockReturnValue(
        JSON.stringify({
          endpoint: 'https://db-wechat.com',
          apiKey: 'db-wechat-key',
        })
      );

      const config = getWechatArticleConfig(1);

      expect(mockedGetSetting).toHaveBeenCalledWith('wechatArticle', 1);
      expect(config).toEqual({
        endpoint: 'https://db-wechat.com',
        apiKey: 'db-wechat-key',
      });
    });
  });

  describe('getWechatPublishConfig', () => {
    it('should return config from environment variables', () => {
      process.env.WECHAT_PUBLISH_ENDPOINT = 'https://publish-api.com';
      process.env.WECHAT_PUBLISH_API_KEY = 'publish-key';

      const config = getWechatPublishConfig();

      expect(config).toEqual({
        endpoint: 'https://publish-api.com',
        apiKey: 'publish-key',
      });
    });

    it('should return null when no env vars and no userId', () => {
      delete process.env.WECHAT_PUBLISH_ENDPOINT;
      delete process.env.WECHAT_PUBLISH_API_KEY;

      const config = getWechatPublishConfig();

      expect(config).toBeNull();
    });
  });

  describe('getXiaohongshuPublishConfig', () => {
    it('should return config from environment variables', () => {
      process.env.XIAOHONGSHU_PUBLISH_ENDPOINT = 'https://xhs-api.com';
      process.env.XIAOHONGSHU_PUBLISH_API_KEY = 'xhs-key';

      const config = getXiaohongshuPublishConfig();

      expect(config).toEqual({
        endpoint: 'https://xhs-api.com',
        apiKey: 'xhs-key',
      });
    });

    it('should return null when no env vars and no userId', () => {
      delete process.env.XIAOHONGSHU_PUBLISH_ENDPOINT;
      delete process.env.XIAOHONGSHU_PUBLISH_API_KEY;

      const config = getXiaohongshuPublishConfig();

      expect(config).toBeNull();
    });

    it('should fallback to database config', () => {
      delete process.env.XIAOHONGSHU_PUBLISH_ENDPOINT;
      delete process.env.XIAOHONGSHU_PUBLISH_API_KEY;

      mockedGetSetting.mockReturnValue(
        JSON.stringify({
          endpoint: 'https://db-xhs.com',
          apiKey: 'db-xhs-key',
        })
      );

      const config = getXiaohongshuPublishConfig(1);

      expect(mockedGetSetting).toHaveBeenCalledWith('xiaohongshu', 1);
      expect(config).toEqual({
        endpoint: 'https://db-xhs.com',
        apiKey: 'db-xhs-key',
      });
    });
  });

  describe('getImageGenConfig', () => {
    it('should return config from environment variables', () => {
      process.env.IMAGE_GEN_API_URL = 'https://image-api.com';
      process.env.IMAGE_GEN_API_KEY = 'image-key';
      process.env.IMAGE_GEN_MODEL = 'dall-e-3';

      const config = getImageGenConfig();

      expect(config).toEqual({
        baseUrl: 'https://image-api.com',
        apiKey: 'image-key',
        model: 'dall-e-3',
      });
    });

    it('should use default model when IMAGE_GEN_MODEL is not set', () => {
      process.env.IMAGE_GEN_API_URL = 'https://image-api.com';
      process.env.IMAGE_GEN_API_KEY = 'image-key';
      delete process.env.IMAGE_GEN_MODEL;

      const config = getImageGenConfig();

      expect(config?.model).toBe('Kwai-Kolors/Kolors');
    });

    it('should return null when no env vars and no userId', () => {
      delete process.env.IMAGE_GEN_API_URL;
      delete process.env.IMAGE_GEN_API_KEY;

      const config = getImageGenConfig();

      expect(config).toBeNull();
    });

    it('should fallback to database config', () => {
      delete process.env.IMAGE_GEN_API_URL;
      delete process.env.IMAGE_GEN_API_KEY;

      mockedGetSetting.mockReturnValue(
        JSON.stringify({
          baseUrl: 'https://db-image.com',
          apiKey: 'db-image-key',
          model: 'stable-diffusion',
        })
      );

      const config = getImageGenConfig(1);

      expect(mockedGetSetting).toHaveBeenCalledWith('imageGen', 1);
      expect(config).toEqual({
        baseUrl: 'https://db-image.com',
        apiKey: 'db-image-key',
        model: 'stable-diffusion',
      });
    });
  });
});
