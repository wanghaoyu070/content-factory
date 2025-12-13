---
description: 重启 Content Factory 服务
---

# 重启服务

请执行以下命令重启服务：

```bash
ssh root@124.156.194.32 "pm2 restart content-factory && pm2 status"
```

然后告诉用户服务已重启，并显示当前状态。
