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
  xhsTags: string[];  // 小红书话题标签
  screenshotSuggestions?: ScreenshotSuggestion[];  // 赛博禅心风格：截图建议
}

// 截图建议（赛博禅心风格专用）
export interface ScreenshotSuggestion {
  url: string;                    // Target page URL
  target: string;                 // Human description of what to capture
  insertAfterParagraph: number;   // Insert after which paragraph (1-indexed)
  scrollTo: string;               // Text to search for on the page
  captureType: 'element' | 'viewport'; // Capture strategy
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
  const isCyberZen = style === 'cyberzen';
  const minWords = preferences?.minWords || 1500;
  const maxWords = preferences?.maxWords || 2500;

  const styleGuide: Record<string, string> = {
    casual: '轻松活泼、口语化、多用网络流行语、适当使用表情符号',
    professional: '专业严谨、逻辑清晰、数据支撑、适合职场人士阅读',
    storytelling: '故事化叙述、有代入感、情感共鸣、引人入胜',
    cyberzen: `赛博禅心风格——科技评书式叙事。严格遵守以下规则：
1.【断句】每段不超过2句。关键判断独占一行，形成视觉重音
2.【叙事】先场景/画面，后概念定义。用动词代替名词堆砌，让读者看到而非被告知
3.【金句收尾】每个章节末尾用一句高密度判断收尾——不是鸡汤，是对事实的极致压缩
4.【数据驱动】每个观点必须有具体数字或信源支撑。数据在前，观点在后
5.【口语化】用你我，多用反问句和省略号制造停顿感。可以自我引用
6.【跳切】段落之间不写过渡句，直接跳切。用小标题划分叙事节奏
7.【禁止】禁止学术体、教程体、公关稿体。不要首先其次最后。不要综上所述`,
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
- 字数要求: ${isCyberZen ? '字数不限。内容讲完即止，不要为凑字数而注水，也不要为控制篇幅而删减关键信息' : `${minWords}-${maxWords}字`}
- 结构要求: 包含引人入胜的开头、清晰的正文结构、有力的结尾
- 内容要求: 有干货、有案例、有观点、易于传播

【格式要求】
- 使用 Markdown 格式书写文章正文
- 用 ## 表示二级标题，### 表示三级标题
- 用 **加粗** 表示强调
- 用 - 表示无序列表
- 段落之间用空行分隔
- 不要使用任何 HTML 标签

【小红书话题标签】
- 请根据文章内容，生成 5 个适合小红书平台的话题标签
- 标签要热门、相关

${isCyberZen ? `请返回以下 JSON 格式（不要包含 markdown 代码块标记）:
{
  "title": "文章标题——赛博禅心式：简洁有力，可以用逗号断句",
  "content": "文章正文内容，使用 Markdown 格式。段落极短，金句独占一行",
  "summary": "文章摘要，100字以内",
  "imageKeywords": [],
  "xhsTags": ["AI", "科技", "深度分析", "行业观察", "技术趋势"],
  "screenshotSuggestions": [
    {
      "url": "与文章内容相关的真实网页 URL",
      "target": "截取该页面的哪个区域/什么内容（人类可读描述）",
      "scrollTo": "目标页面上实际存在的关键文本，用于精准定位截图区域",
      "captureType": "element",
      "insertAfterParagraph": 5
    }
  ]
}

注意：
- imageKeywords 留空数组，赛博禅心风格不使用 AI 生成的装饰图
- screenshotSuggestions 填入 2-4 个真实的截图建议，URL 必须是真实可访问的网页
- 截图建议应与文章论点直接相关，作为证据使用
- scrollTo 极其重要：它必须是目标网页上实际存在的一小段文字（通常是标题、表格标题、图表标题等），系统会用这个文本定位截图区域
- captureType: "element" 表示截取该文本所在的区块/容器，"viewport" 表示以该文本为中心截取视口` : `请返回以下 JSON 格式（不要包含 markdown 代码块标记）:
{
  "title": "文章标题，要吸引眼球，可以使用数字、疑问句等技巧",
  "content": "文章正文内容，使用 Markdown 格式（## 标题、**加粗**、- 列表等），段落之间用空行分隔，不要使用 HTML 标签",
  "summary": "文章摘要，100字以内，用于预览展示",
  "imageKeywords": ["配图关键词1(英文)", "配图关键词2(英文)", "配图关键词3(英文)"],
  "xhsTags": ["干货分享", "职场成长", "自律打卡", "效率提升", "知识分享"]
}`}`;

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
      xhsTags: parsed.xhsTags || [],
      screenshotSuggestions: parsed.screenshotSuggestions || undefined,
    };
  } catch {
    // 解析失败时返回基础内容
    return {
      title: `关于${keyword}的深度解析`,
      content: '文章生成失败，请重试。',
      summary: '文章生成失败',
      imageKeywords: [keyword],
      xhsTags: ['干货分享', '知识分享'],
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
  // Count only text paragraphs (exclude headings starting with #)
  const allBlocks = articleContent.split(/\n\n+/).filter(p => p.trim().length > 0);
  const totalBlocks = Math.max(allBlocks.length, 1);
  const textParagraphCount = allBlocks.filter(p => !/^#{1,6}\s/.test(p.trim())).length;

  const prompt = `你是一位专业的图片创意总监，擅长为文章配图。请根据以下文章内容，生成 ${imageCount} 张配图的详细提示词。

【文章标题】
${articleTitle}

【文章内容】
${articleContent.slice(0, 4000)}

【文章结构】
共 ${totalBlocks} 个内容块（含标题行），其中正文段落 ${textParagraphCount} 个

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
      "insertAfterParagraph": 内容块编号（1-${totalBlocks}之间的数字，表示插入在第几个内容块之后。注意标题行也算一个内容块），
      "description": "图片的中文简短描述，用于显示在图片下方，10-20字"
    }
  ]
}

注意：
- insertAfterParagraph 必须是 1 到 ${totalBlocks} 之间的数字
- 图片应该插入在正文段落后面，不要插入在标题行后面
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
      insertAfterParagraph: Math.min(Math.max(img.insertAfterParagraph || 1, 1), totalBlocks),
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
