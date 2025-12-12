// Mock data for prototyping

export const mockSourceArticles = [
  {
    id: '1',
    title: 'AI写作工具大盘点：2024年最值得使用的10款AI写作助手',
    readCount: 45000,
    likeCount: 2300,
    wowCount: 890,
    summary: '本文详细介绍了2024年最受欢迎的AI写作工具，包括ChatGPT、Claude、文心一言等，从功能、价格、适用场景等维度进行对比分析。',
    sourceUrl: 'https://mp.weixin.qq.com/s/xxx1',
  },
  {
    id: '2',
    title: '普通人如何用AI副业月入过万？这5个方法亲测有效',
    readCount: 38000,
    likeCount: 1800,
    wowCount: 720,
    summary: '作者分享了5种利用AI工具赚钱的方法，包括AI绘画接单、AI写作代笔、AI视频制作等，并附上了详细的操作步骤和收益数据。',
    sourceUrl: 'https://mp.weixin.qq.com/s/xxx2',
  },
  {
    id: '3',
    title: '3个月涨粉10万的秘密：我是如何用AI打造爆款内容的',
    readCount: 52000,
    likeCount: 1500,
    wowCount: 650,
    summary: '博主分享了自己使用AI工具进行内容创作的完整流程，从选题、写作到配图，详细讲解了如何提高内容质量和发布效率。',
    sourceUrl: 'https://mp.weixin.qq.com/s/xxx3',
  },
  {
    id: '4',
    title: '自媒体新手必看：从0到1搭建你的内容矩阵',
    readCount: 28000,
    likeCount: 1200,
    wowCount: 480,
    summary: '针对自媒体新手的入门指南，介绍了如何选择平台、确定定位、制定内容策略，以及如何利用工具提高效率。',
    sourceUrl: 'https://mp.weixin.qq.com/s/xxx4',
  },
  {
    id: '5',
    title: '深度解析：为什么你的文章阅读量总是上不去？',
    readCount: 35000,
    likeCount: 2100,
    wowCount: 920,
    summary: '从标题、开头、结构、配图等多个维度分析影响文章阅读量的因素，并给出了具体的优化建议和案例。',
    sourceUrl: 'https://mp.weixin.qq.com/s/xxx5',
  },
];

// 选题洞察类型定义（AI 生成的结构化洞察）
export interface TopicInsight {
  id: string;
  title: string;
  description: string;
  evidence: string;
  suggestedTopics: string[];
  relatedArticles: string[];
}

// 文章摘要类型定义（AI 提取的结构化摘要）
export interface ArticleSummary {
  articleId: string;
  title: string;
  summary: string;
  keyPoints: string[];
  keywords: string[];
  highlights: string[];
  contentType: string;
}

// 保留 mockInsights 用于演示/回退
export const mockInsights: TopicInsight[] = [
  {
    id: '1',
    title: 'AI工具测评类内容热度高',
    description: '用户对AI工具的实际使用体验和对比测评有强烈需求，这类内容容易获得高互动。',
    evidence: '分析的文章中，工具测评类内容平均互动率达到 5.2%，高于整体平均水平。',
    suggestedTopics: ['2024年最值得使用的AI写作工具对比', 'ChatGPT vs Claude 深度测评', '免费AI工具推荐清单'],
    relatedArticles: ['AI写作工具大盘点：2024年最值得使用的10款AI写作助手'],
  },
  {
    id: '2',
    title: '实操教程比理论更受欢迎',
    description: '带有具体步骤、截图演示的实操类内容，比纯理论分析的文章互动率高出40%。',
    evidence: '教程类文章平均阅读完成率 68%，理论类仅 42%。',
    suggestedTopics: ['手把手教你用AI写爆款文章', '从0到1搭建AI工作流完整教程', 'AI绘画入门实操指南'],
    relatedArticles: ['3个月涨粉10万的秘密：我是如何用AI打造爆款内容的'],
  },
  {
    id: '3',
    title: '数字型标题点击率更高',
    description: '包含具体数字的标题（如"5个方法"、"月入过万"）比模糊表述的标题点击率高25%。',
    evidence: '含数字标题的文章平均点击率 4.8%，无数字标题仅 3.2%。',
    suggestedTopics: ['7个让你效率翻倍的AI技巧', '月入5000的AI副业实操分享', '3步搞定AI写作'],
    relatedArticles: ['普通人如何用AI副业月入过万？这5个方法亲测有效'],
  },
  {
    id: '4',
    title: '痛点+解决方案结构受欢迎',
    description: '先描述用户痛点，再给出解决方案的文章结构，用户停留时间更长，转发率更高。',
    evidence: '采用此结构的文章平均停留时间 4.2 分钟，转发率 2.1%。',
    suggestedTopics: ['写作没灵感？AI帮你3分钟搞定选题', '不会做图？这个AI工具零基础也能用'],
    relatedArticles: ['深度解析：为什么你的文章阅读量总是上不去？'],
  },
  {
    id: '5',
    title: '案例故事类内容传播性强',
    description: '包含真实案例或个人经历的内容更容易引发共鸣，分享率比普通内容高出60%。',
    evidence: '故事类内容分享率 3.8%，普通内容仅 2.4%。',
    suggestedTopics: ['我用AI写作赚到第一桶金的故事', '从月薪3000到自由职业：我的AI转型之路'],
    relatedArticles: ['3个月涨粉10万的秘密：我是如何用AI打造爆款内容的'],
  },
];

export const mockWordCloud = [
  { text: 'AI写作', weight: 100 },
  { text: '变现', weight: 85 },
  { text: '副业', weight: 80 },
  { text: '自媒体', weight: 75 },
  { text: '爆款', weight: 70 },
  { text: '流量', weight: 65 },
  { text: '涨粉', weight: 60 },
  { text: '工具', weight: 55 },
  { text: '效率', weight: 50 },
  { text: '内容', weight: 45 },
  { text: '运营', weight: 40 },
  { text: '创作', weight: 35 },
];

export type ArticleStatus = 'draft' | 'pending_review' | 'approved' | 'published' | 'failed';

export interface Article {
  id: string;
  title: string;
  content: string;
  coverImage: string;
  images: string[];
  status: ArticleStatus;
  source: string;
  createdAt: string;
  updatedAt: string;
  publishedPlatforms: {
    xiaohongshu?: { status: 'success' | 'failed' | 'pending'; url?: string; publishedAt?: string };
    wechat?: { status: 'success' | 'failed' | 'pending'; url?: string; publishedAt?: string };
  };
}

export const mockArticles: Article[] = [
  {
    id: '1',
    title: 'AI写作工具大盘点：这5个工具让你的创作效率翻倍',
    content: '<p>在这个AI时代，写作工具已经发生了翻天覆地的变化...</p>',
    coverImage: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400',
    images: [
      'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400',
      'https://images.unsplash.com/photo-1684163761883-8a1e3f3e3e3e?w=400',
    ],
    status: 'approved',
    source: 'AI工具测评选题',
    createdAt: '2024-12-10',
    updatedAt: '2024-12-10',
    publishedPlatforms: {},
  },
  {
    id: '2',
    title: '3个月涨粉10万的秘密：普通人也能做到的自媒体运营方法',
    content: '<p>很多人问我是怎么做到3个月涨粉10万的...</p>',
    coverImage: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400',
    images: [],
    status: 'pending_review',
    source: '涨粉技巧选题',
    createdAt: '2024-12-09',
    updatedAt: '2024-12-09',
    publishedPlatforms: {},
  },
  {
    id: '3',
    title: '普通人如何用AI赚钱？这5个副业方向值得尝试',
    content: '<p>AI时代来临，普通人如何抓住机会...</p>',
    coverImage: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400',
    images: [],
    status: 'draft',
    source: '手动创建',
    createdAt: '2024-12-08',
    updatedAt: '2024-12-08',
    publishedPlatforms: {},
  },
  {
    id: '4',
    title: '自媒体新手必看指南：从0到1打造你的个人品牌',
    content: '<p>作为一个自媒体新手，你可能会感到迷茫...</p>',
    coverImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400',
    images: [],
    status: 'published',
    source: '新手指南选题',
    createdAt: '2024-12-05',
    updatedAt: '2024-12-06',
    publishedPlatforms: {
      xiaohongshu: { status: 'success', url: 'https://xiaohongshu.com/xxx', publishedAt: '2024-12-06' },
      wechat: { status: 'success', url: 'https://mp.weixin.qq.com/xxx', publishedAt: '2024-12-06' },
    },
  },
  {
    id: '5',
    title: '深度解析：影响文章阅读量的10个关键因素',
    content: '<p>为什么有些文章能获得百万阅读，而有些却无人问津...</p>',
    coverImage: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400',
    images: [],
    status: 'published',
    source: '内容优化选题',
    createdAt: '2024-12-03',
    updatedAt: '2024-12-04',
    publishedPlatforms: {
      xiaohongshu: { status: 'success', url: 'https://xiaohongshu.com/xxx2', publishedAt: '2024-12-04' },
      wechat: { status: 'failed', publishedAt: '2024-12-04' },
    },
  },
];

export const statusConfig: Record<ArticleStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: '草稿', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  pending_review: { label: '待审核', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  approved: { label: '已审核', color: 'text-green-600', bgColor: 'bg-green-100' },
  published: { label: '已发布', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  failed: { label: '发布失败', color: 'text-red-600', bgColor: 'bg-red-100' },
};
