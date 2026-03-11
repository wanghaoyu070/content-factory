# Mock 回退策略

目标：在开发环境保证可用性，在生产环境避免“假成功”。

## 当前统一规则
- 由 `src/lib/mock-policy.ts` 统一判断：
  - `canUseMockFallback()`
  - `isPlaceholderEndpoint()`
- 规则如下：
  1. 开发环境默认允许 Mock 回退。
  2. 生产环境默认不允许 Mock 回退。
  3. 生产环境仅在 `ALLOW_MOCK_DATA_FALLBACK=true` 时允许 Mock 回退。

## 已接入该策略的模块
- `src/app/api/wechat-articles/route.ts`
- `src/app/api/wechat-articles-by-account/route.ts`
- `src/lib/analysis-service.ts`

## 生产环境建议
- 默认：`ALLOW_MOCK_DATA_FALLBACK=false`
- 只有在演示环境或紧急兜底时才临时开启。
- 开启期间要在管理后台或日志中显式标注“当前返回数据可能为 Mock”。

## 发布前检查清单
- [ ] 核心外部 API 已配置真实可用 endpoint 与 key。
- [ ] 生产环境 `ALLOW_MOCK_DATA_FALLBACK` 为 `false`。
- [ ] 监控中可区分 `source=api` 与 `source=mock`。
