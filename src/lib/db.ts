import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Lazy singleton: DB is only initialized when first accessed, not on import.
// This prevents blocking dev server startup when editing frontend-only pages.
let _db: InstanceType<typeof Database> | null = null;
let _initialized = false;

function getDb(): InstanceType<typeof Database> {
  if (!_db) {
    const dbPath = path.join(process.cwd(), 'data', 'content-factory.db');
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    _db = new Database(dbPath);
  }
  if (!_initialized) {
    _initialized = true;
    initializeDatabase(_db);
  }
  return _db;
}

// Proxy: keeps all existing `db.xxx()` calls working without changes
const db = new Proxy({} as InstanceType<typeof Database>, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// 安全性：表名白名单，防止 SQL 注入
const ALLOWED_TABLES = [
  'users',
  'invite_codes',
  'search_records',
  'analysis_jobs',
  'generation_jobs',
  'source_articles',
  'settings',
  'article_summaries',
  'topic_insights',
  'articles',
  'insight_favorites',
] as const;

type AllowedTable = typeof ALLOWED_TABLES[number];

function isValidTableName(table: string): table is AllowedTable {
  return ALLOWED_TABLES.includes(table as AllowedTable);
}

// 安全性：列名验证（只允许字母、数字、下划线）
function isValidColumnName(column: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column);
}

function columnExists(table: string, column: string): boolean {
  // 安全检查：验证表名和列名
  if (!isValidTableName(table)) {
    console.error(`无效的表名: ${table}`);
    return false;
  }
  if (!isValidColumnName(column)) {
    console.error(`无效的列名: ${column}`);
    return false;
  }

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
  // 安全检查：验证表名和列名
  if (!isValidTableName(table)) {
    console.error(`ensureColumn: 无效的表名: ${table}`);
    return;
  }
  if (!isValidColumnName(column)) {
    console.error(`ensureColumn: 无效的列名: ${column}`);
    return;
  }
  // 安全检查：验证列定义（只允许安全的 SQL 类型定义）
  if (!/^[A-Z]+(\s+DEFAULT\s+('?[\w\-]+'?|\d+|NULL))?$/i.test(definition)) {
    console.error(`ensureColumn: 无效的列定义: ${definition}`);
    return;
  }

  if (!columnExists(table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    if (onAdd) onAdd();
  }
}

// All table creation and migration logic, called lazily on first DB access.
function initializeDatabase(db: InstanceType<typeof Database>) {
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

    CREATE TABLE IF NOT EXISTS analysis_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      search_id INTEGER NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      execution_mode TEXT NOT NULL DEFAULT 'background',
      error_message TEXT,
      started_at DATETIME,
      heartbeat_at DATETIME,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (search_id) REFERENCES search_records(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status ON analysis_jobs(status);
    CREATE INDEX IF NOT EXISTS idx_analysis_jobs_user ON analysis_jobs(user_id);

    CREATE TABLE IF NOT EXISTS generation_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      search_id INTEGER NOT NULL,
      insight_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      step TEXT,
      progress INTEGER NOT NULL DEFAULT 0,
      message TEXT,
      style TEXT,
      fetch_images INTEGER NOT NULL DEFAULT 0,
      article_id INTEGER,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME,
      completed_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (search_id) REFERENCES search_records(id) ON DELETE CASCADE,
      FOREIGN KEY (insight_id) REFERENCES topic_insights(id) ON DELETE SET NULL,
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_generation_jobs_user ON generation_jobs(user_id);
    CREATE INDEX IF NOT EXISTS idx_generation_jobs_search ON generation_jobs(search_id);
    CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status);

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

  ensureColumn('search_records', 'status', "TEXT DEFAULT 'completed'");
  ensureColumn('users', 'onboarding_completed', 'INTEGER DEFAULT 0');

  ensureColumn('articles', 'xhs_tags', 'TEXT');
  ensureColumn('articles', 'xhs_content', 'TEXT');
  ensureColumn('articles', 'xhs_title', 'TEXT');
  ensureColumn('articles', 'markdown_content', 'TEXT');

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
}

// Types
export interface SearchRecord {
  id: number;
  user_id: number;
  keyword: string;
  article_count: number;
  search_type: 'keyword' | 'account';
  account_name: string | null;
  account_avatar: string | null;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

export type AnalysisJobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface AnalysisJobRecord {
  id: number;
  search_id: number;
  user_id: number;
  status: AnalysisJobStatus;
  attempts: number;
  execution_mode: 'background' | 'inline';
  error_message: string | null;
  started_at: string | null;
  heartbeat_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type GenerationJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface GenerationJobRecord {
  id: number;
  user_id: number;
  search_id: number;
  insight_id: number;
  status: GenerationJobStatus;
  step: string | null;
  progress: number;
  message: string | null;
  style: string | null;
  fetch_images: number;
  article_id: number | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
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
  markdown_content: string | null;
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
  userId: number,
  options?: {
    searchType?: 'keyword' | 'account';
    accountName?: string;
    accountAvatar?: string;
  }
): number {
  if (!userId) {
    throw new Error('createSearchRecord: userId is required');
  }
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

export function createAnalysisJob(
  searchId: number,
  userId: number,
  executionMode: 'background' | 'inline' = 'background'
): number {
  const stmt = db.prepare(`
    INSERT INTO analysis_jobs (search_id, user_id, execution_mode, status)
    VALUES (?, ?, ?, 'pending')
    ON CONFLICT(search_id) DO UPDATE SET
      user_id = excluded.user_id,
      execution_mode = excluded.execution_mode,
      status = 'pending',
      error_message = NULL,
      completed_at = NULL,
      started_at = NULL,
      heartbeat_at = NULL,
      updated_at = CURRENT_TIMESTAMP
  `);
  const result = stmt.run(searchId, userId, executionMode);
  return result.lastInsertRowid as number;
}

export function createGenerationJob(input: {
  userId: number;
  searchId: number;
  insightId: number;
  style?: string;
  fetchImages?: boolean;
}): number {
  const stmt = db.prepare(`
    INSERT INTO generation_jobs (user_id, search_id, insight_id, style, fetch_images, status, progress)
    VALUES (?, ?, ?, ?, ?, 'pending', 0)
  `);
  const result = stmt.run(
    input.userId,
    input.searchId,
    input.insightId,
    input.style || null,
    input.fetchImages ? 1 : 0
  );
  return result.lastInsertRowid as number;
}

export function getGenerationJobById(jobId: number, userId?: number): GenerationJobRecord | undefined {
  const stmt = userId
    ? db.prepare('SELECT * FROM generation_jobs WHERE id = ? AND user_id = ?')
    : db.prepare('SELECT * FROM generation_jobs WHERE id = ?');
  return userId
    ? (stmt.get(jobId, userId) as GenerationJobRecord | undefined)
    : (stmt.get(jobId) as GenerationJobRecord | undefined);
}

export function updateGenerationJobProgress(
  jobId: number,
  userId: number,
  input: {
    status: GenerationJobStatus;
    step?: string;
    progress?: number;
    message?: string;
    articleId?: number | null;
    errorMessage?: string | null;
  }
): void {
  const stmt = db.prepare(`
    UPDATE generation_jobs
    SET
      status = ?,
      step = ?,
      progress = ?,
      message = ?,
      article_id = COALESCE(?, article_id),
      error_message = ?,
      started_at = CASE WHEN started_at IS NULL AND ? = 'processing' THEN CURRENT_TIMESTAMP ELSE started_at END,
      completed_at = CASE WHEN ? IN ('completed', 'failed') THEN CURRENT_TIMESTAMP ELSE completed_at END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `);
  stmt.run(
    input.status,
    input.step || null,
    input.progress ?? 0,
    input.message || null,
    input.articleId ?? null,
    input.errorMessage ?? null,
    input.status,
    input.status,
    jobId,
    userId
  );
}

export function getAnalysisJobBySearchId(searchId: number, userId?: number): AnalysisJobRecord | undefined {
  const stmt = userId
    ? db.prepare('SELECT * FROM analysis_jobs WHERE search_id = ? AND user_id = ?')
    : db.prepare('SELECT * FROM analysis_jobs WHERE search_id = ?');
  return userId
    ? (stmt.get(searchId, userId) as AnalysisJobRecord | undefined)
    : (stmt.get(searchId) as AnalysisJobRecord | undefined);
}

export function claimAnalysisJob(
  searchId: number,
  userId: number,
  staleAfterMinutes: number = 5
): boolean {
  const stmt = db.prepare(`
    UPDATE analysis_jobs
    SET
      status = 'running',
      attempts = attempts + 1,
      started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
      heartbeat_at = CURRENT_TIMESTAMP,
      error_message = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE search_id = ?
      AND user_id = ?
      AND (
        status = 'pending'
        OR status = 'failed'
        OR (status = 'running' AND heartbeat_at IS NOT NULL AND heartbeat_at < DATETIME('now', '-' || ? || ' minutes'))
      )
  `);
  const result = stmt.run(searchId, userId, staleAfterMinutes);
  return result.changes > 0;
}

export function touchAnalysisJob(searchId: number, userId: number): void {
  const stmt = db.prepare(`
    UPDATE analysis_jobs
    SET heartbeat_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE search_id = ? AND user_id = ?
  `);
  stmt.run(searchId, userId);
}

export function completeAnalysisJob(searchId: number, userId: number): void {
  const stmt = db.prepare(`
    UPDATE analysis_jobs
    SET
      status = 'completed',
      heartbeat_at = CURRENT_TIMESTAMP,
      completed_at = CURRENT_TIMESTAMP,
      error_message = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE search_id = ? AND user_id = ?
  `);
  stmt.run(searchId, userId);
}

export function failAnalysisJob(searchId: number, userId: number, errorMessage?: string): void {
  const stmt = db.prepare(`
    UPDATE analysis_jobs
    SET
      status = 'failed',
      heartbeat_at = CURRENT_TIMESTAMP,
      completed_at = CURRENT_TIMESTAMP,
      error_message = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE search_id = ? AND user_id = ?
  `);
  stmt.run(errorMessage || null, searchId, userId);
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

export function consumeInviteCodeForPendingUser(
  code: string,
  userId: number
): { success: boolean; reason?: 'INVALID_OR_USED' | 'NOT_PENDING' } {
  const transaction = db.transaction((trimmedCode: string, targetUserId: number) => {
    const userStmt = db.prepare('SELECT role FROM users WHERE id = ?');
    const user = userStmt.get(targetUserId) as { role: string } | undefined;
    if (!user || user.role !== 'pending') {
      return { success: false as const, reason: 'NOT_PENDING' as const };
    }

    const consumeStmt = db.prepare(`
      UPDATE invite_codes
      SET used_by = ?, used_at = CURRENT_TIMESTAMP
      WHERE code = ? AND used_by IS NULL
    `);
    const consumeResult = consumeStmt.run(targetUserId, trimmedCode);
    if (consumeResult.changes === 0) {
      return { success: false as const, reason: 'INVALID_OR_USED' as const };
    }

    const updateRoleStmt = db.prepare(`
      UPDATE users
      SET role = 'user', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND role = 'pending'
    `);
    const roleResult = updateRoleStmt.run(targetUserId);
    if (roleResult.changes === 0) {
      throw new Error('failed_to_promote_user');
    }

    return { success: true as const };
  });

  return transaction(code.trim(), userId);
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

export function getArticlesBySearchId(searchId: number, userId?: number): SourceArticle[] {
  const stmt = userId
    ? db.prepare(`
      SELECT sa.*
      FROM source_articles sa
      JOIN search_records sr ON sa.search_id = sr.id
      WHERE sa.search_id = ? AND sr.user_id = ?
    `)
    : db.prepare('SELECT * FROM source_articles WHERE search_id = ?');
  return userId
    ? (stmt.all(searchId, userId) as SourceArticle[])
    : (stmt.all(searchId) as SourceArticle[]);
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

export function updateSearchStatus(
  id: number,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  articleCount?: number,
  userId?: number
) {
  const fields = ['status = ?'];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any[] = [status];

  if (articleCount !== undefined) {
    fields.push('article_count = ?');
    params.push(articleCount);
  }

  params.push(id);
  if (userId) {
    params.push(userId);
  }

  // Use try-catch to prevent crashing if something is wrong with the DB update
  try {
    const stmt = db.prepare(
      `UPDATE search_records SET ${fields.join(', ')} WHERE id = ?${userId ? ' AND user_id = ?' : ''}`
    );
    stmt.run(...params);
  } catch (err) {
    console.error(`Failed to update search status for id ${id}:`, err);
  }
}

// Settings operations
export function getSetting(key: string, userId: number): string | undefined {
  const stmt = db.prepare('SELECT value FROM settings WHERE user_id = ? AND key = ?');
  const result = stmt.get(userId, key) as { value: string } | undefined;
  return result?.value;
}

export function setSetting(key: string, value: string, userId: number): void {
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

export function getArticleSummariesBySearchId(searchId: number, userId?: number): ArticleSummaryRecord[] {
  const stmt = userId
    ? db.prepare(`
      SELECT s.*
      FROM article_summaries s
      JOIN search_records sr ON s.search_id = sr.id
      WHERE s.search_id = ? AND sr.user_id = ?
    `)
    : db.prepare('SELECT * FROM article_summaries WHERE search_id = ?');
  return userId
    ? (stmt.all(searchId, userId) as ArticleSummaryRecord[])
    : (stmt.all(searchId) as ArticleSummaryRecord[]);
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

export function getTopicInsightsBySearchId(searchId: number, userId?: number): TopicInsightRecord[] {
  const stmt = userId
    ? db.prepare(`
      SELECT ti.*
      FROM topic_insights ti
      JOIN search_records sr ON ti.search_id = sr.id
      WHERE ti.search_id = ? AND sr.user_id = ?
    `)
    : db.prepare('SELECT * FROM topic_insights WHERE search_id = ?');
  return userId
    ? (stmt.all(searchId, userId) as TopicInsightRecord[])
    : (stmt.all(searchId) as TopicInsightRecord[]);
}

export function deleteInsightsBySearchId(searchId: number, userId?: number): void {
  const stmt = userId
    ? db.prepare(`
      DELETE FROM topic_insights
      WHERE search_id = ?
      AND EXISTS (
        SELECT 1 FROM search_records
        WHERE id = ? AND user_id = ?
      )
    `)
    : db.prepare('DELETE FROM topic_insights WHERE search_id = ?');
  if (userId) {
    stmt.run(searchId, searchId, userId);
    return;
  }
  stmt.run(searchId);
}

export function deleteSummariesBySearchId(searchId: number, userId?: number): void {
  const stmt = userId
    ? db.prepare(`
      DELETE FROM article_summaries
      WHERE search_id = ?
      AND EXISTS (
        SELECT 1 FROM search_records
        WHERE id = ? AND user_id = ?
      )
    `)
    : db.prepare('DELETE FROM article_summaries WHERE search_id = ?');
  if (userId) {
    stmt.run(searchId, searchId, userId);
    return;
  }
  stmt.run(searchId);
}

// Insight favorites operations
export function addInsightFavorite(userId: number, insightId: number, note?: string): boolean {
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO insight_favorites (user_id, insight_id, note)
      SELECT ?, ti.id, ?
      FROM topic_insights ti
      JOIN search_records sr ON ti.search_id = sr.id
      WHERE ti.id = ? AND sr.user_id = ?
    `);
    const result = stmt.run(userId, note || null, insightId, userId);
    return result.changes > 0;
  } catch (error) {
    console.error('收藏洞察失败:', error);
    return false;
  }
}

export function removeInsightFavorite(userId: number, insightId: number): boolean {
  try {
    const stmt = db.prepare('DELETE FROM insight_favorites WHERE user_id = ? AND insight_id = ?');
    const result = stmt.run(userId, insightId);
    return result.changes > 0;
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
    JOIN search_records sr ON ti.search_id = sr.id
    WHERE f.user_id = ? AND sr.user_id = ?
    ORDER BY f.created_at DESC
  `);
  return stmt.all(userId, userId) as (TopicInsightRecord & { note: string | null; favorited_at: string })[];
}

export function getUserFavoriteInsightIds(userId: number): number[] {
  const stmt = db.prepare(`
    SELECT f.insight_id
    FROM insight_favorites f
    JOIN topic_insights ti ON f.insight_id = ti.id
    JOIN search_records sr ON ti.search_id = sr.id
    WHERE f.user_id = ? AND sr.user_id = ?
  `);
  const rows = stmt.all(userId, userId) as { insight_id: number }[];
  return rows.map(r => r.insight_id);
}

export function updateInsightFavoriteNote(userId: number, insightId: number, note: string): boolean {
  try {
    const stmt = db.prepare('UPDATE insight_favorites SET note = ? WHERE user_id = ? AND insight_id = ?');
    const result = stmt.run(note, userId, insightId);
    return result.changes > 0;
  } catch (error) {
    console.error('更新备注失败:', error);
    return false;
  }
}

// Articles operations
export function createArticle(article: {
  title: string;
  content: string;
  markdown_content?: string;
  coverImage?: string;
  images?: string[];
  source?: string;
  sourceInsightId?: number;
  sourceSearchId?: number;
  userId: number;
  xhsTags?: string[];
}): number {
  if (!article.userId) {
    throw new Error('createArticle: userId is required');
  }
  const stmt = db.prepare(`
    INSERT INTO articles (title, content, markdown_content, cover_image, images, source, source_insight_id, source_search_id, user_id, xhs_tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    article.title,
    article.content,
    article.markdown_content || null,
    article.coverImage || '',
    JSON.stringify(article.images || []),
    article.source || '',
    article.sourceInsightId || null,
    article.sourceSearchId || null,
    article.userId,
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
    markdown_content?: string;
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
  if (updates.markdown_content !== undefined) {
    fields.push('markdown_content = ?');
    values.push(updates.markdown_content);
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
  if (userId !== undefined) {
    stmt.run(id, userId);
  } else {
    stmt.run(id);
  }
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
  if (userId !== undefined) {
    stmt.run(id, userId);
  } else {
    stmt.run(id);
  }
}

// 批量删除文章
export function batchDeleteArticles(ids: number[], userId: number): { success: number; failed: number } {
  let success = 0;
  let failed = 0;

  const deleteStmt = db.prepare('DELETE FROM articles WHERE id = ? AND user_id = ?');
  const checkStmt = db.prepare('SELECT id FROM articles WHERE id = ? AND user_id = ?');

  const batchDelete = db.transaction((articleIds: number[]) => {
    for (const id of articleIds) {
      const exists = checkStmt.get(id, userId);
      if (exists) {
        deleteStmt.run(id, userId);
        success++;
      } else {
        failed++;
      }
    }
  });

  batchDelete(ids);
  return { success, failed };
}

// 批量归档文章
export function batchArchiveArticles(ids: number[], userId: number): { success: number; failed: number } {
  let success = 0;
  let failed = 0;

  const archiveStmt = db.prepare(
    "UPDATE articles SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?"
  );
  const checkStmt = db.prepare('SELECT id FROM articles WHERE id = ? AND user_id = ?');

  const batchArchive = db.transaction((articleIds: number[]) => {
    for (const id of articleIds) {
      const exists = checkStmt.get(id, userId);
      if (exists) {
        archiveStmt.run(id, userId);
        success++;
      } else {
        failed++;
      }
    }
  });

  batchArchive(ids);
  return { success, failed };
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
export function getTopicInsightsBySearchIdOrdered(searchId: number, userId?: number): TopicInsightRecord[] {
  const stmt = userId
    ? db.prepare(`
      SELECT ti.*
      FROM topic_insights ti
      JOIN search_records sr ON ti.search_id = sr.id
      WHERE ti.search_id = ? AND sr.user_id = ?
      ORDER BY ti.created_at DESC
    `)
    : db.prepare('SELECT * FROM topic_insights WHERE search_id = ? ORDER BY created_at DESC');
  return userId
    ? (stmt.all(searchId, userId) as TopicInsightRecord[])
    : (stmt.all(searchId) as TopicInsightRecord[]);
}

// ============ 仪表盘统计函数 ============

// 获取总体统计数据（包含趋势）
export interface DashboardStats {
  totalAnalysis: number;
  totalArticles: number;
  publishedArticles: number;
  pendingArticles: number;
  // 趋势百分比（本周 vs 上周）
  analysisTrend: number;
  articlesTrend: number;
  publishedTrend: number;
  pendingTrend: number;
}

// 计算趋势百分比的辅助函数
function calculateTrend(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 100);
}

export function getDashboardStats(userId?: number): DashboardStats {
  // 总数统计
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

  // 本周数据（最近7天）
  const thisWeekAnalysisStmt = userId
    ? db.prepare("SELECT COUNT(*) as count FROM search_records WHERE user_id = ? AND created_at >= DATE('now', '-7 days')")
    : db.prepare("SELECT COUNT(*) as count FROM search_records WHERE created_at >= DATE('now', '-7 days')");
  const thisWeekArticlesStmt = userId
    ? db.prepare("SELECT COUNT(*) as count FROM articles WHERE user_id = ? AND created_at >= DATE('now', '-7 days')")
    : db.prepare("SELECT COUNT(*) as count FROM articles WHERE created_at >= DATE('now', '-7 days')");
  const thisWeekPublishedStmt = userId
    ? db.prepare("SELECT COUNT(*) as count FROM articles WHERE status = 'published' AND user_id = ? AND updated_at >= DATE('now', '-7 days')")
    : db.prepare("SELECT COUNT(*) as count FROM articles WHERE status = 'published' AND updated_at >= DATE('now', '-7 days')");

  // 上周数据（7-14天前）
  const lastWeekAnalysisStmt = userId
    ? db.prepare("SELECT COUNT(*) as count FROM search_records WHERE user_id = ? AND created_at >= DATE('now', '-14 days') AND created_at < DATE('now', '-7 days')")
    : db.prepare("SELECT COUNT(*) as count FROM search_records WHERE created_at >= DATE('now', '-14 days') AND created_at < DATE('now', '-7 days')");
  const lastWeekArticlesStmt = userId
    ? db.prepare("SELECT COUNT(*) as count FROM articles WHERE user_id = ? AND created_at >= DATE('now', '-14 days') AND created_at < DATE('now', '-7 days')")
    : db.prepare("SELECT COUNT(*) as count FROM articles WHERE created_at >= DATE('now', '-14 days') AND created_at < DATE('now', '-7 days')");
  const lastWeekPublishedStmt = userId
    ? db.prepare("SELECT COUNT(*) as count FROM articles WHERE status = 'published' AND user_id = ? AND updated_at >= DATE('now', '-14 days') AND updated_at < DATE('now', '-7 days')")
    : db.prepare("SELECT COUNT(*) as count FROM articles WHERE status = 'published' AND updated_at >= DATE('now', '-14 days') AND updated_at < DATE('now', '-7 days')");

  // 获取数据
  const totalAnalysis = (userId ? (analysisStmt.get(userId) as { count: number }) : (analysisStmt.get() as { count: number })).count;
  const totalArticles = (userId ? (articlesStmt.get(userId) as { count: number }) : (articlesStmt.get() as { count: number })).count;
  const publishedArticles = (userId ? (publishedStmt.get(userId) as { count: number }) : (publishedStmt.get() as { count: number })).count;
  const pendingArticles = (userId ? (pendingStmt.get(userId) as { count: number }) : (pendingStmt.get() as { count: number })).count;

  const thisWeekAnalysis = (userId ? (thisWeekAnalysisStmt.get(userId) as { count: number }) : (thisWeekAnalysisStmt.get() as { count: number })).count;
  const thisWeekArticles = (userId ? (thisWeekArticlesStmt.get(userId) as { count: number }) : (thisWeekArticlesStmt.get() as { count: number })).count;
  const thisWeekPublished = (userId ? (thisWeekPublishedStmt.get(userId) as { count: number }) : (thisWeekPublishedStmt.get() as { count: number })).count;

  const lastWeekAnalysis = (userId ? (lastWeekAnalysisStmt.get(userId) as { count: number }) : (lastWeekAnalysisStmt.get() as { count: number })).count;
  const lastWeekArticles = (userId ? (lastWeekArticlesStmt.get(userId) as { count: number }) : (lastWeekArticlesStmt.get() as { count: number })).count;
  const lastWeekPublished = (userId ? (lastWeekPublishedStmt.get(userId) as { count: number }) : (lastWeekPublishedStmt.get() as { count: number })).count;

  return {
    totalAnalysis,
    totalArticles,
    publishedArticles,
    pendingArticles,
    analysisTrend: calculateTrend(thisWeekAnalysis, lastWeekAnalysis),
    articlesTrend: calculateTrend(thisWeekArticles, lastWeekArticles),
    publishedTrend: calculateTrend(thisWeekPublished, lastWeekPublished),
    pendingTrend: 0, // 待处理数量的趋势意义不大，设为0
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

// 合并的仪表盘数据查询（减少数据库往返）
export interface DashboardData {
  stats: DashboardStats;
  trend: DailyAnalysis[];
  statusDistribution: StatusDistribution[];
  topKeywords: KeywordRank[];
  recentActivities: RecentActivity[];
}

export function getAllDashboardData(userId: number, days: number = 7, keywordLimit: number = 10, activityLimit: number = 10): DashboardData {
  // 使用事务确保数据一致性
  const getData = db.transaction(() => {
    return {
      stats: getDashboardStats(userId),
      trend: getAnalysisTrend(days, userId),
      statusDistribution: getArticleStatusDistribution(userId),
      topKeywords: getTopKeywords(keywordLimit, userId),
      recentActivities: getRecentActivities(activityLimit, userId),
    };
  });

  return getData();
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
