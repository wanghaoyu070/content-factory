#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dbPath = path.join(process.cwd(), 'data', 'content-factory.db');
const db = new Database(dbPath);
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const skipBackup = args.has('--skip-backup');

function createBackup() {
  if (skipBackup || dryRun) {
    return;
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = dbPath.replace(/\.db$/, `.backup-${timestamp}.db`);
  fs.copyFileSync(dbPath, backupPath);
  console.log('已创建数据库备份:', backupPath);
}

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
  if (dryRun) {
    console.log('[dry-run] 将创建占位管理员用户，ID =', result.lastInsertRowid);
  } else {
    console.log('创建了占位管理员用户，ID =', result.lastInsertRowid);
  }
  return result.lastInsertRowid;
}

function run() {
  const migrateCore = () => {
    const userId = ensureFirstUser();

    const migrateTable = (table, column = 'user_id') => {
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
    };

    migrateTable('search_records');
    migrateTable('articles');
    migrateTable('settings');

    console.log('数据迁移完成，所有记录已归属用户 ID =', userId);
  };

  try {
    if (dryRun) {
      db.exec('BEGIN IMMEDIATE');
      migrateCore();
      db.exec('ROLLBACK');
      console.log('[dry-run] 已回滚所有变更');
      return;
    }

    createBackup();
    const tx = db.transaction(() => {
      migrateCore();
    });
    tx();
  } catch (error) {
    if (dryRun) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // no-op
      }
    }
    console.error('迁移失败，已回滚事务:', error.message);
    process.exitCode = 1;
  }
}

run();
