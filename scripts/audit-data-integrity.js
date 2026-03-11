#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(process.cwd(), 'data', 'content-factory.db');
const db = new Database(dbPath, { readonly: true });

const checks = [
  {
    name: 'search_records_null_user',
    sql: 'SELECT COUNT(*) AS count FROM search_records WHERE user_id IS NULL OR user_id = 0',
  },
  {
    name: 'articles_null_user',
    sql: 'SELECT COUNT(*) AS count FROM articles WHERE user_id IS NULL OR user_id = 0',
  },
  {
    name: 'settings_null_user',
    sql: 'SELECT COUNT(*) AS count FROM settings WHERE user_id IS NULL OR user_id = 0',
  },
  {
    name: 'orphan_source_articles',
    sql: `
      SELECT COUNT(*) AS count
      FROM source_articles sa
      LEFT JOIN search_records sr ON sa.search_id = sr.id
      WHERE sr.id IS NULL
    `,
  },
  {
    name: 'orphan_article_summaries',
    sql: `
      SELECT COUNT(*) AS count
      FROM article_summaries s
      LEFT JOIN search_records sr ON s.search_id = sr.id
      WHERE sr.id IS NULL
    `,
  },
  {
    name: 'orphan_topic_insights',
    sql: `
      SELECT COUNT(*) AS count
      FROM topic_insights ti
      LEFT JOIN search_records sr ON ti.search_id = sr.id
      WHERE sr.id IS NULL
    `,
  },
  {
    name: 'favorites_without_owner_scope',
    sql: `
      SELECT COUNT(*) AS count
      FROM insight_favorites f
      LEFT JOIN topic_insights ti ON f.insight_id = ti.id
      LEFT JOIN search_records sr ON ti.search_id = sr.id
      WHERE ti.id IS NULL OR sr.id IS NULL OR f.user_id != sr.user_id
    `,
  },
];

let hasIssue = false;
for (const check of checks) {
  const row = db.prepare(check.sql).get();
  const count = Number(row?.count || 0);
  if (count > 0) {
    hasIssue = true;
    console.error(`[FAIL] ${check.name}: ${count}`);
  } else {
    console.log(`[PASS] ${check.name}: 0`);
  }
}

if (hasIssue) {
  process.exitCode = 1;
}
