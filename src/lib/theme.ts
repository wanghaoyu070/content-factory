export type Theme = {
    container?: string;
    mainColor: string;
    h2: string;
    h3: string;
    p: string;
    strong: string;
    quote: string;
    li: string;
    ul: string;
    codeBlock: string;
    inlineCode: string;
    img: string;
};

export const WECHAT_THEMES: Record<string, Theme> = {
    '极客黑': {
        container: 'background-color: #1a1a1a; color: #cccccc; padding: 20px; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, Helvetica Neue, PingFang SC, Hiragino Sans GB, Microsoft YaHei, Arial, sans-serif;',
        mainColor: '#fa8c16',
        h2: 'display: inline-block; background: linear-gradient(90deg, #fa8c16, #d46b08); color: #fff; padding: 6px 16px; border-radius: 20px; font-size: 16px; margin: 40px 0 20px 0; font-weight: bold; letter-spacing: 1px;',
        h3: 'color: #fa8c16; border-left: 4px solid #fa8c16; padding-left: 12px; margin: 35px 0 15px; font-size: 17px; font-weight: bold; line-height: 1.4;',
        p: 'font-size: 15px; line-height: 1.8; color: #cccccc; margin-bottom: 24px; text-align: justify;',
        strong: 'color: #fa8c16; font-weight: bold; padding: 0 2px;',
        quote: 'background-color: #2b2b2b; border-left: 4px solid #fa8c16; color: #a0a0a0; padding: 16px; margin: 24px 0; font-size: 14px; line-height: 1.6; border-radius: 0 4px 4px 0;',
        li: 'margin-bottom: 10px; font-size: 15px; line-height: 1.8; color: #cccccc;',
        ul: 'margin: 0 0 24px 0; padding-left: 20px;',
        codeBlock: 'background:#141414; border: 1px solid #333; color:#e0e0e0; padding:15px; border-radius:5px; overflow-x:auto; font-size:13px; line-height:1.5; margin:15px 0; font-family:Menlo, Monaco, monospace;',
        inlineCode: 'background: rgba(30, 128, 255, 0.15); color: #5cabff; padding: 2px 6px; border-radius: 4px; font-family:Menlo, Monaco, monospace; font-size: 90%;',
        img: 'max-width: 100%; height: auto; display: block; margin: 24px auto; border-radius: 4px; border: 1px solid #333;'
    },
    '科技蓝': {
        mainColor: '#1e80ff',
        h2: 'font-size: 18px; font-weight: bold; color: #1e80ff; border-left: 4px solid #1e80ff; padding-left: 10px; margin: 30px 0 15px; line-height: 1.4;',
        h3: 'font-size: 16px; font-weight: bold; color: #333; margin: 24px 0 12px; line-height: 1.4;',
        p: 'font-size: 15px; line-height: 1.8; color: #333; margin-bottom: 20px; text-align: justify;',
        strong: 'color: #1e80ff; font-weight: bold; padding: 0 2px;',
        quote: 'background-color: #f8f8f8; border-radius: 6px; padding: 15px; color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0; border-left: 3px solid #1e80ff;',
        li: 'margin-bottom: 8px; font-size: 15px; line-height: 1.8; color: #333;',
        ul: 'margin: 0 0 20px 0; padding-left: 20px;',
        codeBlock: 'background:#f6f8fa; padding:15px; border-radius:5px; overflow-x:auto; font-size:13px; line-height:1.5; margin:15px 0; font-family:monospace;',
        inlineCode: 'background:#e8f4ff; padding:2px 5px; border-radius:3px; font-family:monospace; color:#1e80ff; font-size:90%;',
        img: 'max-width: 100%; height: auto; display: block; margin: 20px auto; border-radius: 6px; box-shadow: 0 4px 10px rgba(30,128,255,0.15);'
    },
    '微信绿': {
        mainColor: '#07c160',
        h2: 'font-size: 18px; font-weight: bold; color: #07c160; border-left: 4px solid #07c160; padding-left: 10px; margin: 28px 0 14px; line-height: 1.4;',
        h3: 'font-size: 16px; font-weight: bold; color: #333; margin: 22px 0 12px; line-height: 1.4;',
        p: 'font-size: 15px; line-height: 1.8; color: #3f3f3f; margin-bottom: 18px; text-align: justify;',
        strong: 'color: #07c160; font-weight: bold;',
        quote: 'background-color: #f0fff4; border-radius: 8px; padding: 14px; color: #555; font-size: 14px; line-height: 1.6; margin: 18px 0; border-left: 3px solid #07c160;',
        li: 'margin-bottom: 8px; font-size: 15px; line-height: 1.8; color: #3f3f3f;',
        ul: 'margin: 0 0 18px 0; padding-left: 20px;',
        codeBlock: 'background:#f6f8fa; padding:14px; border-radius:6px; overflow-x:auto; font-size:13px; line-height:1.5; margin:14px 0; font-family:monospace;',
        inlineCode: 'background:#e6ffed; padding:2px 5px; border-radius:3px; font-family:monospace; color:#07c160; font-size:90%;',
        img: 'max-width: 100%; height: auto; display: block; margin: 18px auto; border-radius: 8px; box-shadow: 0 3px 12px rgba(7,193,96,0.12);'
    },
    '活力橙': {
        mainColor: '#fa8c16',
        h2: 'font-size: 18px; font-weight: bold; color: #fa8c16; border-left: 4px solid #fa8c16; padding-left: 10px; margin: 28px 0 14px; line-height: 1.4;',
        h3: 'font-size: 16px; font-weight: bold; color: #333; margin: 22px 0 12px; line-height: 1.4;',
        p: 'font-size: 15px; line-height: 1.8; color: #333; margin-bottom: 18px; text-align: justify;',
        strong: 'color: #fa8c16; font-weight: bold;',
        quote: 'background-color: #fff7e6; border-radius: 8px; padding: 14px; color: #666; font-size: 14px; line-height: 1.6; margin: 18px 0; border-left: 3px solid #fa8c16;',
        li: 'margin-bottom: 8px; font-size: 15px; line-height: 1.8; color: #333;',
        ul: 'margin: 0 0 18px 0; padding-left: 20px;',
        codeBlock: 'background:#fffbe6; padding:14px; border-radius:6px; overflow-x:auto; font-size:13px; line-height:1.5; margin:14px 0; font-family:monospace;',
        inlineCode: 'background:#fff7e6; padding:2px 5px; border-radius:3px; font-family:monospace; color:#d46b08; font-size:90%;',
        img: 'max-width: 100%; height: auto; display: block; margin: 18px auto; border-radius: 8px; box-shadow: 0 3px 12px rgba(250,140,22,0.15);'
    }
};
