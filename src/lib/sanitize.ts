import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u',
  'a', 'img',
  'ul', 'ol', 'li',
  'blockquote',
  'figure', 'figcaption',
  'br', 'hr',
  'table', 'thead', 'tbody', 'tr', 'td', 'th',
  'span', 'div', 'section',
  'pre', 'code',
];

const ALLOWED_ATTR = [
  'href', 'src', 'alt', 'class', 'style', 'id',
  'target', 'rel',
];

/**
 * Sanitize HTML content, allowing safe formatting tags.
 * Use for article content rendered via dangerouslySetInnerHTML.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}

/**
 * Escape a string for safe insertion into an HTML template.
 * Use for values interpolated into HTML strings (titles, alt text, URLs).
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
