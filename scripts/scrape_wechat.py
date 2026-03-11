#!/usr/bin/env python3
"""
WeChat Article Scraper — called by Node.js via child_process.

Usage:
  python3 scrape_wechat.py <url>

Output:
  JSON to stdout with { title, text, images[], html_length }

Notes:
  - Scrapling's .text returns empty for WeChat's nested <span> structure
  - Must use html_content + regex tag stripping (see Global Rules)
  - Images use data-src attribute (CDN: mmbiz.qpic.cn)
"""

import sys
import re
import json


def scrape(url: str) -> dict:
    from scrapling.fetchers import StealthyFetcher

    page = StealthyFetcher.fetch(url, headless=True, network_idle=True)

    # Extract title
    title = ""
    title_el = page.css("h1#activity-name")
    if title_el:
        # WeChat title also needs html_content extraction
        raw = (
            title_el[0].html_content
            if hasattr(title_el[0], "html_content")
            else str(title_el[0])
        )
        title = re.sub(r"<[^>]+>", "", raw).strip()

    # Extract content — must use html_content due to WeChat nested span quirk
    text = ""
    content_el = page.css("#js_content")
    if content_el:
        inner = (
            content_el[0].html_content
            if hasattr(content_el[0], "html_content")
            else str(content_el[0])
        )
        # Strip HTML tags, normalize whitespace
        text = re.sub(r"<[^>]+>", "\n", inner)
        text = re.sub(r"\n{3,}", "\n\n", text)
        text = "\n".join(line.strip() for line in text.split("\n") if line.strip())

    # Extract images — use data-src (WeChat lazy loading)
    images = []
    img_els = page.css("#js_content img")
    for img in img_els:
        src = img.attrib.get("data-src", img.attrib.get("src", ""))
        if src and not src.startswith("data:"):
            images.append(src)

    return {
        "title": title,
        "text": text,
        "images": images,
        "html_length": len(
            content_el[0].html_content if content_el and hasattr(content_el[0], "html_content") else ""
        ),
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: scrape_wechat.py <url>"}))
        sys.exit(1)

    url = sys.argv[1]
    try:
        result = scrape(url)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False))
        sys.exit(1)
