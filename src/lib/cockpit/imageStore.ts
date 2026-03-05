// In-memory image reference store
// Maps short IDs to Base64 data URLs to keep the editor buffer clean

const imageMap = new Map<string, string>();
let counter = 0;

// Generate a short, unique ID
function generateId(): string {
    counter++;
    const timestamp = Date.now().toString(36);
    const count = counter.toString(36);
    return `${timestamp}-${count}`;
}

/**
 * Store a Base64 data URL and return a short reference URL.
 * Format: blob:img/<id>.<ext>
 */
export function addImage(dataUrl: string): string {
    // Extract image format from data URL
    const typeMatch = dataUrl.match(/^data:image\/(\w+);/);
    const ext = typeMatch ? typeMatch[1] : 'png';

    const id = generateId();
    const refUrl = `blob:img/${id}.${ext}`;

    imageMap.set(refUrl, dataUrl);
    return refUrl;
}

/**
 * Resolve a blob:img/ reference URL back to its Base64 data URL.
 * Returns the original URL if not found in the store.
 */
export function resolveImage(refUrl: string): string {
    return imageMap.get(refUrl) || refUrl;
}

/**
 * Check if a URL is a blob:img/ reference.
 */
export function isImageRef(url: string): boolean {
    return url.startsWith('blob:img/');
}

/**
 * Replace all blob:img/ references in an HTML string with their Base64 data URLs.
 * Used by the rendering pipeline and WeChat export.
 */
export function resolveAllImageRefs(html: string): string {
    return html.replace(/blob:img\/[a-z0-9]+-[a-z0-9]+\.\w+/g, (match) => {
        return resolveImage(match);
    });
}

/**
 * Replace all blob:img/ references in a Markdown string with their Base64 data URLs.
 * Used before markdown rendering.
 */
export function resolveMarkdownImageRefs(markdown: string): string {
    return markdown.replace(/blob:img\/[a-z0-9]+-[a-z0-9]+\.\w+/g, (match) => {
        return resolveImage(match);
    });
}

/**
 * Get the current count of stored images.
 */
export function getImageCount(): number {
    return imageMap.size;
}
