import { describe, it, expect } from 'vitest';
import {
  ArticleStatus,
  createArticleSchema,
  updateArticleSchema,
  batchArticleSchema,
  generateArticleSchema,
  aiAssistSchema,
  generateImageSchema,
  wechatPublishSchema,
  xiaohongshuPublishSchema,
  startAnalysisSchema,
  aiConfigSchema,
  paginationSchema,
  completeInviteSchema,
  validateQuery,
} from './validations';

describe('ArticleStatus', () => {
  it('should accept valid status values', () => {
    expect(ArticleStatus.parse('draft')).toBe('draft');
    expect(ArticleStatus.parse('pending_review')).toBe('pending_review');
    expect(ArticleStatus.parse('published')).toBe('published');
    expect(ArticleStatus.parse('archived')).toBe('archived');
  });

  it('should reject invalid status values', () => {
    expect(() => ArticleStatus.parse('invalid')).toThrow();
  });
});

describe('createArticleSchema', () => {
  it('should validate valid article data', () => {
    const data = {
      title: '测试文章',
      content: '这是文章内容',
    };

    const result = createArticleSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('draft'); // default value
    }
  });

  it('should reject empty title', () => {
    const data = {
      title: '',
      content: '内容',
    };

    const result = createArticleSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject title exceeding 200 characters', () => {
    const data = {
      title: 'a'.repeat(201),
      content: '内容',
    };

    const result = createArticleSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should accept optional cover_image as valid URL', () => {
    const data = {
      title: '测试',
      content: '内容',
      cover_image: 'https://example.com/image.jpg',
    };

    const result = createArticleSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should reject invalid cover_image URL', () => {
    const data = {
      title: '测试',
      content: '内容',
      cover_image: 'not-a-url',
    };

    const result = createArticleSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('updateArticleSchema', () => {
  it('should transform string id to number', () => {
    const data = {
      id: '123',
      title: '更新标题',
    };

    const result = updateArticleSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(123);
    }
  });

  it('should accept number id', () => {
    const data = {
      id: 456,
      content: '更新内容',
    };

    const result = updateArticleSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(456);
    }
  });
});

describe('batchArticleSchema', () => {
  it('should validate batch delete action', () => {
    const data = {
      action: 'delete',
      ids: ['1', '2', '3'],
    };

    const result = batchArticleSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ids).toEqual([1, 2, 3]);
    }
  });

  it('should reject empty ids array', () => {
    const data = {
      action: 'delete',
      ids: [],
    };

    const result = batchArticleSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject invalid action', () => {
    const data = {
      action: 'invalid_action',
      ids: [1],
    };

    const result = batchArticleSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should accept export action with format', () => {
    const data = {
      action: 'export',
      ids: [1, 2],
      format: 'markdown',
    };

    const result = batchArticleSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe('generateArticleSchema', () => {
  it('should validate with minimal insight data', () => {
    const data = {
      insight: {
        title: '选题标题',
      },
    };

    const result = generateArticleSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.style).toBe('专业、有深度');
      expect(result.data.length).toBe('medium');
      expect(result.data.generateImages).toBe(true);
      expect(result.data.imageCount).toBe(3);
    }
  });

  it('should reject empty insight title', () => {
    const data = {
      insight: {
        title: '',
      },
    };

    const result = generateArticleSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should validate custom options', () => {
    const data = {
      insight: { title: '标题' },
      style: '轻松幽默',
      length: 'long',
      generateImages: false,
      imageCount: 0,
    };

    const result = generateArticleSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe('aiAssistSchema', () => {
  it('should validate rewrite action', () => {
    const data = {
      action: 'rewrite',
      text: '需要改写的文本',
    };

    const result = aiAssistSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should reject empty text', () => {
    const data = {
      action: 'expand',
      text: '',
    };

    const result = aiAssistSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject text exceeding 10000 characters', () => {
    const data = {
      action: 'summarize',
      text: 'a'.repeat(10001),
    };

    const result = aiAssistSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should accept translate action with target language', () => {
    const data = {
      action: 'translate',
      text: 'Hello world',
      targetLanguage: 'zh-CN',
    };

    const result = aiAssistSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe('generateImageSchema', () => {
  it('should validate with default size', () => {
    const data = {
      prompt: '一只可爱的猫咪',
    };

    const result = generateImageSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.size).toBe('1024x1024');
    }
  });

  it('should reject empty prompt', () => {
    const data = {
      prompt: '',
    };

    const result = generateImageSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject prompt exceeding 1000 characters', () => {
    const data = {
      prompt: 'a'.repeat(1001),
    };

    const result = generateImageSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('wechatPublishSchema', () => {
  it('should validate publish data', () => {
    const data = {
      articleId: '123',
      accountId: 'account_001',
    };

    const result = wechatPublishSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.articleId).toBe(123);
      expect(result.data.needOpenComment).toBe(false);
    }
  });

  it('should reject empty accountId', () => {
    const data = {
      articleId: 123,
      accountId: '',
    };

    const result = wechatPublishSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject digest exceeding 120 characters', () => {
    const data = {
      articleId: 123,
      accountId: 'account_001',
      digest: 'a'.repeat(121),
    };

    const result = wechatPublishSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('xiaohongshuPublishSchema', () => {
  it('should validate publish data', () => {
    const data = {
      articleId: 123,
      title: '小红书标题',
      content: '笔记内容',
      images: ['https://example.com/1.jpg'],
    };

    const result = xiaohongshuPublishSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should reject title exceeding 20 characters', () => {
    const data = {
      articleId: 123,
      title: 'a'.repeat(21),
      content: '内容',
      images: ['https://example.com/1.jpg'],
    };

    const result = xiaohongshuPublishSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject empty images array', () => {
    const data = {
      articleId: 123,
      title: '标题',
      content: '内容',
      images: [],
    };

    const result = xiaohongshuPublishSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject more than 9 images', () => {
    const data = {
      articleId: 123,
      title: '标题',
      content: '内容',
      images: Array(10).fill('https://example.com/img.jpg'),
    };

    const result = xiaohongshuPublishSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('startAnalysisSchema', () => {
  it('should validate with default searchType', () => {
    const data = {
      keyword: '人工智能',
    };

    const result = startAnalysisSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.searchType).toBe('keyword');
    }
  });

  it('should accept account searchType', () => {
    const data = {
      keyword: '公众号名称',
      searchType: 'account',
    };

    const result = startAnalysisSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should reject empty keyword', () => {
    const data = {
      keyword: '',
    };

    const result = startAnalysisSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject keyword exceeding 100 characters', () => {
    const data = {
      keyword: 'a'.repeat(101),
    };

    const result = startAnalysisSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('aiConfigSchema', () => {
  it('should validate valid AI config', () => {
    const data = {
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'sk-test-key',
      model: 'gpt-4',
    };

    const result = aiConfigSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should reject invalid URL', () => {
    const data = {
      baseUrl: 'not-a-url',
      apiKey: 'sk-test-key',
      model: 'gpt-4',
    };

    const result = aiConfigSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject empty apiKey', () => {
    const data = {
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4',
    };

    const result = aiConfigSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('paginationSchema', () => {
  it('should coerce string values to numbers', () => {
    const data = {
      page: '2',
      pageSize: '10',
    };

    const result = paginationSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.pageSize).toBe(10);
    }
  });

  it('should use default values', () => {
    const data = {};

    const result = paginationSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
    }
  });

  it('should reject pageSize exceeding 100', () => {
    const data = {
      page: 1,
      pageSize: 101,
    };

    const result = paginationSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('completeInviteSchema', () => {
  it('should validate valid invite code', () => {
    const data = {
      code: 'ABC123',
    };

    const result = completeInviteSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should reject empty code', () => {
    const data = {
      code: '',
    };

    const result = completeInviteSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject code exceeding 50 characters', () => {
    const data = {
      code: 'a'.repeat(51),
    };

    const result = completeInviteSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('validateQuery', () => {
  it('should validate query parameters', () => {
    const searchParams = new URLSearchParams('page=2&pageSize=10');

    const result = validateQuery(searchParams, paginationSchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.pageSize).toBe(10);
    }
  });

  it('should return error for invalid parameters', () => {
    const searchParams = new URLSearchParams('page=invalid');

    const result = validateQuery(searchParams, paginationSchema);
    // Note: coerce will convert 'invalid' to NaN, which fails min(1)
    expect(result.success).toBe(false);
  });
});
