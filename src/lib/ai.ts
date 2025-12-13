// AI 调用封装模块 - OpenAI 兼容接口

export interface AIConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface ArticleSummary {
  articleId: string;
  title: string;
  summary: string;
  keyPoints: string[];
  keywords: string[];
  highlights: string[];
  contentType: string;
}

export interface TopicInsight {
  id: string;
  title: string;
  description: string;
  evidence: string;
  suggestedTopics: string[];
  relatedArticles: string[];
}

interface ChatCompletionResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

// 导出 ChatMessage 接口供外部使用
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// 调用 OpenAI 兼容 API
export async function callAI(config: AIConfig, messages: ChatMessage[]): Promise<string> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI API 调用失败: ${response.status} - ${error}`);
  }

  const data: ChatCompletionResponse = await response.json();
  return data.choices[0]?.message?.content || '';
}

// 阶段1: 提取单篇文章摘要
export async function extractArticleSummary(
  config: AIConfig,
  article: { id: string; title: string; content: string }
): Promise<ArticleSummary> {
  const prompt = `请分析以下微信公众号文章，提取关键信息并以 JSON 格式返回。

文章标题: ${article.title}
文章内容: ${article.content?.slice(0, 3000) || '(无内容)'}

请返回以下 JSON 格式（不要包含 markdown 代码块标记）:
{
  "summary": "文章摘要，100-200字，概括文章核心内容",
  "keyPoints": ["关键要点1", "关键要点2", "关键要点3"],
  "keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5"],
  "highlights": ["文章亮点1", "文章亮点2"],
  "contentType": "内容类型，如：教程、测评、故事、观点、案例、干货等"
}`;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: '你是一个专业的内容分析师，擅长分析自媒体文章并提取关键信息。请始终返回有效的 JSON 格式。',
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  const response = await callAI(config, messages);

  try {
    // 尝试清理可能的 markdown 代码块标记
    const cleanedResponse = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleanedResponse);
    return {
      articleId: article.id,
      title: article.title,
      summary: parsed.summary || '',
      keyPoints: parsed.keyPoints || [],
      keywords: parsed.keywords || [],
      highlights: parsed.highlights || [],
      contentType: parsed.contentType || '未分类',
    };
  } catch {
    // 解析失败时返回基础信息
    return {
      articleId: article.id,
      title: article.title,
      summary: '摘要提取失败',
      keyPoints: [],
      keywords: [],
      highlights: [],
      contentType: '未分类',
    };
  }
}

// 阶段2: 基于所有文章摘要生成选题洞察
export async function generateTopicInsights(
  config: AIConfig,
  keyword: string,
  summaries: ArticleSummary[]
): Promise<TopicInsight[]> {
  // 构建摘要汇总
  const summaryText = summaries
    .map((s, i) => `
【文章${i + 1}】${s.title}
- 摘要: ${s.summary}
- 关键词: ${s.keywords.join(', ')}
- 亮点: ${s.highlights.join('; ')}
- 类型: ${s.contentType}
`)
    .join('\n');

  const prompt = `你是一个资深的自媒体选题策划专家。基于以下关于「${keyword}」主题的 ${summaries.length} 篇热门文章分析，请生成 5 条以上的选题洞察建议。

${summaryText}

请分析这些文章的共同特点、内容趋势、用户偏好，并给出具体可执行的选题建议。

请返回以下 JSON 格式（不要包含 markdown 代码块标记）:
{
  "insights": [
    {
      "title": "洞察标题，简洁有力，10字以内",
      "description": "洞察描述，详细说明这个发现，50-100字",
      "evidence": "数据支撑或依据，说明为什么得出这个结论",
      "suggestedTopics": ["具体选题建议1", "具体选题建议2", "具体选题建议3"],
      "relatedArticles": ["相关的原文章标题1", "相关的原文章标题2"]
    }
  ]
}

要求:
1. 至少生成 5 条洞察
2. 洞察要具体、可执行，不要泛泛而谈
3. 每条洞察都要有数据或案例支撑
4. 推荐选题要具体到可以直接使用的标题方向`;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: '你是一个资深的自媒体选题策划专家，擅长从热门内容中发现选题规律和创作机会。请始终返回有效的 JSON 格式。',
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  const response = await callAI(config, messages);

  try {
    const cleanedResponse = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleanedResponse);
    const insights: TopicInsight[] = (parsed.insights || []).map((insight: Omit<TopicInsight, 'id'>, index: number) => ({
      id: `insight-${Date.now()}-${index}`,
      title: insight.title || '',
      description: insight.description || '',
      evidence: insight.evidence || '',
      suggestedTopics: insight.suggestedTopics || [],
      relatedArticles: insight.relatedArticles || [],
    }));

    return insights;
  } catch {
    // 解析失败时返回空数组
    console.error('洞察生成解析失败:', response);
    return [];
  }
}

// 批量处理文章摘要（带并发控制）
export async function batchExtractSummaries(
  config: AIConfig,
  articles: { id: string; title: string; content: string }[],
  concurrency: number = 3,
  onProgress?: (completed: number, total: number) => void
): Promise<ArticleSummary[]> {
  const results: ArticleSummary[] = [];
  const total = articles.length;
  let completed = 0;

  // 分批处理
  for (let i = 0; i < articles.length; i += concurrency) {
    const batch = articles.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((article) => extractArticleSummary(config, article))
    );
    results.push(...batchResults);
    completed += batch.length;
    onProgress?.(completed, total);
  }

  return results;
}

// 生成文章内容
export interface GeneratedArticle {
  title: string;
  content: string;
  summary: string;
  imageKeywords: string[];
}

// 图片插入位置信息
export interface ImageInsertPosition {
  prompt: string;           // 英文图片提示词
  insertAfterParagraph: number;  // 插入在第几段之后（从1开始）
  description: string;      // 图片描述（中文，用于 figcaption）
}

export async function generateArticle(
  config: AIConfig,
  insight: {
    title: string;
    description: string;
    suggestedTopics: string[];
    relatedArticles: string[];
  },
  keyword: string,
  preferences?: {
    style?: string;
    minWords?: number;
    maxWords?: number;
  }
): Promise<GeneratedArticle> {
  const style = preferences?.style || 'professional';
  const minWords = preferences?.minWords || 1500;
  const maxWords = preferences?.maxWords || 2500;

  const styleGuide: Record<string, string> = {
    casual: '轻松活泼、口语化、多用网络流行语、适当使用表情符号',
    professional: '专业严谨、逻辑清晰、数据支撑、适合职场人士阅读',
    storytelling: '故事化叙述、有代入感、情感共鸣、引人入胜',
  };

  const prompt = `你是一位资深的自媒体内容创作者，擅长撰写高质量的公众号文章。

基于以下选题洞察，请创作一篇完整的文章：

【选题洞察】
- 洞察标题: ${insight.title}
- 洞察描述: ${insight.description}
- 推荐选题方向: ${insight.suggestedTopics.join('、')}
- 相关参考文章: ${insight.relatedArticles.join('、')}
- 核心关键词: ${keyword}

【创作要求】
- 文章风格: ${styleGuide[style] || styleGuide.professional}
- 字数要求: ${minWords}-${maxWords}字
- 结构要求: 包含引人入胜的开头、清晰的正文结构、有力的结尾
- 内容要求: 有干货、有案例、有观点、易于传播

【配图要求】
- 在文章中需要插入配图的位置，使用特殊标记: [INSERT_IMAGE:图片描述关键词]
- 建议在每个主要章节后插入一张配图，共插入2-3张图片
- 图片描述关键词应该是英文，便于从图库搜索，如: technology, business meeting, data analysis
- 配图标记应该单独占一行，放在段落之间

请返回以下 JSON 格式（不要包含 markdown 代码块标记）:
{
  "title": "文章标题，要吸引眼球，可以使用数字、疑问句等技巧",
  "content": "文章正文内容，使用 HTML 格式，包含 <p>、<h2>、<h3>、<strong>、<ul>、<li> 等标签，并在合适位置插入 [INSERT_IMAGE:keyword] 标记",
  "summary": "文章摘要，100字以内，用于预览展示",
  "imageKeywords": ["配图关键词1(英文)", "配图关键词2(英文)", "配图关键词3(英文)"]
}`;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: '你是一位资深的自媒体内容创作者，擅长撰写高质量、高传播性的公众号文章。请始终返回有效的 JSON 格式。',
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  const response = await callAI(config, messages);

  try {
    const cleanedResponse = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleanedResponse);
    return {
      title: parsed.title || '未命名文章',
      content: parsed.content || '',
      summary: parsed.summary || '',
      imageKeywords: parsed.imageKeywords || [],
    };
  } catch {
    // 解析失败时返回基础内容
    return {
      title: `关于${keyword}的深度解析`,
      content: `<p>文章生成失败，请重试。</p>`,
      summary: '文章生成失败',
      imageKeywords: [keyword],
    };
  }
}

// 根据文章内容生成图片提示词和插入位置
export async function generateImagePrompts(
  config: AIConfig,
  articleTitle: string,
  articleContent: string,
  imageCount: number = 3
): Promise<ImageInsertPosition[]> {
  // 统计文章段落数
  const paragraphMatches = articleContent.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
  const totalParagraphs = paragraphMatches.length;

  const prompt = `你是一位专业的图片创意总监，擅长为文章配图。请根据以下文章内容，生成 ${imageCount} 张配图的详细提示词。

【文章标题】
${articleTitle}

【文章内容】
${articleContent.replace(/<[^>]+>/g, ' ').slice(0, 4000)}

【文章段落数】
共 ${totalParagraphs} 个段落

【要求】
1. 生成 ${imageCount} 张图片的提示词
2. 每张图片的提示词必须是英文，详细描述画面内容、风格、色调等
3. 提示词要与文章上下文紧密相关，能够增强文章的表达力
4. 合理安排图片插入位置，根据文章逻辑和内容节奏决定
5. 图片风格要统一，适合作为文章配图
6. 提示词长度在 50-150 个英文单词之间

请返回以下 JSON 格式（不要包含 markdown 代码块标记）:
{
  "images": [
    {
      "prompt": "详细的英文图片提示词，描述画面内容、风格、光线、色调等",
      "insertAfterParagraph": 段落编号（1-${totalParagraphs}之间的数字，表示插入在第几段之后）,
      "description": "图片的中文简短描述，用于显示在图片下方，10-20字"
    }
  ]
}

注意：
- insertAfterParagraph 必须是 1 到 ${totalParagraphs} 之间的数字
- 图片位置要分散，不要都集中在一起
- 第一张图片建议放在文章开头部分（前1/3）
- 最后一张图片不要放在文章最后一段之后`;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: '你是一位专业的图片创意总监，擅长为文章设计配图方案。你需要根据文章内容生成高质量的图片提示词，并合理安排图片在文章中的位置。请始终返回有效的 JSON 格式。',
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  try {
    const response = await callAI(config, messages);

    const cleanedResponse = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleanedResponse);
    const images: ImageInsertPosition[] = (parsed.images || []).map((img: {
      prompt?: string;
      insertAfterParagraph?: number;
      description?: string;
    }) => ({
      prompt: img.prompt || '',
      insertAfterParagraph: Math.min(Math.max(img.insertAfterParagraph || 1, 1), totalParagraphs),
      description: img.description || '',
    }));

    // 按插入位置排序（从后往前插入时需要）
    images.sort((a, b) => a.insertAfterParagraph - b.insertAfterParagraph);

    return images;
  } catch (error) {
    console.error('生成图片提示词失败:', error);
    return [];
  }
}
