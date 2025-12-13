# 实现提示词 - 用户登录系统

> 将以下内容复制给 AI 助手，指导其完成用户登录系统的实现

---

## 提示词开始

你好，我需要你帮我在现有的 Next.js 项目中实现用户登录系统。

### 项目背景

这是一个名为「内容工厂」的 AI 内容创作平台，基于 Next.js 16 + React 19 + TypeScript + Tailwind CSS + SQLite（better-sqlite3）构建。

当前项目没有用户系统，所有数据是全局共享的。我需要添加用户登录功能，实现多用户数据隔离。

### 需求文档位置

请先阅读以下文档了解完整需求：

1. **`docs/PRD.md`** - 完整需求文档，包含功能描述、数据库设计、流程图
2. **`docs/Backlog.md`** - 任务清单，包含 38 个任务和依赖关系
3. **`docs/Decision-Log.md`** - 决策日志，记录了所有技术和产品决策

### 核心需求概述

1. **GitHub OAuth 登录**：使用 NextAuth.js 实现 GitHub 第三方登录
2. **邀请码注册**：新用户需要邀请码才能注册（第一个用户除外）
3. **第一用户特殊处理**：第一个注册的用户无需邀请码，自动成为管理员
4. **数据隔离**：每个用户只能看到自己的文章、搜索记录、API 配置
5. **管理员后台**：`/admin` 页面，管理员可以生成和管理邀请码
6. **UI 改造**：
   - 右上角铃铛改为用户头像下拉菜单
   - 左下角显示真实用户信息
7. **访问控制**：未登录用户可以浏览，但执行操作时提示登录

### 技术选型

| 组件 | 选择 |
|------|------|
| 认证库 | NextAuth.js (Auth.js) v5 |
| 数据库 | SQLite（保持不变，使用 better-sqlite3） |
| Session | JWT + Cookie |

### 环境变量配置

项目需要配置以下环境变量（在 `.env.local` 文件中）：

```bash
NEXTAUTH_URL=https://content.hyxs.online
NEXTAUTH_SECRET=A+e2n3IYTMAnGZQe4+ziPNF1Giza6ZjMTuEyWOWr2s8=
GITHUB_ID=Ov23liTwAghUBdwg9Uns
GITHUB_SECRET=（用户自己配置，不要硬编码）
```

### 数据库改动

需要新增 2 张表，修改 3 张现有表：

**新增表：**
```sql
-- 用户表
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  github_id TEXT UNIQUE NOT NULL,
  github_login TEXT NOT NULL,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',  -- 'admin' 或 'user'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 邀请码表
CREATE TABLE invite_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  created_by INTEGER NOT NULL,
  used_by INTEGER,
  used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (used_by) REFERENCES users(id)
);
```

**修改现有表：**
- `articles` 表：添加 `user_id` 字段
- `search_records` 表：添加 `user_id` 字段
- `settings` 表：改为 `user_id + key` 复合主键

### 实现顺序建议

请按照 `docs/Backlog.md` 中的任务顺序实现，建议分阶段：

**阶段一（MVP）：**
1. 安装配置 NextAuth.js
2. 创建 users 和 invite_codes 表
3. 实现 GitHub OAuth 登录流程
4. 实现邀请码验证（第一用户跳过）
5. 创建登录页面 `/login`
6. 创建邀请码输入页面

**阶段二（数据隔离）：**
7. 给现有表添加 user_id 字段
8. 编写数据迁移脚本（现有数据归属第一用户）
9. 修改所有 API 添加用户过滤

**阶段三（访问控制）：**
10. 创建认证中间件
11. API 路由添加认证检查
12. 前端添加未登录提示

**阶段四（管理员后台）：**
13. 创建 `/admin` 页面
14. 实现邀请码生成和管理功能

**阶段五（UI 改造）：**
15. 实现右上角用户头像下拉菜单
16. 改造左下角用户区域
17. 移除铃铛图标

### 关键文件位置

- 数据库操作：`src/lib/db.ts`
- 配置管理：`src/lib/config.ts`
- 布局组件：`src/components/layout/Sidebar.tsx`、`src/components/layout/Header.tsx`
- API 路由：`src/app/api/`
- 页面：`src/app/`

### 注意事项

1. **保持代码风格一致**：参考现有代码的命名规范和组织方式
2. **不要破坏现有功能**：确保改动后原有功能正常工作
3. **数据迁移要谨慎**：迁移前备份数据库
4. **错误处理要完善**：所有错误都要有友好的中文提示
5. **TypeScript 类型**：确保类型定义完整，不要使用 any

### 验收标准

实现完成后，请确保以下功能正常：

1. [ ] 新用户可以通过 GitHub + 邀请码注册
2. [ ] 第一个用户无需邀请码，自动成为管理员
3. [ ] 已注册用户可以直接 GitHub 登录
4. [ ] 管理员可以在 /admin 生成邀请码
5. [ ] 用户只能看到自己的文章和配置
6. [ ] 未登录用户点击操作按钮提示登录
7. [ ] 右上角显示用户头像和下拉菜单
8. [ ] 退出登录后清除 session

### 开始实现

请先阅读 `docs/PRD.md` 了解完整需求，然后从 Backlog 的第一个任务开始实现。

如果有任何不清楚的地方，请先问我确认，不要自行假设。

---

## 提示词结束
