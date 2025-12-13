---
description: 查看 Content Factory 服务器状态
---

# 查看服务状态

请执行以下命令查看服务器状态：

```bash
ssh root@124.156.194.32 "pm2 status && echo '---' && docker ps --format 'table {{.Names}}\t{{.Status}}' | grep nginx"
```

然后用简洁的方式告诉用户：
1. Content Factory 应用是否正常运行
2. Nginx 容器是否正常
