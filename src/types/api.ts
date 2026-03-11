export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'UNPROCESSABLE_ENTITY'
  | 'UPSTREAM_ERROR'
  | 'UPSTREAM_TIMEOUT'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR'
  | string;

export type ApiSuccessResponse<T, TMeta extends object = Record<string, unknown>> = {
  success: true;
  data: T;
  requestId?: string;
} & TMeta;

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: ApiErrorCode;
  requestId?: string;
}

export type ApiResponse<
  T = unknown,
  TMeta extends object = Record<string, unknown>,
> = ApiSuccessResponse<T, TMeta> | ApiErrorResponse;

export interface HotTopicItem {
  keyword: string;
  heat: number;
}

export type HotTopicSource = 'default' | 'user_history' | 'global';
export type HotTopicsResponse = ApiResponse<HotTopicItem[], { source: HotTopicSource }>;

export interface WechatArticleListItem {
  id: string;
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

export interface WechatAccountInfo {
  name: string;
  avatar: string;
  ghid: string;
  wxid: string;
  totalArticles: number;
  masssendCount: number;
  publishCount: number;
}

export type WechatArticlesSource = 'api' | 'mock';
export type WechatArticlesResponse = ApiResponse<
  WechatArticleListItem[],
  {
    source: WechatArticlesSource;
    total: number;
    page: number;
    totalPage: number;
  }
>;

export type WechatArticlesByAccountResponse = ApiResponse<
  WechatArticleListItem[],
  {
    source: WechatArticlesSource;
    accountInfo: WechatAccountInfo;
    total: number;
    page: number;
    totalPage: number;
  }
>;

// ===== Viral Articles (爆文发现) =====

export interface ViralArticleItem {
  url: string;
  title: string;
  mp_nickname: string;
  pub_time: string;
  wxid: string;
  hot: number;
  read_num: number;
  zan_num: number;
  cover: string;
  avg: number;
  category: string;
  fans: number;
  position: number;
  is_original: string;
  publish_type: string;
}

export type ViralArticlesResponse = ApiResponse<
  ViralArticleItem[],
  {
    source: 'api' | 'mock';
    total: number;
    page: number;
    totalPage: number;
  }
>;

export interface WechatPublishAccount {
  name: string;
  wechatAppid: string;
  username: string;
  avatar: string;
  type: string;
  verified: boolean;
  status: string;
}

export type WechatPublishAccountsResponse = ApiResponse<WechatPublishAccount[]>;

export interface WechatPublishResult {
  publicationId?: unknown;
  materialId?: unknown;
  mediaId?: unknown;
  message: string;
}

export type WechatPublishResponse = ApiResponse<WechatPublishResult>;

export interface XiaohongshuPublishResult {
  id?: unknown;
  noteId?: unknown;
  title: string;
  publishUrl?: unknown;
  qrImageUrl?: unknown;
  coverImage: string;
  imageCount: number;
  createdAt?: unknown;
}

export type XiaohongshuPublishResponse = ApiResponse<XiaohongshuPublishResult>;
