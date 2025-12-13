---
description: 查看 Content Factory 应用日志
---

# 查看应用日志

请执行以下命令查看最近的应用日志：

```bash
ssh root@124.156.194.32 "pm2 logs content-factory --lines 50 --nostream"
```

然后分析日志内容，告诉用户：
1. 是否有错误信息
2. 最近的请求情况
3. 如果有问题，给出解决建议
