import { Theme } from './theme';

/**
 * 将 HTML 内容转换为简化的 Markdown
 * 注意：这是一个简化版，不处理所有 HTML 边缘情况
 */
export function htmlToMarkdown(html: string): string {
    if (!html) return '';

    let md = html;

    // 处理换行
    md = md.replace(/<br\s*\/?>/gi, '\n');

    // 处理标题
    md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
    md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
    md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');

    // 处理强调
    md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
    md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');

    // 处理段落
    md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');

    // 处理列表
    md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
    md = md.replace(/<\/?[uo]l[^>]*>/gi, '\n');

    // 处理引用
    md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n');

    // 处理代码
    md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
    md = md.replace(/\u003cpre[^\u003e]*\u003e([\s\S]*?)\u003c\/pre\u003e/gi, '```\\n$1\\n```\\n\\n');

    // 移除所有剩余的 HTML 标签
    md = md.replace(/<[^>]+>/g, '');

    // 处理 HTML 实体
    md = md.replace(/&nbsp;/g, ' ');
    md = md.replace(/&lt;/g, '<');
    md = md.replace(/&gt;/g, '>');
    md = md.replace(/&amp;/g, '&');
    md = md.replace(/&quot;/g, '"');

    // 清理多余空行
    md = md.replace(/\n{3,}/g, '\n\n');

    return md.trim();
}

/**
 * 将 Markdown 转换为带主题样式的 HTML
 */
export function markdownToThemedHtml(md: string, t: Theme): string {
    let html = md || '';

    // 1. 处理标题
    html = html.replace(/^### (.+)$/gm, `<h3 style="${t.h3}">$1</h3>`);
    html = html.replace(/^## (.+)$/gm, `<h2 style="${t.h2}">$1</h2>`);
    html = html.replace(/^# (.+)$/gm, `<h1>$1</h1>`);

    // 2. 处理强调
    html = html.replace(/\*\*(.+?)\*\*/g, `<strong style="${t.strong}">$1</strong>`);
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // 3. 处理代码
    html = html.replace(/```([\s\S]*?)```/g, `<pre style="${t.codeBlock}"><code>$1</code></pre>`);
    html = html.replace(/`([^`]+)`/g, `<code style="${t.inlineCode}">$1</code>`);

    // 4. 处理引用
    html = html.replace(/^> (.+)$/gm, `<blockquote style="${t.quote}">$1</blockquote>`);

    // 5. 处理列表
    html = html.replace(/^[\-\*] (.+)$/gm, `<li style="${t.li}">$1</li>`);
    html = html.replace(/(<\/li>)\s*\n+(\s*<li)/g, '$1\n$2');
    html = html.replace(/(<li[^>]*>[\s\S]*?<\/li>\n?)+/g, `<ul style="${t.ul}">$&</ul>`);

    // 6. 处理分割线
    html = html.replace(/^---$/gm, `<hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">`);

    // 7. 处理段落
    html = html.replace(/\n\n/g, `</p><p style="${t.p}">`);
    html = `<p style="${t.p}">` + html + '</p>';

    // 8. 修复嵌套问题
    html = html.replace(/<p[^>]*>\s*<(h[1-6]|ul|ol|blockquote|pre|div|hr)/g, '<$1');
    html = html.replace(/<\/(h[1-6]|ul|ol|blockquote|pre|div|hr)>\s*<\/p>/g, '</$1>');
    html = html.replace(/<p[^>]*>\s*<\/p>/g, '');

    // 9. 如果存在容器样式，包裹全部内容
    if (t.container) {
        html = `<section style="${t.container}">${html}</section>`;
    }

    return html;
}

/**
 * 直接将 HTML 内容转换为带主题样式的 HTML（用于预览）
 * 这是一个便捷函数，先转 Markdown 再渲染
 */
export function htmlToThemedHtml(html: string, theme: Theme): string {
    const markdown = htmlToMarkdown(html);
    return markdownToThemedHtml(markdown, theme);
}
