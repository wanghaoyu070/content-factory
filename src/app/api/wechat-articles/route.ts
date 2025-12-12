import { NextRequest, NextResponse } from 'next/server';
import { getSetting } from '@/lib/db';

// 获取公众号文章API配置
function getWechatArticleConfig(): { endpoint: string; apiKey: string } | null {
  // 优先使用环境变量
  if (process.env.WECHAT_ARTICLE_ENDPOINT && process.env.WECHAT_ARTICLE_API_KEY) {
    return {
      endpoint: process.env.WECHAT_ARTICLE_ENDPOINT,
      apiKey: process.env.WECHAT_ARTICLE_API_KEY,
    };
  }

  // 回退到数据库配置
  const configStr = getSetting('wechatArticle');
  if (configStr) {
    try {
      return JSON.parse(configStr);
    } catch {
      return null;
    }
  }

  return null;
}

export interface WechatArticle {
  avatar: string;
  classify: string;
  content: string;
  ghid: string;
  ip_wording: string;
  is_original: number;
  looking: number;
  praise: number;
  publish_time: number;
  publish_time_str: string;
  read: number;
  short_link: string;
  title: string;
  update_time: number;
  update_time_str: string;
  url: string;
  wx_id: string;
  wx_name: string;
}

export interface WechatApiResponse {
  code: number;
  cost_money: number;
  cut_words: string;
  data: WechatArticle[];
  data_number: number;
  msg: string;
  page: number;
  remain_money: number;
  total: number;
  total_page: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keyword, page = 1, period = 7 } = body;

    if (!keyword) {
      return NextResponse.json(
        { error: '关键词不能为空' },
        { status: 400 }
      );
    }

    // 获取API配置
    const config = getWechatArticleConfig();
    if (!config || !config.endpoint || !config.apiKey) {
      return NextResponse.json(
        { error: '请先配置公众号文章API（环境变量或设置页面）' },
        { status: 400 }
      );
    }

    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        kw: keyword,
        sort_type: 1,
        mode: 1,
        period: period,
        page: page,
        key: config.apiKey,
        any_kw: '',
        ex_kw: '',
        verifycode: '',
        type: 1,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data: WechatApiResponse = await response.json();

    // API returns code: 0 for success
    if (data.code !== 0) {
      return NextResponse.json(
        { error: data.msg || '获取文章失败' },
        { status: 400 }
      );
    }

    // Transform data to our format
    const articles = data.data.map((article) => ({
      id: article.ghid + '_' + article.publish_time,
      title: article.title,
      content: article.content,
      coverImage: article.avatar,
      readCount: article.read,
      likeCount: article.praise,
      wowCount: article.looking,
      publishTime: article.publish_time_str,
      sourceUrl: article.url,
      wxName: article.wx_name,
      wxId: article.wx_id,
      isOriginal: article.is_original === 1,
    }));

    return NextResponse.json({
      success: true,
      data: articles,
      total: data.total,
      page: data.page,
      totalPage: data.total_page,
    });
  } catch (error) {
    console.error('Error fetching wechat articles:', error);
    return NextResponse.json(
      { error: '获取文章失败，请稍后重试' },
      { status: 500 }
    );
  }
}
