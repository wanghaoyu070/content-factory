/**
 * Quick integration test for the screenshot service.
 * Run from project root: npx tsx scripts/test_screenshot.ts
 */

import { captureScreenshots, insertScreenshotsIntoMarkdown } from '../src/lib/screenshot';

const suggestions = [
    {
        url: 'https://openai.com/index/introducing-gpt-5-4/',
        target: 'GPT-5.4 announcement hero section',
        scrollTo: 'Introducing GPT-5.4',
        captureType: 'element' as const,
        insertAfterParagraph: 2,
    },
    {
        url: 'https://openai.com/index/introducing-gpt-5-4/',
        target: 'GPT-5.4 benchmark performance data',
        scrollTo: 'GDPval',
        captureType: 'element' as const,
        insertAfterParagraph: 5,
    },
];

async function main() {
    console.log('🔍 Starting screenshot test...\n');

    const results = await captureScreenshots(suggestions);

    console.log(`\n✅ Captured ${results.length} screenshots:`);
    for (const r of results) {
        const sizeKb = Math.round(r.base64.length * 0.75 / 1024);
        console.log(`  - "${r.alt}" (${sizeKb} KB, insert after paragraph ${r.insertAfterParagraph})`);
    }

    // Test markdown insertion
    const testMarkdown = 'Paragraph 1.\n\nParagraph 2.\n\nParagraph 3.\n\nParagraph 4.\n\nParagraph 5.\n\nParagraph 6.';
    const withImages = insertScreenshotsIntoMarkdown(testMarkdown, results);

    // Show structure only
    const blocks = withImages.split('\n\n');
    console.log(`\n📝 Markdown structure after insertion (${blocks.length} blocks):`);
    for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].startsWith('![')) {
            console.log(`  [${i}] 📸 IMAGE: ${blocks[i].substring(2, 60)}...`);
        } else {
            console.log(`  [${i}] ${blocks[i]}`);
        }
    }
}

main().catch(console.error);
