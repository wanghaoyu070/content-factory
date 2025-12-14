---
description: 部署 Content Factory 到云服务器
---

# Content Factory 部署工作流

## 快速部署命令

在本地执行以下命令即可完成代码推送和远程部署：

```bash
cd ~/Desktop/content-factory
git add -A && git commit -m "update" && git push && ssh -i ~/.ssh/content-factory-deploy root@124.156.194.32 "cd ~/content-factory && git pull && docker build -t content-factory . && docker stop content-factory && docker rm content-factory && docker run -d --name content-factory -p 3001:3000 -v \$(pwd)/data:/app/data --env-file .env.local --restart unless-stopped content-factory"
```

## 分步操作

### 1. 推送代码到 GitHub
// turbo
```bash
cd ~/Desktop/content-factory
git add -A && git commit -m "update" && git push
```

### 2. SSH 连接到云服务器并部署
```bash
ssh -i ~/.ssh/content-factory-deploy root@124.156.194.32 "cd ~/content-factory && git pull && docker build -t content-factory . && docker stop content-factory && docker rm content-factory && docker run -d --name content-factory -p 3001:3000 -v \$(pwd)/data:/app/data --env-file .env.local --restart unless-stopped content-factory"
```

## 仅更新代码（不重建 Docker 镜像）

如果只是更新了前端代码，可以只拉取代码然后重启：

```bash
ssh -i ~/.ssh/content-factory-deploy root@124.156.194.32 "cd ~/content-factory && git pull && docker restart content-factory"
```

## 查看服务器日志

```bash
ssh -i ~/.ssh/content-factory-deploy root@124.156.194.32 "docker logs content-factory --tail 50"
```

## 服务器信息

- **服务器 IP**: 124.156.194.32
- **应用端口**: 3001 (映射到容器内 3000)
- **访问地址**: https://content.hyxs.online
- **SSH 密钥**: ~/.ssh/content-factory-deploy
