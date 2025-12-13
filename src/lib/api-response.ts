import { NextResponse } from 'next/server';

// ===== 统一 API 响应格式 =====

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    code?: string;
}

/**
 * 成功响应
 */
export function successResponse<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
    return NextResponse.json(
        { success: true, data },
        { status }
    );
}

/**
 * 错误响应
 */
export function errorResponse(
    error: string,
    status = 400,
    code?: string
): NextResponse<ApiResponse> {
    return NextResponse.json(
        { success: false, error, code },
        { status }
    );
}

/**
 * 未登录响应
 */
export function unauthorizedResponse(
    message = '请先登录'
): NextResponse<ApiResponse> {
    return errorResponse(message, 401, 'UNAUTHORIZED');
}

/**
 * 无权限响应
 */
export function forbiddenResponse(
    message = '无权限访问'
): NextResponse<ApiResponse> {
    return errorResponse(message, 403, 'FORBIDDEN');
}

/**
 * 未找到响应
 */
export function notFoundResponse(
    message = '资源不存在'
): NextResponse<ApiResponse> {
    return errorResponse(message, 404, 'NOT_FOUND');
}

/**
 * 参数错误响应
 */
export function badRequestResponse(
    message = '请求参数错误'
): NextResponse<ApiResponse> {
    return errorResponse(message, 400, 'BAD_REQUEST');
}

/**
 * 服务器错误响应
 */
export function serverErrorResponse(
    message = '服务器内部错误'
): NextResponse<ApiResponse> {
    return errorResponse(message, 500, 'INTERNAL_ERROR');
}

// ===== 错误处理包装器 =====

type ApiHandler<T> = () => Promise<NextResponse<ApiResponse<T>>>;

/**
 * API 路由错误处理包装器
 * 自动捕获异常并返回统一格式的错误响应
 */
export async function withErrorHandler<T>(
    handler: ApiHandler<T>
): Promise<NextResponse<ApiResponse<T>>> {
    try {
        return await handler();
    } catch (error) {
        console.error('API Error:', error);

        if (error instanceof Error) {
            // 处理已知的错误类型
            if (error.message.includes('UNAUTHORIZED')) {
                return unauthorizedResponse() as NextResponse<ApiResponse<T>>;
            }
            if (error.message.includes('NOT_FOUND')) {
                return notFoundResponse() as NextResponse<ApiResponse<T>>;
            }

            return serverErrorResponse(
                process.env.NODE_ENV === 'development'
                    ? error.message
                    : '服务器内部错误'
            ) as NextResponse<ApiResponse<T>>;
        }

        return serverErrorResponse() as NextResponse<ApiResponse<T>>;
    }
}

// ===== 请求验证工具 =====

/**
 * 验证必填字段
 */
export function validateRequired<T extends Record<string, unknown>>(
    data: T,
    fields: (keyof T)[]
): { valid: boolean; missing: string[] } {
    const missing = fields.filter(field => {
        const value = data[field];
        return value === undefined || value === null || value === '';
    });

    return {
        valid: missing.length === 0,
        missing: missing as string[],
    };
}
