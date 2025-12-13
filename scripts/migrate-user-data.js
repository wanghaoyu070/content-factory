#!/usr/bin/env node
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(process.cwd(), 'data', 'content-factory.db');
const db = new Database(dbPath);

function ensureFirstUser() {
  const row = db.prepare('SELECT id FROM users ORDER BY id ASC LIMIT 1').get();
  if (row?.id) {
    return row.id;
  }
  const stmt = db.prepare(
    'INSERT INTO users (github_id, github_login, name, email, role) VALUES (?, ?, ?, ?, ?)' 
  );
  const result = stmt.run(
    `seed-admin-${Date.now()}`,
    'seed-admin',
    'Seed Admin',
    null,
    'admin'
  );
  console.log('创建了占位管理员用户，ID =', result.lastInsertRowid);
  return result.lastInsertRowid;
}

function run() {
  const userId = ensureFirstUser();

  const migrateTable = (table, column = 'user_id') => {
    try {
      const info = db.prepare(`PRAGMA table_info(${table})`).all();
      const hasColumn = info.some((col) => col.name === column);
      if (!hasColumn) {
        console.log(`表 ${table} 缺少 ${column} 列，跳过`);
        return;
      }
      const result = db.prepare(
        `UPDATE ${table} SET ${column} = ? WHERE ${column} IS NULL OR ${column} = 0`
      ).run(userId);
      console.log(`表 ${table} 已迁移 ${result.changes} 条记录`);
    } catch (error) {
      console.error(`迁移表 ${table} 失败:`, error.message);
    }
  };

  migrateTable('search_records');
  migrateTable('articles');
  migrateTable('settings');

  console.log('数据迁移完成，所有记录已归属用户 ID =', userId);
}

run();
