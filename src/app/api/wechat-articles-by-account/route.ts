import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getWechatArticleConfig } from '@/lib/config';

// post_condition API 返回的文章数据
interface PostConditionArticle {
  appmsgid: number;
  cover_url: string;
  digest: string;
  is_deleted: string;
  item_show_type: number;
  msg_fail_reason: string;
  msg_status: number;
  original: number;
  pic_cdn_url_16_9: string;
  pic_cdn_url_1_1: string;
  pic_cdn_url_235_1: string;
  position: number;
  post_time: number;
  post_time_str: string;
  pre_post_time: number;
  send_to_fans_num: number;
  title: string;
  types: number;
  update_time: number;
  url: string;
}

// post_condition API 响应
interface PostConditionResponse {
  code: number;
  cost_money: number;
  data: PostConditionArticle[];
  head_img?: string;
  masssend_count: number;
  mp_ghid?: string;
  mp_nickname?: string;
  mp_wxid?: string;
  msg: string;
  now_page: number;
  now_page_articles_num: number;
  publish_count: number;
  remain_money: number;
  total_num: number;
  total_page: number;
}

// read_zan API 响应
interface ReadZanResponse {
  code: number;
  cost_money: number;
  data: {
    looking: number;
    read: number;
    zan: number;
  };
  msg: string;
  remain_money: number;
}

// 并发控制：限制同时最多N个请求
async function fetchWithConcurrencyLimit<T, R>(
  items: T[],
  fetchFn: (item: T) => Promise<R>,
  limit: number = 5
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    const batchResults = await Promise.all(batch.map(fetchFn));
    results.push(...batchResults);
  }
  return results;
}

// 获取单篇文章的互动数据
async function fetchArticleStats(
  articleUrl: string,
  baseEndpoint: string,
  apiKey: string
): Promise<{ read: number; zan: number; looking: number } | null> {
  try {
    const response = await fetch(`${baseEndpoint}/read_zan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: articleUrl,
        key: apiKey,
        verifycode: '',
      }),
    });

    if (!response.ok) {
      console.error(`Failed to fetch stats for ${articleUrl}: ${response.status}`);
      return null;
    }

    const data: ReadZanResponse = await response.json();
    if (data.code !== 0) {
      console.error(`API error for ${articleUrl}: ${data.msg}`);
      return null;
    }

    return {
      read: data.data.read,
      zan: data.data.zan,
      looking: data.data.looking,
    };
  } catch (error) {
    console.error(`Error fetching stats for ${articleUrl}:`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { accountName, page = 1 } = body;

    if (!accountName) {
      return NextResponse.json(
        { success: false, error: '公众号名称不能为空' },
        { status: 400 }
      );
    }

    // 获取API配置
    const baseConfig = getWechatArticleConfig(session.user.id);
    const config = baseConfig
      ? {
        endpoint: baseConfig.endpoint.replace('/kw_search', ''),
        apiKey: baseConfig.apiKey,
      }
      : null;


    // Fallback to mock data if config is missing
    if (!config || !config.endpoint || !config.apiKey || config.endpoint.includes('example.com')) {
      console.log('Using mock data for account:', accountName);

      const mockArticles = Array.from({ length: 12 }).map((_, i) => ({
        id: `mock_acc_${Date.now()}_${i}`,
        title: `${accountName}近期干货第${i + 1}篇：深度复盘`,
        content: `这是${accountName}发布的一篇关于行业深度的思考文章...`,
        coverImage: `https://api.dicebear.com/7.x/shapes/svg?seed=${accountName}${i}`,
        digest: `摘要：本文深度解析了${accountName}对于当前热点的独到见解，点击阅读全文...`,
        readCount: Math.floor(Math.random() * 50000) + 2000,
        likeCount: Math.floor(Math.random() * 2000) + 50,
        wowCount: Math.floor(Math.random() * 500) + 20,
        publishTime: new Date(Date.now() - i * 86400000 * 2).toLocaleString('zh-CN'),
        sourceUrl: '#',
        wxName: accountName,
        wxId: `wx_${Math.random().toString(36).substr(2, 8)}`,
        isOriginal: Math.random() > 0.4,
        position: 1,
        articleType: '群发'
      }));

      return NextResponse.json({
        success: true,
        data: mockArticles,
        accountInfo: {
          name: accountName,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${accountName}`,
          ghid: `gh_${Math.random().toString(36).substr(2, 10)}`,
          wxid: `wx_${Math.random().toString(36).substr(2, 8)}`,
          totalArticles: 156,
          masssendCount: 156,
          publishCount: 0,
        },
        total: 156,
        page: 1,
        totalPage: 13,
      });
    }

    // Step 1: 调用 post_condition 获取公众号文章列表
    const articlesResponse = await fetch(`${config.endpoint}/post_condition`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        biz: '',
        url: '',
        name: accountName,
        key: config.apiKey,
        verifycode: '',
        page: page,
      }),
    });

    if (!articlesResponse.ok) {
      throw new Error(`API request failed: ${articlesResponse.status}`);
    }

    const articlesData: PostConditionResponse = await articlesResponse.json();

    // 检查API返回状态
    if (articlesData.code !== 0) {
      return NextResponse.json(
        { success: false, error: articlesData.msg || '获取公众号文章失败' },
        { status: 400 }
      );
    }

    // 检查是否有文章
    if (!articlesData.data || articlesData.data.length === 0) {
      return NextResponse.json(
        { success: false, error: '未找到该公众号的文章' },
        { status: 404 }
      );
    }

    // Step 2: 过滤有效文章 (未删除、状态正常)
    const validArticles = articlesData.data.filter(
      (article) => article.is_deleted !== '1' && article.msg_status === 2
    );

    if (validArticles.length === 0) {
      return NextResponse.json(
        { success: false, error: '该公众号暂无可分析的文章' },
        { status: 404 }
      );
    }

    // Step 3: 并发获取每篇文章的互动数据
    const articlesWithStats = await fetchWithConcurrencyLimit(
      validArticles,
      async (article) => {
        const stats = await fetchArticleStats(article.url, config.endpoint, config.apiKey);
        return {
          id: `${articlesData.mp_ghid || 'unknown'}_${article.post_time}`,
          title: article.title,
          content: '', // post_condition 不返回内容
          coverImage: article.cover_url || article.pic_cdn_url_1_1 || article.pic_cdn_url_16_9,
          digest: article.digest,
          readCount: stats?.read || 0,
          likeCount: stats?.zan || 0,
          wowCount: stats?.looking || 0,
          publishTime: article.post_time_str,
          sourceUrl: article.url,
          wxName: articlesData.mp_nickname || accountName,
          wxId: articlesData.mp_wxid || '',
          isOriginal: article.original === 1,
          position: article.position,
          articleType: article.types === 9 ? '群发' : '发布',
        };
      },
      5 // 并发限制为5
    );

    // Step 4: 返回统一格式
    return NextResponse.json({
      success: true,
      data: articlesWithStats,
      accountInfo: {
        name: articlesData.mp_nickname || accountName,
        avatar: articlesData.head_img || '',
        ghid: articlesData.mp_ghid || '',
        wxid: articlesData.mp_wxid || '',
        totalArticles: articlesData.total_num,
        masssendCount: articlesData.masssend_count,
        publishCount: articlesData.publish_count,
      },
      total: articlesData.total_num,
      page: articlesData.now_page,
      totalPage: articlesData.total_page,
    });
  } catch (error) {
    console.error('Error fetching wechat articles by account:', error);
    return NextResponse.json(
      { success: false, error: '获取公众号文章失败，请稍后重试' },
      { status: 500 }
    );
  }
}
