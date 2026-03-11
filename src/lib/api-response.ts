import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/types/api';

// ===== 统一 API 响应格式 =====

/**
 * 成功响应
 */
export function createRequestId(): string {
    return crypto.randomUUID();
}

export function successResponse<T>(data: T, status = 200, requestId?: string): NextResponse<ApiResponse<T>> {
    return NextResponse.json(
        { success: true, data, requestId },
        { status }
    );
}

export function successResponseWithMeta<
    T,
    TMeta extends Record<string, unknown>
>(
    data: T,
    meta: TMeta,
    status = 200,
    requestId?: string
): NextResponse<ApiResponse<T> & TMeta> {
    return NextResponse.json(
        { success: true, data, ...meta, requestId },
        { status }
    );
}

/**
 * 错误响应
 */
export function errorResponse(
    error: string,
    status = 400,
    code?: string,
    requestId?: string
): NextResponse<ApiResponse> {
    return NextResponse.json(
        { success: false, error, code, requestId },
        { status }
    );
}

/**
 * 未登录响应
 */
export function unauthorizedResponse(
    message = '请先登录',
    requestId?: string
): NextResponse<ApiResponse> {
    return errorResponse(message, 401, 'UNAUTHORIZED', requestId);
}

/**
 * 无权限响应
 */
export function forbiddenResponse(
    message = '无权限访问',
    requestId?: string
): NextResponse<ApiResponse> {
    return errorResponse(message, 403, 'FORBIDDEN', requestId);
}

/**
 * 未找到响应
 */
export function notFoundResponse(
    message = '资源不存在',
    requestId?: string
): NextResponse<ApiResponse> {
    return errorResponse(message, 404, 'NOT_FOUND', requestId);
}

/**
 * 参数错误响应
 */
export function badRequestResponse(
    message = '请求参数错误',
    requestId?: string
): NextResponse<ApiResponse> {
    return errorResponse(message, 400, 'BAD_REQUEST', requestId);
}

export function unprocessableResponse(
    message = '请求参数语义错误',
    requestId?: string
): NextResponse<ApiResponse> {
    return errorResponse(message, 422, 'UNPROCESSABLE_ENTITY', requestId);
}

/**
 * 服务器错误响应
 */
export function serverErrorResponse(
    message = '服务器内部错误',
    requestId?: string
): NextResponse<ApiResponse> {
    return errorResponse(message, 500, 'INTERNAL_ERROR', requestId);
}

// ===== 自定义错误类 =====

export class ApiError extends Error {
    constructor(
        message: string,
        public statusCode: number = 500,
        public code: string = 'INTERNAL_ERROR'
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

export class UnauthorizedError extends ApiError {
    constructor(message = '请先登录') {
        super(message, 401, 'UNAUTHORIZED');
    }
}

export class ForbiddenError extends ApiError {
    constructor(message = '无权限访问') {
        super(message, 403, 'FORBIDDEN');
    }
}

export class NotFoundError extends ApiError {
    constructor(message = '资源不存在') {
        super(message, 404, 'NOT_FOUND');
    }
}

export class BadRequestError extends ApiError {
    constructor(message = '请求参数错误') {
        super(message, 400, 'BAD_REQUEST');
    }
}

export class UnprocessableEntityError extends ApiError {
    constructor(message = '请求参数语义错误') {
        super(message, 422, 'UNPROCESSABLE_ENTITY');
    }
}

export interface ApiHandlerContext {
    request: Request;
    requestId: string;
}

type RouteHandler<T> = (
    context: ApiHandlerContext
) => Promise<NextResponse<ApiResponse<T>>>;

export function withApiHandler<T>(
    handler: RouteHandler<T>
): (request: Request) => Promise<NextResponse<ApiResponse<T>>> {
    return async (request: Request) => {
        const requestId = createRequestId();
        try {
            return await handler({ request, requestId });
        } catch (error) {
            console.error(`[API ${requestId}]`, error);
            if (error instanceof ApiError) {
                return errorResponse(error.message, error.statusCode, error.code, requestId) as NextResponse<ApiResponse<T>>;
            }
            if (error instanceof Error) {
                return serverErrorResponse(
                    process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误',
                    requestId
                ) as NextResponse<ApiResponse<T>>;
            }
            return serverErrorResponse('服务器内部错误', requestId) as NextResponse<ApiResponse<T>>;
        }
    };
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

        // 处理自定义 ApiError
        if (error instanceof ApiError) {
            return errorResponse(error.message, error.statusCode, error.code) as NextResponse<ApiResponse<T>>;
        }

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

// ===== 重试机制 =====

interface RetryOptions {
    maxRetries?: number;
    delayMs?: number;
    backoffMultiplier?: number;
    shouldRetry?: (error: unknown) => boolean;
}

/**
 * 带重试机制的异步函数执行器
 * 支持指数退避
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        maxRetries = 3,
        delayMs = 1000,
        backoffMultiplier = 2,
        shouldRetry = () => true,
    } = options;

    let lastError: unknown;
    let currentDelay = delayMs;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            if (attempt === maxRetries || !shouldRetry(error)) {
                throw error;
            }

            console.warn(`重试第 ${attempt + 1} 次，等待 ${currentDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, currentDelay));
            currentDelay *= backoffMultiplier;
        }
    }

    throw lastError;
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

// ===== 认证中间件 =====

export interface AuthenticatedUser {
    id: number;
    email?: string | null;
    name?: string | null;
}

export interface AuthenticatedRequest {
    user: AuthenticatedUser;
}

type AuthenticatedHandler<T> = (
    request: Request,
    context: AuthenticatedRequest
) => Promise<NextResponse<ApiResponse<T>>>;

/**
 * 认证中间件包装器
 * 自动处理用户认证，未登录时返回 401
 *
 * @example
 * export const GET = withAuth(async (request, { user }) => {
 *   const data = getData(user.id);
 *   return successResponse(data);
 * });
 */
export function withAuth<T>(
    handler: AuthenticatedHandler<T>,
    authFn: () => Promise<{ user?: AuthenticatedUser } | null>
): (request: Request) => Promise<NextResponse<ApiResponse<T>>> {
    return async (request: Request) => {
        try {
            const session = await authFn();
            if (!session?.user) {
                return unauthorizedResponse() as NextResponse<ApiResponse<T>>;
            }

            return await handler(request, { user: session.user });
        } catch (error) {
            console.error('API Error:', error);

            if (error instanceof ApiError) {
                return errorResponse(error.message, error.statusCode, error.code) as NextResponse<ApiResponse<T>>;
            }

            if (error instanceof Error) {
                return serverErrorResponse(
                    process.env.NODE_ENV === 'development'
                        ? error.message
                        : '服务器内部错误'
                ) as NextResponse<ApiResponse<T>>;
            }

            return serverErrorResponse() as NextResponse<ApiResponse<T>>;
        }
    };
}
