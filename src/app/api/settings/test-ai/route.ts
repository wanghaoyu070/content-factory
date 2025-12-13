import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { baseUrl, apiKey } = await request.json();

    if (!baseUrl || !apiKey) {
      return NextResponse.json({ success: false, error: '缺少必要参数' });
    }

    // 发送一个简单的请求测试 API 连接
    const response = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      return NextResponse.json({ success: true, message: '连接成功' });
    } else {
      const error = await response.text();
      return NextResponse.json({
        success: false,
        error: `API 返回错误: ${response.status}`,
        details: error
      });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '连接失败'
    });
  }
}
