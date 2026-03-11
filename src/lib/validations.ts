import { z } from 'zod';

// ===== 文章相关 Schema =====

export const ArticleStatus = z.enum([
  'draft',
  'pending_review',
  'approved',
  'published',
  'failed',
  'archived',
]);
export type ArticleStatus = z.infer<typeof ArticleStatus>;

export const createArticleSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200, '标题不能超过200字'),
  content: z.string().min(1, '内容不能为空'),
  cover_image: z.string().url('封面图片必须是有效的URL').optional().nullable(),
  status: ArticleStatus.default('draft'),
  xhs_tags: z.string().optional().nullable(),
});

export const updateArticleSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(val => Number(val)),
  title: z.string().min(1, '标题不能为空').max(200, '标题不能超过200字').optional(),
  content: z.string().min(1, '内容不能为空').optional(),
  cover_image: z.string().url('封面图片必须是有效的URL').optional().nullable(),
  status: ArticleStatus.optional(),
  xhs_tags: z.string().optional().nullable(),
});

export const batchArticleSchema = z.object({
  action: z.enum(['delete', 'archive', 'restore', 'export']),
  ids: z.array(z.union([z.string(), z.number()]).transform(val => Number(val))).min(1, '请选择至少一篇文章'),
  format: z.enum(['markdown', 'html', 'json']).optional(),
});

// ===== AI 生成相关 Schema =====

export const generateArticleSchema = z.object({
  insight: z.object({
    title: z.string().min(1, '选题标题不能为空'),
    description: z.string().optional(),
    suggested_topics: z.array(z.string()).optional(),
  }),
  style: z.string().optional().default('专业、有深度'),
  length: z.enum(['short', 'medium', 'long']).optional().default('medium'),
  generateImages: z.boolean().optional().default(true),
  imageCount: z.number().min(0).max(5).optional().default(3),
});

export const aiAssistSchema = z.object({
  action: z.enum(['rewrite', 'expand', 'summarize', 'polish', 'translate']),
  text: z.string().min(1, '文本不能为空').max(10000, '文本不能超过10000字'),
  targetLanguage: z.string().optional(),
});

export const generateImageSchema = z.object({
  prompt: z.string().min(1, '提示词不能为空').max(1000, '提示词不能超过1000字'),
  style: z.string().optional(),
  size: z.enum(['512x512', '768x768', '1024x1024']).optional().default('1024x1024'),
});

// ===== 发布相关 Schema =====

export const wechatPublishSchema = z.object({
  articleId: z.union([z.string(), z.number()]).transform(val => Number(val)),
  accountId: z.string().min(1, '请选择公众号'),
  author: z.string().optional(),
  digest: z.string().max(120, '摘要不能超过120字').optional(),
  needOpenComment: z.boolean().optional().default(false),
});

export const xiaohongshuPublishSchema = z.object({
  articleId: z.union([z.string(), z.number()]).transform(val => Number(val)),
  title: z.string().min(1, '标题不能为空').max(20, '标题不能超过20字'),
  content: z.string().min(1, '内容不能为空'),
  images: z.array(z.string().url()).min(1, '至少需要一张图片').max(9, '最多9张图片'),
  tags: z.array(z.string()).max(10, '最多10个标签').optional(),
});

// ===== 搜索分析相关 Schema =====

export const startAnalysisSchema = z.object({
  keyword: z.string().min(1, '关键词不能为空').max(100, '关键词不能超过100字'),
  searchType: z.enum(['keyword', 'account']).default('keyword'),
});

export const wechatArticleSearchSchema = z.object({
  keyword: z.string().trim().min(1, '关键词不能为空'),
  page: z.coerce.number().int().min(1, '分页参数错误').default(1),
  period: z.coerce.number().int().min(1, '分页参数错误').default(7),
});

export const wechatAccountSearchSchema = z.object({
  accountName: z.string().trim().min(1, '公众号名称不能为空'),
  page: z.coerce.number().int().min(1, '分页参数错误').default(1),
});

export const viralArticleSearchSchema = z.object({
  keyword: z.string().trim().optional().default(''),
  category: z.string().optional().default('0'),
  pub_type: z.string().optional().default('0'),
  page: z.coerce.number().int().min(1).default(1),
  start_time: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必须为 YYYY-MM-DD'),
  end_time: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必须为 YYYY-MM-DD'),
});

// ===== 设置相关 Schema =====

export const aiConfigSchema = z.object({
  baseUrl: z.string().url('API 地址必须是有效的URL'),
  apiKey: z.string().min(1, 'API Key 不能为空'),
  model: z.string().min(1, '模型名称不能为空'),
});

export const imageGenConfigSchema = z.object({
  baseUrl: z.string().url('API 地址必须是有效的URL'),
  apiKey: z.string().min(1, 'API Key 不能为空'),
  model: z.string().min(1, '模型名称不能为空'),
  provider: z.enum(['siliconflow', 'seedream']).default('siliconflow'),
});

export const wechatConfigSchema = z.object({
  endpoint: z.string().url('API 地址必须是有效的URL'),
  apiKey: z.string().min(1, 'API Key 不能为空'),
});

export const settingsSchema = z.object({
  ai: aiConfigSchema.optional(),
  imageGen: imageGenConfigSchema.optional(),
  wechatArticle: wechatConfigSchema.optional(),
  wechatPublish: wechatConfigSchema.optional(),
  xiaohongshu: wechatConfigSchema.optional(),
  preferences: z.object({
    imageCount: z.number().int().min(1).max(10),
    style: z.string().min(1),
    minWords: z.number().int().min(300),
    maxWords: z.number().int().max(5000),
  }).optional(),
});

// ===== 邀请码相关 Schema =====

export const createInviteSchema = z.object({
  count: z.number().min(1, '至少生成1个').max(100, '最多生成100个').default(1),
});

export const completeInviteSchema = z.object({
  code: z.string().min(1, '邀请码不能为空').max(50, '邀请码格式错误'),
});

export const positiveIdSchema = z.coerce.number().int().positive('ID 必须为正整数');

export const onboardingUpdateSchema = z.object({
  completed: z.boolean(),
});

export const testAiConnectionSchema = z.object({
  baseUrl: z.string().url('baseUrl 必须是有效的 URL'),
  apiKey: z.string().min(1, 'apiKey 不能为空'),
});

// ===== 通用分页 Schema =====

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
});

// ===== 验证辅助函数 =====

/**
 * 验证请求体并返回类型安全的数据
 */
export async function validateBody<T extends z.ZodSchema>(
  request: Request,
  schema: T
): Promise<{ success: true; data: z.infer<T> } | { success: false; error: string }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const errors = result.error.issues.map(issue => issue.message).join(', ');
      return { success: false, error: errors };
    }

    return { success: true, data: result.data };
  } catch {
    return { success: false, error: '请求体格式错误' };
  }
}

/**
 * 验证查询参数
 */
export function validateQuery<T extends z.ZodSchema>(
  searchParams: URLSearchParams,
  schema: T
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const result = schema.safeParse(params);

  if (!result.success) {
    const errors = result.error.issues.map(issue => issue.message).join(', ');
    return { success: false, error: errors || '参数验证失败' };
  }

  return { success: true, data: result.data };
}
