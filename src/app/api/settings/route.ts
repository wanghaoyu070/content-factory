import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getAllSettings, setSetting } from '@/lib/db';

// 从环境变量获取默认配置
function getEnvDefaults() {
  return {
    wechatArticle: {
      endpoint: process.env.WECHAT_ARTICLE_ENDPOINT || '',
      apiKey: process.env.WECHAT_ARTICLE_API_KEY || '',
    },
    wechatPublish: {
      endpoint: process.env.WECHAT_PUBLISH_ENDPOINT || '',
      apiKey: process.env.WECHAT_PUBLISH_API_KEY || '',
    },
    xiaohongshu: {
      endpoint: process.env.XIAOHONGSHU_PUBLISH_ENDPOINT || '',
      apiKey: process.env.XIAOHONGSHU_PUBLISH_API_KEY || '',
    },
    ai: {
      baseUrl: process.env.OPENAI_API_BASE_URL || '',
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4o',
    },
    unsplash: {
      accessKey: process.env.UNSPLASH_ACCESS_KEY || '',
    },
    imageGen: {
      baseUrl: process.env.IMAGE_GEN_API_URL || '',
      apiKey: process.env.IMAGE_GEN_API_KEY || '',
      model: process.env.IMAGE_GEN_MODEL || 'Kwai-Kolors/Kolors',
    },
  };
}

// GET /api/settings - 获取所有设置
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const settings = getAllSettings(session.user.id);
    const envDefaults = getEnvDefaults();

    // 解析 JSON 格式的设置值
    const parsed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(settings)) {
      try {
        parsed[key] = JSON.parse(value);
      } catch {
        parsed[key] = value;
      }
    }

    // 合并环境变量默认值（数据库值优先，但如果数据库值为空则使用环境变量）
    for (const [key, envValue] of Object.entries(envDefaults)) {
      if (!parsed[key]) {
        // 数据库中没有这个配置，使用环境变量
        parsed[key] = envValue;
      } else if (typeof envValue === 'object' && envValue !== null) {
        // 合并对象类型的配置
        const dbValue = parsed[key] as Record<string, string>;
        const merged: Record<string, string> = { ...envValue as Record<string, string> };
        for (const [subKey, subValue] of Object.entries(dbValue)) {
          // 如果数据库中有值，使用数据库的值
          if (subValue) {
            merged[subKey] = subValue;
          }
        }
        parsed[key] = merged;
      }
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    console.error('获取设置失败:', error);
    return NextResponse.json(
      { success: false, error: '获取设置失败' },
      { status: 500 }
    );
  }
}

// POST /api/settings - 保存设置
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }
    const body = await request.json();

    // 遍历所有设置项并保存
    for (const [key, value] of Object.entries(body)) {
      const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
      setSetting(key, valueStr, session.user.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('保存设置失败:', error);
    return NextResponse.json(
      { success: false, error: '保存设置失败' },
      { status: 500 }
    );
  }
}
