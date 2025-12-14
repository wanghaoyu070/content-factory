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

function columnExists(table: string, column: string): boolean {
  try {
    const stmt = db.prepare(`PRAGMA table_info(${table})`);
    const columns = stmt.all() as { name: string }[];
    return columns.some((col) => col.name === column);
  } catch (error) {
    console.error(`检查列 ${table}.${column} 失败:`, error);
    return false;
  }
}

function ensureSettingsTable() {
  const hasUserId = columnExists('settings', 'user_id');
  if (!hasUserId) {
    db.transaction(() => {
      db.exec('ALTER TABLE settings RENAME TO settings_old');
      db.exec(`
        CREATE TABLE settings (
          user_id INTEGER NOT NULL,
          key TEXT NOT NULL,
          value TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, key)
        );
      `);
      db.exec(`
        INSERT INTO settings (user_id, key, value, updated_at)
        SELECT 1 as user_id, key, value, updated_at FROM settings_old;
      `);
      db.exec('DROP TABLE settings_old');
    })();
  }
}

function ensureColumn(
  table: string,
  column: string,
  definition: string,
  onAdd?: () => void
) {
  if (!columnExists(table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    if (onAdd) onAdd();
  }
}

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    github_id TEXT NOT NULL UNIQUE,
    github_login TEXT,
    name TEXT,
    email TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS invite_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    created_by INTEGER,
    used_by INTEGER,
    used_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS search_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 1,
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
    user_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, key)
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
    user_id INTEGER NOT NULL DEFAULT 1,
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

ensureSettingsTable();
ensureColumn('search_records', 'user_id', 'INTEGER DEFAULT 1', () => {
  db.exec('UPDATE search_records SET user_id = 1 WHERE user_id IS NULL OR user_id = 0');
});
ensureColumn('articles', 'user_id', 'INTEGER DEFAULT 1', () => {
  db.exec('UPDATE articles SET user_id = 1 WHERE user_id IS NULL OR user_id = 0');
});
db.exec('CREATE INDEX IF NOT EXISTS idx_search_user ON search_records(user_id)');
db.exec('CREATE INDEX IF NOT EXISTS idx_articles_user ON articles(user_id)');

// Add onboarding_completed column to users table
ensureColumn('users', 'onboarding_completed', 'INTEGER DEFAULT 0');

// Add Xiaohongshu related fields to articles
ensureColumn('articles', 'xhs_tags', 'TEXT'); // 小红书话题标签 JSON 数组
ensureColumn('articles', 'xhs_content', 'TEXT'); // 小红书版本内容（精简版）
ensureColumn('articles', 'xhs_title', 'TEXT'); // 小红书版本标题（可选不同标题）

// Create insight_favorites table for user favorites
db.exec(`
  CREATE TABLE IF NOT EXISTS insight_favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    insight_id INTEGER NOT NULL,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (insight_id) REFERENCES topic_insights(id) ON DELETE CASCADE,
    UNIQUE(user_id, insight_id)
  );
  CREATE INDEX IF NOT EXISTS idx_favorites_user ON insight_favorites(user_id);
  CREATE INDEX IF NOT EXISTS idx_favorites_insight ON insight_favorites(insight_id);
`);

// Types
export interface SearchRecord {
  id: number;
  user_id: number;
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
  user_id: number;
  title: string;
  content: string;
  cover_image: string;
  images: string;
  status: 'draft' | 'pending_review' | 'approved' | 'published' | 'failed' | 'archived';
  source: string;
  source_insight_id: number | null;
  source_search_id: number | null;
  xhs_tags: string | null;
  xhs_content: string | null;
  xhs_title: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRecord {
  id: number;
  github_id: string;
  github_login: string | null;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: 'admin' | 'user' | 'pending';
  onboarding_completed: number;
  created_at: string;
  updated_at: string;
}

export interface InviteCodeRecord {
  id: number;
  code: string;
  created_by: number | null;
  used_by: number | null;
  used_at: string | null;
  created_at: string;
}

export interface InviteCodeDetail extends InviteCodeRecord {
  creator_login: string | null;
  used_login: string | null;
}

export interface InsightFavorite {
  id: number;
  user_id: number;
  insight_id: number;
  note: string | null;
  created_at: string;
}

// Database operations
export function createSearchRecord(
  keyword: string,
  articleCount: number,
  options?: {
    searchType?: 'keyword' | 'account';
    accountName?: string;
    accountAvatar?: string;
  },
  userId: number = 1
): number {
  const stmt = db.prepare(
    'INSERT INTO search_records (keyword, article_count, search_type, account_name, account_avatar, user_id) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const result = stmt.run(
    keyword,
    articleCount,
    options?.searchType || 'keyword',
    options?.accountName || null,
    options?.accountAvatar || null,
    userId
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

export function getUserByGithubId(githubId: string): UserRecord | null {
  const stmt = db.prepare('SELECT * FROM users WHERE github_id = ?');
  return (stmt.get(githubId) as UserRecord | undefined) ?? null;
}

export function getUserById(id: number): UserRecord | null {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return (stmt.get(id) as UserRecord | undefined) ?? null;
}

export function getUsersCount(): number {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM users');
  const row = stmt.get() as { count: number } | undefined;
  return row?.count ?? 0;
}

export function createUser(user: {
  githubId: string;
  githubLogin?: string | null;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  role?: 'admin' | 'user' | 'pending';
}): number {
  const stmt = db.prepare(`
    INSERT INTO users (github_id, github_login, name, email, avatar_url, role)
    VALUES (@githubId, @githubLogin, @name, @email, @avatarUrl, @role)
  `);
  const result = stmt.run({
    githubId: user.githubId,
    githubLogin: user.githubLogin ?? null,
    name: user.name ?? null,
    email: user.email ?? null,
    avatarUrl: user.avatarUrl ?? null,
    role: user.role ?? 'user',
  });
  return result.lastInsertRowid as number;
}

export function upsertInviteCode(code: string, createdBy: number | null) {
  const stmt = db.prepare(`
    INSERT INTO invite_codes (code, created_by)
    VALUES (?, ?)
    ON CONFLICT(code) DO UPDATE SET created_by = excluded.created_by
  `);
  stmt.run(code, createdBy);
}

export function getInviteCode(code: string): InviteCodeRecord | null {
  const stmt = db.prepare('SELECT * FROM invite_codes WHERE code = ?');
  return (stmt.get(code) as InviteCodeRecord | undefined) ?? null;
}

export function markInviteCodeUsed(code: string, userId: number) {
  const stmt = db.prepare(`
    UPDATE invite_codes
    SET used_by = ?, used_at = CURRENT_TIMESTAMP
    WHERE code = ?
  `);
  stmt.run(userId, code);
}

export function updateUserRole(userId: number, role: 'admin' | 'user' | 'pending') {
  const stmt = db.prepare('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run(role, userId);
}

export function updateUserOnboarding(userId: number, completed: boolean) {
  const stmt = db.prepare('UPDATE users SET onboarding_completed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run(completed ? 1 : 0, userId);
}

export function createInviteCodeRecord(code: string, createdBy: number | null): number {
  const stmt = db.prepare(`
    INSERT INTO invite_codes (code, created_by)
    VALUES (?, ?)
  `);
  const result = stmt.run(code, createdBy);
  return result.lastInsertRowid as number;
}

export function getInviteCodes(): InviteCodeDetail[] {
  const stmt = db.prepare(`
    SELECT
      ic.*,
      creator.github_login AS creator_login,
      used.github_login AS used_login
    FROM invite_codes ic
    LEFT JOIN users creator ON ic.created_by = creator.id
    LEFT JOIN users used ON ic.used_by = used.id
    ORDER BY ic.created_at DESC
  `);
  return stmt.all() as InviteCodeDetail[];
}

export function deleteInviteCode(id: number): boolean {
  const stmt = db.prepare('DELETE FROM invite_codes WHERE id = ? AND used_by IS NULL');
  const result = stmt.run(id);
  return result.changes > 0;
}

export function getRecentSearches(limit: number = 5, userId?: number): SearchRecord[] {
  const base = 'SELECT * FROM search_records';
  const order = ' ORDER BY created_at DESC LIMIT ?';
  if (userId) {
    const stmt = db.prepare(`${base} WHERE user_id = ?${order}`);
    return stmt.all(userId, limit) as SearchRecord[];
  }
  const stmt = db.prepare(`${base}${order}`);
  return stmt.all(limit) as SearchRecord[];
}

export function getAllSearches(userId?: number): SearchRecord[] {
  const base = 'SELECT * FROM search_records';
  const order = ' ORDER BY created_at DESC';
  if (userId) {
    const stmt = db.prepare(`${base} WHERE user_id = ?${order}`);
    return stmt.all(userId) as SearchRecord[];
  }
  const stmt = db.prepare(`${base}${order}`);
  return stmt.all() as SearchRecord[];
}

export function getSearchById(id: number, userId?: number): SearchRecord | undefined {
  const stmt = userId
    ? db.prepare('SELECT * FROM search_records WHERE id = ? AND user_id = ?')
    : db.prepare('SELECT * FROM search_records WHERE id = ?');
  return userId ? (stmt.get(id, userId) as SearchRecord | undefined) : (stmt.get(id) as SearchRecord | undefined);
}

export function getArticlesBySearchId(searchId: number): SourceArticle[] {
  const stmt = db.prepare('SELECT * FROM source_articles WHERE search_id = ?');
  return stmt.all(searchId) as SourceArticle[];
}

export function deleteSearch(id: number, userId?: number) {
  if (userId && !getSearchById(id, userId)) {
    return;
  }

  const deleteArticles = db.prepare('DELETE FROM source_articles WHERE search_id = ?');
  const deleteRecord = userId
    ? db.prepare('DELETE FROM search_records WHERE id = ? AND user_id = ?')
    : db.prepare('DELETE FROM search_records WHERE id = ?');

  const deleteAll = db.transaction((searchId: number) => {
    deleteArticles.run(searchId);
    if (userId) {
      deleteRecord.run(searchId, userId);
    } else {
      deleteRecord.run(searchId);
    }
  });

  deleteAll(id);
}

// Settings operations
export function getSetting(key: string, userId: number = 1): string | undefined {
  const stmt = db.prepare('SELECT value FROM settings WHERE user_id = ? AND key = ?');
  const result = stmt.get(userId, key) as { value: string } | undefined;
  return result?.value;
}

export function setSetting(key: string, value: string, userId: number = 1): void {
  const stmt = db.prepare(`
    INSERT INTO settings (user_id, key, value, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `);
  stmt.run(userId, key, value);
}

export function getAllSettings(userId: number): Record<string, string> {
  const stmt = db.prepare('SELECT key, value FROM settings WHERE user_id = ?');
  const rows = stmt.all(userId) as { key: string; value: string }[];
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

// Insight favorites operations
export function addInsightFavorite(userId: number, insightId: number, note?: string): boolean {
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO insight_favorites (user_id, insight_id, note)
      VALUES (?, ?, ?)
    `);
    stmt.run(userId, insightId, note || null);
    return true;
  } catch (error) {
    console.error('收藏洞察失败:', error);
    return false;
  }
}

export function removeInsightFavorite(userId: number, insightId: number): boolean {
  try {
    const stmt = db.prepare('DELETE FROM insight_favorites WHERE user_id = ? AND insight_id = ?');
    stmt.run(userId, insightId);
    return true;
  } catch (error) {
    console.error('取消收藏失败:', error);
    return false;
  }
}

export function isInsightFavorited(userId: number, insightId: number): boolean {
  const stmt = db.prepare('SELECT 1 FROM insight_favorites WHERE user_id = ? AND insight_id = ?');
  return stmt.get(userId, insightId) !== undefined;
}

export function getUserFavoriteInsights(userId: number): (TopicInsightRecord & { note: string | null; favorited_at: string })[] {
  const stmt = db.prepare(`
    SELECT 
      ti.*,
      f.note,
      f.created_at as favorited_at
    FROM insight_favorites f
    JOIN topic_insights ti ON f.insight_id = ti.id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
  `);
  return stmt.all(userId) as (TopicInsightRecord & { note: string | null; favorited_at: string })[];
}

export function getUserFavoriteInsightIds(userId: number): number[] {
  const stmt = db.prepare('SELECT insight_id FROM insight_favorites WHERE user_id = ?');
  const rows = stmt.all(userId) as { insight_id: number }[];
  return rows.map(r => r.insight_id);
}

export function updateInsightFavoriteNote(userId: number, insightId: number, note: string): boolean {
  try {
    const stmt = db.prepare('UPDATE insight_favorites SET note = ? WHERE user_id = ? AND insight_id = ?');
    stmt.run(note, userId, insightId);
    return true;
  } catch (error) {
    console.error('更新备注失败:', error);
    return false;
  }
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
  userId?: number;
  xhsTags?: string[];
}): number {
  const stmt = db.prepare(`
    INSERT INTO articles (title, content, cover_image, images, source, source_insight_id, source_search_id, user_id, xhs_tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    article.title,
    article.content,
    article.coverImage || '',
    JSON.stringify(article.images || []),
    article.source || '',
    article.sourceInsightId || null,
    article.sourceSearchId || null,
    article.userId || 1,
    article.xhsTags ? JSON.stringify(article.xhsTags) : null
  );
  return result.lastInsertRowid as number;
}

export function getArticleById(id: number, userId: number): ArticleRecord | undefined {
  const stmt = db.prepare('SELECT * FROM articles WHERE id = ? AND user_id = ?');
  return stmt.get(id, userId) as ArticleRecord | undefined;
}

export function getAllArticles(userId: number): ArticleRecord[] {
  const stmt = db.prepare('SELECT * FROM articles WHERE user_id = ? ORDER BY created_at DESC');
  return stmt.all(userId) as ArticleRecord[];
}

export function getArticlesByStatus(status: string, userId: number): ArticleRecord[] {
  const stmt = db.prepare('SELECT * FROM articles WHERE status = ? AND user_id = ? ORDER BY created_at DESC');
  return stmt.all(status, userId) as ArticleRecord[];
}

export function updateArticle(
  id: number,
  updates: {
    title?: string;
    content?: string;
    coverImage?: string;
    images?: string[];
    status?: string;
    xhsTags?: string;
    xhsContent?: string;
    xhsTitle?: string;
  },
  userId?: number
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
  if (updates.xhsTags !== undefined) {
    fields.push('xhs_tags = ?');
    values.push(updates.xhsTags);
  }
  if (updates.xhsContent !== undefined) {
    fields.push('xhs_content = ?');
    values.push(updates.xhsContent);
  }
  if (updates.xhsTitle !== undefined) {
    fields.push('xhs_title = ?');
    values.push(updates.xhsTitle);
  }

  if (fields.length === 0) return;

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  if (userId) {
    values.push(userId);
  }

  const stmt = db.prepare(
    `UPDATE articles SET ${fields.join(', ')} WHERE id = ?${userId ? ' AND user_id = ?' : ''}`
  );
  stmt.run(...values);
}

export function deleteArticle(id: number, userId?: number): void {
  const stmt = userId
    ? db.prepare('DELETE FROM articles WHERE id = ? AND user_id = ?')
    : db.prepare('DELETE FROM articles WHERE id = ?');
  userId ? stmt.run(id, userId) : stmt.run(id);
}

// 复制文章
export function copyArticle(id: number, userId: number): number {
  const article = getArticleById(id, userId);
  if (!article) {
    throw new Error('文章不存在');
  }

  const stmt = db.prepare(`
    INSERT INTO articles (title, content, cover_image, images, status, source, source_insight_id, source_search_id, user_id)
    VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?)
  `);
  const result = stmt.run(
    `${article.title} (副本)`,
    article.content,
    article.cover_image,
    article.images,
    article.source,
    article.source_insight_id,
    article.source_search_id,
    article.user_id
  );
  return result.lastInsertRowid as number;
}

// 归档文章
export function archiveArticle(id: number, userId?: number): void {
  const stmt = userId
    ? db.prepare(
      "UPDATE articles SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?"
    )
    : db.prepare("UPDATE articles SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ?");
  userId ? stmt.run(id, userId) : stmt.run(id);
}

// 获取非归档文章
export function getActiveArticles(userId?: number): ArticleRecord[] {
  const stmt = userId
    ? db.prepare("SELECT * FROM articles WHERE status != 'archived' AND user_id = ? ORDER BY created_at DESC")
    : db.prepare("SELECT * FROM articles WHERE status != 'archived' ORDER BY created_at DESC");
  return userId ? (stmt.all(userId) as ArticleRecord[]) : (stmt.all() as ArticleRecord[]);
}

// Get all search records with insight counts
export function getAllSearchesWithInsightCounts(
  userId?: number
): (SearchRecord & { insight_count: number })[] {
  const base = `
    SELECT
      sr.*,
      COUNT(ti.id) as insight_count
    FROM search_records sr
    LEFT JOIN topic_insights ti ON sr.id = ti.search_id
  `;
  const suffix = `
    GROUP BY sr.id
    ORDER BY sr.created_at DESC
  `;
  if (userId) {
    const stmt = db.prepare(`${base} WHERE sr.user_id = ?${suffix}`);
    return stmt.all(userId) as (SearchRecord & { insight_count: number })[];
  }
  const stmt = db.prepare(`${base}${suffix}`);
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

export function getDashboardStats(userId?: number): DashboardStats {
  const analysisStmt = userId
    ? db.prepare('SELECT COUNT(*) as count FROM search_records WHERE user_id = ?')
    : db.prepare('SELECT COUNT(*) as count FROM search_records');
  const articlesStmt = userId
    ? db.prepare('SELECT COUNT(*) as count FROM articles WHERE user_id = ?')
    : db.prepare('SELECT COUNT(*) as count FROM articles');
  const publishedStmt = userId
    ? db.prepare("SELECT COUNT(*) as count FROM articles WHERE status = 'published' AND user_id = ?")
    : db.prepare("SELECT COUNT(*) as count FROM articles WHERE status = 'published'");
  const pendingStmt = userId
    ? db.prepare(
      "SELECT COUNT(*) as count FROM articles WHERE status IN ('draft', 'pending_review') AND user_id = ?"
    )
    : db.prepare("SELECT COUNT(*) as count FROM articles WHERE status IN ('draft', 'pending_review')");

  return {
    totalAnalysis: (userId
      ? (analysisStmt.get(userId) as { count: number })
      : (analysisStmt.get() as { count: number })).count,
    totalArticles: (userId
      ? (articlesStmt.get(userId) as { count: number })
      : (articlesStmt.get() as { count: number })).count,
    publishedArticles: (userId
      ? (publishedStmt.get(userId) as { count: number })
      : (publishedStmt.get() as { count: number })).count,
    pendingArticles: (userId
      ? (pendingStmt.get(userId) as { count: number })
      : (pendingStmt.get() as { count: number })).count,
  };
}

// 获取近7天分析趋势
export interface DailyAnalysis {
  date: string;
  count: number;
}

export function getAnalysisTrend(days: number = 7, userId?: number): DailyAnalysis[] {
  const base = `
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM search_records
    WHERE created_at >= DATE('now', '-' || ? || ' days')
  `;
  const suffix = `
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `;
  if (userId) {
    const stmt = db.prepare(`${base} AND user_id = ?${suffix}`);
    return stmt.all(days, userId) as DailyAnalysis[];
  }
  const stmt = db.prepare(`${base}${suffix}`);
  return stmt.all(days) as DailyAnalysis[];
}

// 获取文章状态分布
export interface StatusDistribution {
  status: string;
  count: number;
}

export function getArticleStatusDistribution(userId?: number): StatusDistribution[] {
  const base = `
    SELECT status, COUNT(*) as count
    FROM articles
  `;
  const suffix = `
    GROUP BY status
  `;
  if (userId) {
    const stmt = db.prepare(`${base} WHERE user_id = ?${suffix}`);
    return stmt.all(userId) as StatusDistribution[];
  }
  const stmt = db.prepare(`${base}${suffix}`);
  return stmt.all() as StatusDistribution[];
}

// 获取热门关键词TOP10
export interface KeywordRank {
  keyword: string;
  count: number;
}

export function getTopKeywords(limit: number = 10, userId?: number): KeywordRank[] {
  const base = `
    SELECT keyword, COUNT(*) as count
    FROM search_records
  `;
  const suffix = `
    GROUP BY keyword
    ORDER BY count DESC
    LIMIT ?
  `;
  if (userId) {
    const stmt = db.prepare(`${base} WHERE user_id = ?${suffix}`);
    return stmt.all(userId, limit) as KeywordRank[];
  }
  const stmt = db.prepare(`${base}${suffix}`);
  return stmt.all(limit) as KeywordRank[];
}

// 获取最近活动
export interface RecentActivity {
  type: 'analysis' | 'article' | 'publish';
  title: string;
  time: string;
  id: number;
}

export function getRecentActivities(limit: number = 10, userId?: number): RecentActivity[] {
  const activities: RecentActivity[] = [];

  // 获取最近的分析
  const analysisStmt = userId
    ? db.prepare(`
        SELECT id, keyword, created_at FROM search_records
        WHERE user_id = ?
        ORDER BY created_at DESC LIMIT ?
      `)
    : db.prepare(`
        SELECT id, keyword, created_at FROM search_records
        ORDER BY created_at DESC LIMIT ?
      `);
  const analyses = userId
    ? (analysisStmt.all(userId, limit) as { id: number; keyword: string; created_at: string }[])
    : (analysisStmt.all(limit) as { id: number; keyword: string; created_at: string }[]);
  analyses.forEach((a) => {
    activities.push({
      type: 'analysis',
      title: `分析了「${a.keyword}」关键词`,
      time: a.created_at,
      id: a.id,
    });
  });

  // 获取最近的文章
  const articleStmt = userId
    ? db.prepare(`
        SELECT id, title, status, created_at, updated_at FROM articles
        WHERE user_id = ?
        ORDER BY updated_at DESC LIMIT ?
      `)
    : db.prepare(`
        SELECT id, title, status, created_at, updated_at FROM articles
        ORDER BY updated_at DESC LIMIT ?
      `);
  const articles = userId
    ? (articleStmt.all(userId, limit) as {
      id: number;
      title: string;
      status: string;
      created_at: string;
      updated_at: string;
    }[])
    : (articleStmt.all(limit) as {
      id: number;
      title: string;
      status: string;
      created_at: string;
      updated_at: string;
    }[]);
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
