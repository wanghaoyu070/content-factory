import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'content-factory.db');

// Ensure data directory exists
import fs from 'fs';
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS search_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT NOT NULL,
    article_count INTEGER DEFAULT 0,
    search_type TEXT DEFAULT 'keyword',
    account_name TEXT,
    account_avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS source_articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    search_id INTEGER NOT NULL,
    title TEXT,
    content TEXT,
    cover_image TEXT,
    read_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    wow_count INTEGER DEFAULT 0,
    publish_time TEXT,
    source_url TEXT,
    wx_name TEXT,
    wx_id TEXT,
    is_original INTEGER DEFAULT 0,
    FOREIGN KEY (search_id) REFERENCES search_records(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_search_keyword ON search_records(keyword);
  CREATE INDEX IF NOT EXISTS idx_articles_search_id ON source_articles(search_id);

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS article_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    search_id INTEGER NOT NULL,
    article_id INTEGER NOT NULL,
    title TEXT,
    summary TEXT,
    key_points TEXT,
    keywords TEXT,
    highlights TEXT,
    content_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (search_id) REFERENCES search_records(id) ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES source_articles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS topic_insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    search_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    evidence TEXT,
    suggested_topics TEXT,
    related_articles TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (search_id) REFERENCES search_records(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_summaries_search_id ON article_summaries(search_id);
  CREATE INDEX IF NOT EXISTS idx_insights_search_id ON topic_insights(search_id);

  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    cover_image TEXT,
    images TEXT,
    status TEXT DEFAULT 'draft',
    source TEXT,
    source_insight_id INTEGER,
    source_search_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_insight_id) REFERENCES topic_insights(id),
    FOREIGN KEY (source_search_id) REFERENCES search_records(id)
  );

  CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
  CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at);
`);

// Types
export interface SearchRecord {
  id: number;
  keyword: string;
  article_count: number;
  search_type: 'keyword' | 'account';
  account_name: string | null;
  account_avatar: string | null;
  created_at: string;
}

export interface SourceArticle {
  id: number;
  search_id: number;
  title: string;
  content: string;
  cover_image: string;
  read_count: number;
  like_count: number;
  wow_count: number;
  publish_time: string;
  source_url: string;
  wx_name: string;
  wx_id: string;
  is_original: number;
}

export interface ArticleSummaryRecord {
  id: number;
  search_id: number;
  article_id: number;
  title: string;
  summary: string;
  key_points: string;
  keywords: string;
  highlights: string;
  content_type: string;
  created_at: string;
}

export interface TopicInsightRecord {
  id: number;
  search_id: number;
  title: string;
  description: string;
  evidence: string;
  suggested_topics: string;
  related_articles: string;
  created_at: string;
}

export interface ArticleRecord {
  id: number;
  title: string;
  content: string;
  cover_image: string;
  images: string;
  status: 'draft' | 'pending_review' | 'approved' | 'published' | 'failed' | 'archived';
  source: string;
  source_insight_id: number | null;
  source_search_id: number | null;
  created_at: string;
  updated_at: string;
}

// Database operations
export function createSearchRecord(
  keyword: string,
  articleCount: number,
  options?: {
    searchType?: 'keyword' | 'account';
    accountName?: string;
    accountAvatar?: string;
  }
): number {
  const stmt = db.prepare(
    'INSERT INTO search_records (keyword, article_count, search_type, account_name, account_avatar) VALUES (?, ?, ?, ?, ?)'
  );
  const result = stmt.run(
    keyword,
    articleCount,
    options?.searchType || 'keyword',
    options?.accountName || null,
    options?.accountAvatar || null
  );
  return result.lastInsertRowid as number;
}

export function saveArticles(searchId: number, articles: Omit<SourceArticle, 'id' | 'search_id'>[]) {
  const stmt = db.prepare(`
    INSERT INTO source_articles (
      search_id, title, content, cover_image, read_count, like_count,
      wow_count, publish_time, source_url, wx_name, wx_id, is_original
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((articles: Omit<SourceArticle, 'id' | 'search_id'>[]) => {
    for (const article of articles) {
      stmt.run(
        searchId,
        article.title,
        article.content,
        article.cover_image,
        article.read_count,
        article.like_count,
        article.wow_count,
        article.publish_time,
        article.source_url,
        article.wx_name,
        article.wx_id,
        article.is_original
      );
    }
  });

  insertMany(articles);
}

export function getRecentSearches(limit: number = 5): SearchRecord[] {
  const stmt = db.prepare('SELECT * FROM search_records ORDER BY created_at DESC LIMIT ?');
  return stmt.all(limit) as SearchRecord[];
}

export function getAllSearches(): SearchRecord[] {
  const stmt = db.prepare('SELECT * FROM search_records ORDER BY created_at DESC');
  return stmt.all() as SearchRecord[];
}

export function getSearchById(id: number): SearchRecord | undefined {
  const stmt = db.prepare('SELECT * FROM search_records WHERE id = ?');
  return stmt.get(id) as SearchRecord | undefined;
}

export function getArticlesBySearchId(searchId: number): SourceArticle[] {
  const stmt = db.prepare('SELECT * FROM source_articles WHERE search_id = ?');
  return stmt.all(searchId) as SourceArticle[];
}

export function deleteSearch(id: number) {
  const deleteArticles = db.prepare('DELETE FROM source_articles WHERE search_id = ?');
  const deleteRecord = db.prepare('DELETE FROM search_records WHERE id = ?');

  const deleteAll = db.transaction((id: number) => {
    deleteArticles.run(id);
    deleteRecord.run(id);
  });

  deleteAll(id);
}

// Settings operations
export function getSetting(key: string): string | undefined {
  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const result = stmt.get(key) as { value: string } | undefined;
  return result?.value;
}

export function setSetting(key: string, value: string): void {
  const stmt = db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `);
  stmt.run(key, value);
}

export function getAllSettings(): Record<string, string> {
  const stmt = db.prepare('SELECT key, value FROM settings');
  const rows = stmt.all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

// Article summaries operations
export function saveArticleSummary(
  searchId: number,
  articleId: number,
  summary: {
    title: string;
    summary: string;
    keyPoints: string[];
    keywords: string[];
    highlights: string[];
    contentType: string;
  }
): number {
  const stmt = db.prepare(`
    INSERT INTO article_summaries (search_id, article_id, title, summary, key_points, keywords, highlights, content_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    searchId,
    articleId,
    summary.title,
    summary.summary,
    JSON.stringify(summary.keyPoints),
    JSON.stringify(summary.keywords),
    JSON.stringify(summary.highlights),
    summary.contentType
  );
  return result.lastInsertRowid as number;
}

export function getArticleSummariesBySearchId(searchId: number): ArticleSummaryRecord[] {
  const stmt = db.prepare('SELECT * FROM article_summaries WHERE search_id = ?');
  return stmt.all(searchId) as ArticleSummaryRecord[];
}

// Topic insights operations
type TopicInsightInput = {
  title: string;
  description: string;
  evidence: string;
  suggestedTopics: string[];
  relatedArticles: string[];
};

export function saveTopicInsights(
  searchId: number,
  insights: TopicInsightInput[]
): void {
  const stmt = db.prepare(`
    INSERT INTO topic_insights (search_id, title, description, evidence, suggested_topics, related_articles)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items: TopicInsightInput[]) => {
    for (const insight of items) {
      stmt.run(
        searchId,
        insight.title,
        insight.description,
        insight.evidence,
        JSON.stringify(insight.suggestedTopics),
        JSON.stringify(insight.relatedArticles)
      );
    }
  });

  insertMany(insights);
}

export function getTopicInsightsBySearchId(searchId: number): TopicInsightRecord[] {
  const stmt = db.prepare('SELECT * FROM topic_insights WHERE search_id = ?');
  return stmt.all(searchId) as TopicInsightRecord[];
}

export function deleteInsightsBySearchId(searchId: number): void {
  const stmt = db.prepare('DELETE FROM topic_insights WHERE search_id = ?');
  stmt.run(searchId);
}

export function deleteSummariesBySearchId(searchId: number): void {
  const stmt = db.prepare('DELETE FROM article_summaries WHERE search_id = ?');
  stmt.run(searchId);
}

// Articles operations
export function createArticle(article: {
  title: string;
  content: string;
  coverImage?: string;
  images?: string[];
  source?: string;
  sourceInsightId?: number;
  sourceSearchId?: number;
}): number {
  const stmt = db.prepare(`
    INSERT INTO articles (title, content, cover_image, images, source, source_insight_id, source_search_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    article.title,
    article.content,
    article.coverImage || '',
    JSON.stringify(article.images || []),
    article.source || '',
    article.sourceInsightId || null,
    article.sourceSearchId || null
  );
  return result.lastInsertRowid as number;
}

export function getArticleById(id: number): ArticleRecord | undefined {
  const stmt = db.prepare('SELECT * FROM articles WHERE id = ?');
  return stmt.get(id) as ArticleRecord | undefined;
}

export function getAllArticles(): ArticleRecord[] {
  const stmt = db.prepare('SELECT * FROM articles ORDER BY created_at DESC');
  return stmt.all() as ArticleRecord[];
}

export function getArticlesByStatus(status: string): ArticleRecord[] {
  const stmt = db.prepare('SELECT * FROM articles WHERE status = ? ORDER BY created_at DESC');
  return stmt.all(status) as ArticleRecord[];
}

export function updateArticle(
  id: number,
  updates: {
    title?: string;
    content?: string;
    coverImage?: string;
    images?: string[];
    status?: string;
  }
): void {
  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (updates.title !== undefined) {
    fields.push('title = ?');
    values.push(updates.title);
  }
  if (updates.content !== undefined) {
    fields.push('content = ?');
    values.push(updates.content);
  }
  if (updates.coverImage !== undefined) {
    fields.push('cover_image = ?');
    values.push(updates.coverImage);
  }
  if (updates.images !== undefined) {
    fields.push('images = ?');
    values.push(JSON.stringify(updates.images));
  }
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }

  if (fields.length === 0) return;

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  const stmt = db.prepare(`UPDATE articles SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);
}

export function deleteArticle(id: number): void {
  const stmt = db.prepare('DELETE FROM articles WHERE id = ?');
  stmt.run(id);
}

// 复制文章
export function copyArticle(id: number): number {
  const article = getArticleById(id);
  if (!article) {
    throw new Error('文章不存在');
  }

  const stmt = db.prepare(`
    INSERT INTO articles (title, content, cover_image, images, status, source, source_insight_id, source_search_id)
    VALUES (?, ?, ?, ?, 'draft', ?, ?, ?)
  `);
  const result = stmt.run(
    `${article.title} (副本)`,
    article.content,
    article.cover_image,
    article.images,
    article.source,
    article.source_insight_id,
    article.source_search_id
  );
  return result.lastInsertRowid as number;
}

// 归档文章
export function archiveArticle(id: number): void {
  const stmt = db.prepare("UPDATE articles SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ?");
  stmt.run(id);
}

// 获取非归档文章
export function getActiveArticles(): ArticleRecord[] {
  const stmt = db.prepare("SELECT * FROM articles WHERE status != 'archived' ORDER BY created_at DESC");
  return stmt.all() as ArticleRecord[];
}

// Get all search records with insight counts
export function getAllSearchesWithInsightCounts(): (SearchRecord & { insight_count: number })[] {
  const stmt = db.prepare(`
    SELECT
      sr.*,
      COUNT(ti.id) as insight_count
    FROM search_records sr
    LEFT JOIN topic_insights ti ON sr.id = ti.search_id
    GROUP BY sr.id
    ORDER BY sr.created_at DESC
  `);
  return stmt.all() as (SearchRecord & { insight_count: number })[];
}

// Get insights ordered by created_at DESC
export function getTopicInsightsBySearchIdOrdered(searchId: number): TopicInsightRecord[] {
  const stmt = db.prepare('SELECT * FROM topic_insights WHERE search_id = ? ORDER BY created_at DESC');
  return stmt.all(searchId) as TopicInsightRecord[];
}

// ============ 仪表盘统计函数 ============

// 获取总体统计数据
export interface DashboardStats {
  totalAnalysis: number;
  totalArticles: number;
  publishedArticles: number;
  pendingArticles: number;
}

export function getDashboardStats(): DashboardStats {
  const analysisStmt = db.prepare('SELECT COUNT(*) as count FROM search_records');
  const articlesStmt = db.prepare('SELECT COUNT(*) as count FROM articles');
  const publishedStmt = db.prepare("SELECT COUNT(*) as count FROM articles WHERE status = 'published'");
  const pendingStmt = db.prepare("SELECT COUNT(*) as count FROM articles WHERE status IN ('draft', 'pending_review')");

  return {
    totalAnalysis: (analysisStmt.get() as { count: number }).count,
    totalArticles: (articlesStmt.get() as { count: number }).count,
    publishedArticles: (publishedStmt.get() as { count: number }).count,
    pendingArticles: (pendingStmt.get() as { count: number }).count,
  };
}

// 获取近7天分析趋势
export interface DailyAnalysis {
  date: string;
  count: number;
}

export function getAnalysisTrend(days: number = 7): DailyAnalysis[] {
  const stmt = db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM search_records
    WHERE created_at >= DATE('now', '-' || ? || ' days')
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `);
  return stmt.all(days) as DailyAnalysis[];
}

// 获取文章状态分布
export interface StatusDistribution {
  status: string;
  count: number;
}

export function getArticleStatusDistribution(): StatusDistribution[] {
  const stmt = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM articles
    GROUP BY status
  `);
  return stmt.all() as StatusDistribution[];
}

// 获取热门关键词TOP10
export interface KeywordRank {
  keyword: string;
  count: number;
}

export function getTopKeywords(limit: number = 10): KeywordRank[] {
  const stmt = db.prepare(`
    SELECT keyword, COUNT(*) as count
    FROM search_records
    GROUP BY keyword
    ORDER BY count DESC
    LIMIT ?
  `);
  return stmt.all(limit) as KeywordRank[];
}

// 获取最近活动
export interface RecentActivity {
  type: 'analysis' | 'article' | 'publish';
  title: string;
  time: string;
  id: number;
}

export function getRecentActivities(limit: number = 10): RecentActivity[] {
  const activities: RecentActivity[] = [];

  // 获取最近的分析
  const analysisStmt = db.prepare(`
    SELECT id, keyword, created_at FROM search_records
    ORDER BY created_at DESC LIMIT ?
  `);
  const analyses = analysisStmt.all(limit) as { id: number; keyword: string; created_at: string }[];
  analyses.forEach((a) => {
    activities.push({
      type: 'analysis',
      title: `分析了「${a.keyword}」关键词`,
      time: a.created_at,
      id: a.id,
    });
  });

  // 获取最近的文章
  const articleStmt = db.prepare(`
    SELECT id, title, status, created_at, updated_at FROM articles
    ORDER BY updated_at DESC LIMIT ?
  `);
  const articles = articleStmt.all(limit) as { id: number; title: string; status: string; created_at: string; updated_at: string }[];
  articles.forEach((a) => {
    if (a.status === 'published') {
      activities.push({
        type: 'publish',
        title: `发布了《${a.title.slice(0, 20)}${a.title.length > 20 ? '...' : ''}》`,
        time: a.updated_at,
        id: a.id,
      });
    } else {
      activities.push({
        type: 'article',
        title: `创建了《${a.title.slice(0, 20)}${a.title.length > 20 ? '...' : ''}》`,
        time: a.created_at,
        id: a.id,
      });
    }
  });

  // 按时间排序并返回前N条
  return activities
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, limit);
}

export default db;
