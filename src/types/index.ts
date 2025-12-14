// ===== 统一类型定义 =====
// 集中管理项目中的核心类型，避免重复定义

// ===== 用户相关 =====

export type UserRole = 'admin' | 'user' | 'pending';

export interface User {
  id: number;
  githubId: string;
  githubLogin: string | null;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  role: UserRole;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// ===== 文章相关 =====

export type ArticleStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'published'
  | 'failed'
  | 'archived';

export interface Article {
  id: string;
  title: string;
  content: string;
  coverImage: string;
  images: string[];
  status: ArticleStatus;
  source: string;
  sourceInsightId?: number | null;
  sourceSearchId?: number | null;
  xhsTags?: string[] | null;
  xhsContent?: string | null;
  xhsTitle?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleStatusCounts {
  all: number;
  draft: number;
  pending_review: number;
  approved: number;
  published: number;
  failed: number;
  archived: number;
}

// ===== 搜索与分析相关 =====

export type SearchType = 'keyword' | 'account';

export interface SearchRecord {
  id: number;
  userId: number;
  keyword: string;
  articleCount: number;
  searchType: SearchType;
  accountName: string | null;
  accountAvatar: string | null;
  createdAt: string;
}

export interface SourceArticle {
  id: number;
  searchId: number;
  title: string;
  content: string;
  coverImage: string;
  readCount: number;
  likeCount: number;
  wowCount: number;
  publishTime: string;
  sourceUrl: string;
  wxName: string;
  wxId: string;
  isOriginal: boolean;
}

// ===== 洞察相关 =====

export interface TopicInsight {
  id: number;
  searchId: number;
  title: string;
  description: string;
  evidence: string;
  suggestedTopics: string[];
  relatedArticles: string[];
  createdAt: string;
}

export interface ArticleSummary {
  id: number;
  searchId: number;
  articleId: number;
  title: string;
  summary: string;
  keyPoints: string[];
  keywords: string[];
  highlights: string[];
  contentType: string;
  createdAt: string;
}

export interface InsightFavorite {
  id: number;
  userId: number;
  insightId: number;
  note: string | null;
  createdAt: string;
}

// ===== AI 配置相关 =====

export interface AIConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface ImageGenConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface WechatArticleConfig {
  endpoint: string;
  apiKey: string;
}

export interface WechatPublishConfig {
  endpoint: string;
  apiKey: string;
}

export interface XiaohongshuPublishConfig {
  endpoint: string;
  apiKey: string;
}

// ===== 仪表盘相关 =====

export interface DashboardStats {
  totalAnalysis: number;
  totalArticles: number;
  publishedArticles: number;
  pendingArticles: number;
}

export interface DailyAnalysis {
  date: string;
  count: number;
}

export interface StatusDistribution {
  status: string;
  count: number;
}

export interface KeywordRank {
  keyword: string;
  count: number;
}

export type ActivityType = 'analysis' | 'article' | 'publish';

export interface RecentActivity {
  type: ActivityType;
  title: string;
  time: string;
  id: number;
}

export interface DashboardData {
  stats: DashboardStats;
  trend: DailyAnalysis[];
  statusDistribution: StatusDistribution[];
  topKeywords: KeywordRank[];
  recentActivities: RecentActivity[];
}

// ===== API 响应相关 =====

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ===== 邀请码相关 =====

export interface InviteCode {
  id: number;
  code: string;
  createdBy: number | null;
  usedBy: number | null;
  usedAt: string | null;
  createdAt: string;
}

export interface InviteCodeDetail extends InviteCode {
  creatorLogin: string | null;
  usedLogin: string | null;
}

// ===== 发布相关 =====

export interface WechatAccount {
  fakeid: string;
  nickname: string;
  alias: string;
  round_head_img: string;
  service_type: number;
}

export interface PublishResult {
  success: boolean;
  message?: string;
  url?: string;
  error?: string;
}

// ===== AI 生成相关 =====

export interface GeneratedArticle {
  title: string;
  content: string;
  summary: string;
  imageKeywords: string[];
  xhsTags?: string[];
}

export interface ImageInsertPosition {
  insertAfterParagraph: number;
  prompt: string;
  description: string;
}

export interface GeneratedImage {
  url: string;
  seed?: number;
}

// ===== 进度事件 =====

export type ProgressStep =
  | 'validating'
  | 'generating'
  | 'generating_prompts'
  | 'generating_images'
  | 'saving'
  | 'completed'
  | 'error';

export interface ProgressEvent {
  step: ProgressStep;
  message: string;
  progress: number;
  data?: unknown;
}
