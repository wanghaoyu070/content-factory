const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..');
const dbPath = path.join(projectRoot, 'data', 'content-factory.db');
const db = new Database(dbPath);

const user = db.prepare('SELECT id FROM users LIMIT 1').get();
if (!user) { console.error('No user found'); process.exit(1); }

const content = fs.readFileSync(path.join(projectRoot, 'data', 'cyberzen_gpt54.md'), 'utf8');

const stmt = db.prepare(
    'INSERT INTO articles (title, content, markdown_content, cover_image, images, source, user_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);
const result = stmt.run(
    'GPT-5.4：OpenAI 有史以来最强的「职业级」模型，7 小时前刚刚发布',
    content, content, '', '[]', 'OpenAI · GPT-5.4 发布', user.id, 'draft'
);
console.log('Article ID:', result.lastInsertRowid);
console.log('Open: http://localhost:3000/articles/' + result.lastInsertRowid);
db.close();
