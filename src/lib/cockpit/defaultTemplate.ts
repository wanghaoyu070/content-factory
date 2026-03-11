/**
 * Default article template — shown when the editor opens with no content.
 * Ported from the Deep Read Cockpit Studio welcome article.
 */
export const DEFAULT_ARTICLE_TEMPLATE = `# Cockpit Studio — 公众号排版大师

![2026 牛马贺新春](/default-hero.jpeg)

> 欢迎使用 Cockpit Studio，一款专为 **微信公众号** 与 **内容创作者** 设计的现代 Markdown 排版引擎！

---

## 核心功能

### 1. 魔法粘贴

- **跨平台粘贴**：直接从**飞书**、**Notion**、**Word** 甚至任意网页复制富文本，粘贴瞬间自动转换为纯净 Markdown
- **智能清洗**：自动剥离冗余样式和乱码，只保留段落、粗体、列表、代码块等核心结构
- **零学习成本**：不需要会写 Markdown，粘贴进来就能用
- **图片直贴**：支持直接粘贴截图或剪贴板图片（Ctrl/Cmd + V），自动插入 Markdown 图片

### 2. 多图排版

支持朋友圈式的多列网格布局，比如下面自然形成的两图并排，通过 \`wechatCompat\` 引擎这些图也能在微信中完美呈现：

![山脉风光](https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop)
![森林晨雾](https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&h=400&fit=crop)

> 💡 **提示**：连续排列多张图片，Cockpit 会自动生成并排布局，在微信中也能完美显示。

### 3. 主题切换

点击顶部工具栏的主题按钮，可以在多套精心设计的排版主题之间自由切换：

| 主题名称 | 风格特点 | 适用场景 |
| :--- | :--- | :--- |
| **Classic** | 经典简约，黑金配色 | 知识分享、技术文章 |
| **Modern** | 现代设计感，居中排版 | 产品介绍、品牌故事 |
| **Extra** | 深色科技风 | 科技评论、开发者社区 |

### 4. 代码高亮

支持多种编程语言的代码块语法高亮，复制到微信后样式保持一致：

\`\`\`javascript
// Welcome to Cockpit Studio!
const features = ['魔法粘贴', '多图排版', '主题切换', '代码高亮'];

features.forEach((feature, index) => {
  console.log(\`✨ 功能 \${index + 1}: \${feature}\`);
});
\`\`\`

\`\`\`python
# Python 也完全支持
def generate_article(topic: str) -> str:
    """AI 驱动的文章生成"""
    return f"一篇关于 {topic} 的精彩文章"
\`\`\`

### 5. 丰富的排版元素

#### 引用块

> 好的排版不是让读者注意到设计，而是让读者沉浸在内容中。
> — 排版设计原则

#### 有序列表

1. 在左侧编辑器中书写 Markdown
2. 右侧实时预览排版效果
3. 切换主题查看不同风格
4. 点击「复制微信」一键导出
5. 粘贴到微信公众号后台，完成！

#### 强调与标记

可以使用 **加粗**、*斜体*、\`行内代码\` 和 ~~删除线~~ 来丰富你的内容表达。

### 6. 一键复制到微信

点击右上角 **「复制微信」** 按钮，文章会自动：

1. 将所有外链图片转为 **Base64**（绕过微信第三方图片限制）
2. 将 CSS 样式 **内联** 到 HTML 元素上（保证微信兼容）
3. 通过 **Clipboard API** 写入剪贴板
4. 直接粘贴到微信编辑器即可，所见即所得！

---

## 快速上手

| 快捷键 | 功能 |
| :--- | :--- |
| \`Ctrl/Cmd + B\` | 加粗 |
| \`Ctrl/Cmd + K\` | 插入链接 |
| \`Ctrl/Cmd + Z\` | 撤销 |
| \`Ctrl/Cmd + Shift + Z\` | 重做 |
| \`Ctrl/Cmd + V\` | 智能粘贴（自动转 Markdown） |

---

> 🚀 **开始创作**：选中这段模板内容，按 \`Ctrl/Cmd + A\` 全选，然后删除，开始你的写作之旅！
`;
