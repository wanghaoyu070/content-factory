---
description: 一键部署 Content Factory 到服务器
---

# 部署 Content Factory

请执行以下部署流程：

## 服务器信息
- IP: 124.156.194.32
- 用户: root
- 服务器项目路径: /opt/content-factory
- 本地项目路径: ~/Projects/content-factory

## 部署步骤

1. 先检查本地是否有未提交的更改：`git status`

2. 如果有更改，提交并推送：
```bash
cd ~/Projects/content-factory
git add .
git commit -m "$ARGUMENTS"
git push origin main
```
（如果用户没有提供提交信息，使用 "更新代码" 作为默认信息）

3. SSH 到服务器执行部署：
```bash
ssh root@124.156.194.32 "cd /opt/content-factory && git pull && npm install && npm run build && pm2 restart content-factory"
```

4. 验证部署成功：
```bash
ssh root@124.156.194.32 "pm2 status"
```

5. 告诉用户部署完成，网站地址：https://content.hyxs.online
