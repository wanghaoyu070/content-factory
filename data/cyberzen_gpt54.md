# GPT-5.4：OpenAI 有史以来最强的「职业级」模型，7 小时前刚刚发布

> 今天凌晨，OpenAI 正式发布了 GPT-5.4。一个融合了编码、推理、操控计算机三位一体的前沿模型。它不再只是"会写代码的 AI"——它是能替你做完整个工作流的 AI。

---

## 不是升级，是合并

GPT-5.4 的定位很清晰：**把之前分散在多个模型里的能力，合成一个**。

具体来说，它把 GPT-5.3-Codex 的编码能力（之前独立发布的代码专精模型）和 GPT-5.2 的推理能力整合到了一起，同时加入了**原生计算机操控（Computer Use）**能力。

这意味着什么？以前你可能需要 5.3 写代码、5.2 做分析、再用第三方工具操作浏览器。现在一个模型全干了。

![OpenAI 官方 GPT-5.4 发布页面首屏](https://storage.googleapis.com/firecrawl-scrape-media/screenshot-42575d0b-b0e6-4055-bbf7-38255cb4aac9.png?GoogleAccessId=scrape-bucket-accessor%40firecrawl.iam.gserviceaccount.com&Expires=1773371839&Signature=O4HD%2FW91%2FpOGYzY9goL0mhYNWm1GLGIW9LX9jwfkfT%2B%2FjdN9%2FWZE5fOtkJp2rAxb9gGOjJCrIqd3LunIxgxGLe0FLKErkyOT7bx8afJ7ya2a951yQtj4P7HbTXVr%2Fvwg%2BB6OzL2mzT%2FPMw62ElgV4w6fB28mmYgcvsSvLb1ok61qK4LmjmrejK5dNQJadcessgSgUiYouvDGvzEz2%2BB9102D5xeKEvJ2vfJnXqMVzHU1sU6utxBaHW0CrqQtpg64dZJ6B%2FeqgGKKFrbTZpkHOWNdNXIAaauQZauzwPvcSrAQwsDlfzCIg0rOGzVNzRmzhM1C0JbnO3wYmWHxMPVm9g%3D%3D)

---

## 几个真正重要的数字

别被满屏的 benchmark 数据淹没了。这几个才是真正值得关注的：

**1. 知识工作：83% 超越人类专业水平**

在 GDPval 测试中（覆盖 44 种职业的真实工作任务），GPT-5.4 的输出在 83% 的对比中达到或超过了行业专家水平。上一代 GPT-5.2 是 70.9%。

这个测试不是做选择题，而是让 AI 完成从销售演示文稿到医院排班表到制造流程图这些**真正的工作成果**。

**2. 计算机操控：75% 成功率，超越人类的 72.4%**

在 OSWorld 测试中（让 AI 通过截屏和键鼠操作来使用桌面软件），GPT-5.4 拿到了 75.0%，不仅远超 GPT-5.2 的 47.3%，甚至超过了人类测试者的 72.4%。

**3. Token 效率：省 47%**

这个才是开发者最关心的。在 MCP Atlas 基准测试中，使用 Tool Search 功能后，总 token 消耗降低了 47%。单价虽然涨了（$2.50 vs $1.75/百万输入 token），但总费用反而可能更低。

![GPT-5.4 benchmark 数据对比](https://storage.googleapis.com/firecrawl-scrape-media/screenshot-ec4c7930-b9ab-44f8-8d21-da601fa21fd6.png?GoogleAccessId=scrape-bucket-accessor%40firecrawl.iam.gserviceaccount.com&Expires=1773371853&Signature=dg1Grrc52prjdhE%2F1dUC7M3uUJ7pIRfC3D7hB7yMCeglMZCPfi9oqcAF7WCnQ8wBbcimu%2B6q3db1oAXDz%2BsUWoWlbDOrjJ5oNFagNpo2Xud5ik3Al%2FvLtUccZQXHZ5xEVDxWeC%2F%2F11Y05YsgkjX7XnXCzzhPgVFpmkj%2BiUJ2U22tLyQZgYiFZzSdBYsMYDkPOdrE%2FmUX8S7yBj71%2BhaLom1HVZV5SBI%2FqTHRRmysRBsm%2Fv3QkJD6CtcQqy35sX28Eb%2B1XjNXu6%2B0MP1ZROsRkVfPs2NyED5eNCeMBftxG5BT%2F%2FaDaLzqsyRvm%2FlHnUbuJeIgAxbbna643PRqU5%2FbHA%3D%3D)

---

## Computer Use：从"会写代码"到"会用电脑"

这是 GPT-5.4 最颠覆性的能力。

之前的 AI 编码助手本质上是个文本处理器——你告诉它需求，它吐代码。但 GPT-5.4 可以**直接操作浏览器、点击按钮、填写表单、在不同应用之间切换**。

OpenAI 在发布会上展示了一个让人印象深刻的案例：GPT-5.4 解析浏览器截屏，通过坐标点击操作 Gmail、Google Calendar 等应用——视频没有加速。

更疯狂的是，他们发布了一个叫 **Playwright (Interactive)** 的 Codex Skill：AI 在写前端代码的同时，可以**自己打开浏览器测试自己写的应用**。

OpenAI 放出的演示是一个完整的主题公园模拟游戏——等距视角、游客AI、排队系统、清洁度管理——全部由一段 Prompt 生成，然后 GPT-5.4 自己用 Playwright 做自动化测试。

---

## Tool Search：解决"工具太多"的问题

这是个容易被忽略但极其实用的新特性。

之前在 API 中给模型注册工具时，**所有工具定义都会被塞进 Prompt**。如果你有 36 个 MCP Server，光工具定义可能就要吃掉上万 token。

GPT-5.4 引入了 **Tool Search**：模型只拿到一个轻量级的工具清单。需要用具体工具时，再按需查询该工具的定义。

> "在 MCP Atlas 的 250 个任务测试中，使用 Tool Search 后，总 token 消耗降低了 47%，准确率保持不变。"
> — OpenAI 官方数据

这对做 Agent 开发的团队来说是巨大的利好。MCP 生态里动辄几十个 Server，之前每次请求都要带上所有定义，既慢又贵。

---

## 思维透明化：可以中途改方向

GPT-5.4 Thinking 的另一个重要改进：**思考过程可引导**。

模型在处理复杂问题时，会先输出一个"计划大纲（Preamble）"，你可以在它思考的过程中插入新的指令，调整方向。这样就不用等它跑完几千个 token 后发现方向不对，再重来一轮。

这种设计哲学和 Codex 在开始编码前先列出 plan 是一脉相承的。

---

## 定价：更贵，但可能更省

| 模型 | 输入价格 | 缓存输入 | 输出价格 |
| --- | --- | --- | --- |
| GPT-5.2 | $1.75/M | $0.175/M | $14/M |
| **GPT-5.4** | **$2.50/M** | **$0.25/M** | **$15/M** |
| GPT-5.2 Pro | $21/M | — | $168/M |
| **GPT-5.4 Pro** | **$30/M** | — | **$180/M** |

单价确实涨了 43%。但 OpenAI 强调 GPT-5.4 是"最省 token 的推理模型"——同样的任务用更少的 token 完成。具体能不能省钱，取决于你的用例。

Codex 里新增了 `/fast` 模式，同模型速度提升 1.5x。API 用户可以用 Priority Processing 获得同样的加速。

---

## 行业反应

> "GPT-5.4 是我们用过的最好的模型。它在我们的 APEX-Agents 基准上名列前茅。"
> — Brendan Foody, Mercor CEO

> "在我们的内部基准测试中，GPT-5.4 的工程师反馈是：比之前的模型更自然、更果断。它不会在模糊问题上反复犹豫。"
> — Lee Robinson, Cursor 开发者教育 VP

> "在我们对约 3 万个 HOA 和房产税门户的评估中，GPT-5.4 首次尝试就达到了 95% 的成功率，三次以内达到 100%。"
> — Dod Fraser, Mainstay CEO

---

## 这对开发者意味着什么

GPT-5.4 最大的影响不是某个单一能力的提升，而是**边界的模糊化**：

1. **编码 + 操控**：AI 不仅能写代码，还能自己运行、测试、调试
2. **推理 + 工具调用**：模型能在几十个工具中自动选择和使用正确的那个
3. **1M token 上下文**：真正的长周期任务成为可能

对于做 AI Agent 的团队来说，这基本上是对"全自动化工作流"可行性的一次重大验证。

GPT-5.2 将在 3 个月后（2026 年 6 月 5 日）退役。如果你的产品还在用 5.2，是时候开始迁移了。
