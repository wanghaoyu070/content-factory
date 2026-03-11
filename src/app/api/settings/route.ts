import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getAllSettings, getSetting, setSetting } from '@/lib/db';
import {
  badRequestResponse,
  createRequestId,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';

type JsonRecord = Record<string, unknown>;

const API_CONFIG_KEYS = ['ai', 'imageGen', 'wechatArticle', 'wechatPublish', 'xiaohongshu'] as const;
type ApiConfigKey = typeof API_CONFIG_KEYS[number];
const ALLOWED_SETTINGS_KEYS = new Set<string>([
  ...API_CONFIG_KEYS,
  'preferences',
]);

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

function getApiKeyValue(config: unknown): string {
  if (!isRecord(config)) {
    return '';
  }
  const value = config.apiKey;
  return typeof value === 'string' ? value : '';
}

function withApiKeyCleared(config: unknown): unknown {
  if (!isRecord(config)) {
    return config;
  }
  const next: JsonRecord = { ...config };
  if ('apiKey' in next) {
    next.apiKey = '';
  }
  return next;
}

function mergeKeepingApiKey(existing: unknown, incoming: unknown): unknown {
  if (!isRecord(incoming)) {
    return incoming;
  }
  const merged: JsonRecord = { ...incoming };
  const existingApiKey = getApiKeyValue(existing);
  const incomingApiKey = getApiKeyValue(incoming).trim();

  // Security: empty apiKey from client means "keep current value".
  if ('apiKey' in merged && incomingApiKey === '') {
    merged.apiKey = existingApiKey;
  }

  return merged;
}

function parseStoredSetting(settingKey: string, userId: number): unknown {
  const raw = getSetting(settingKey, userId);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function buildApiKeyMeta(parsed: Record<string, unknown>) {
  const hasApiKey: Record<ApiConfigKey, boolean> = {
    ai: false,
    imageGen: false,
    wechatArticle: false,
    wechatPublish: false,
    xiaohongshu: false,
  };

  for (const key of API_CONFIG_KEYS) {
    hasApiKey[key] = getApiKeyValue(parsed[key]).trim().length > 0;
    parsed[key] = withApiKeyCleared(parsed[key]);
  }

  return { hasApiKey };
}

function parseSettingsFromDb(settings: Record<string, string>): Record<string, unknown> {
  const parsed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(settings)) {
    try {
      parsed[key] = JSON.parse(value);
    } catch {
      parsed[key] = value;
    }
  }
  return parsed;
}

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
    imageGen: {
      baseUrl: process.env.IMAGE_GEN_API_URL || '',
      apiKey: process.env.IMAGE_GEN_API_KEY || '',
      model: process.env.IMAGE_GEN_MODEL || 'Kwai-Kolors/Kolors',
    },
  };
}

// GET /api/settings - 获取所有设置
export async function GET() {
  const requestId = createRequestId();
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorizedResponse('请先登录', requestId);
    }

    const settings = getAllSettings(session.user.id);
    const envDefaults = getEnvDefaults();

    const parsed = parseSettingsFromDb(settings);

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

    const meta = buildApiKeyMeta(parsed);
    return NextResponse.json({ success: true, data: parsed, meta, requestId }, { status: 200 });
  } catch (error) {
    console.error(`[API ${requestId}] 获取设置失败:`, error);
    return serverErrorResponse('获取设置失败', requestId);
  }
}

// POST /api/settings - 保存设置
export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorizedResponse('请先登录', requestId);
    }
    const body = (await request.json()) as Record<string, unknown>;

    // 遍历所有设置项并保存
    for (const [key, value] of Object.entries(body)) {
      if (!ALLOWED_SETTINGS_KEYS.has(key)) {
        return badRequestResponse(`不支持的配置项: ${key}`, requestId);
      }
      const existing = parseStoredSetting(key, session.user.id);
      const mergedValue = mergeKeepingApiKey(existing, value);
      const valueStr = typeof mergedValue === 'string' ? mergedValue : JSON.stringify(mergedValue);
      setSetting(key, valueStr, session.user.id);
    }

    return successResponse({ saved: true }, 200, requestId);
  } catch (error) {
    console.error(`[API ${requestId}] 保存设置失败:`, error);
    return serverErrorResponse('保存设置失败', requestId);
  }
}
