import { describe, it, expect } from 'vitest';
import {
  validateRequired,
  ApiError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
  createRequestId,
  successResponse,
  successResponseWithMeta,
  errorResponse,
} from './api-response';

describe('validateRequired', () => {
  it('should return valid when all fields are present', () => {
    const data = { name: 'John', email: 'john@example.com' };
    const result = validateRequired(data, ['name', 'email']);
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it('should return invalid when fields are missing', () => {
    const data = { name: 'John', email: '' };
    const result = validateRequired(data, ['name', 'email']);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('email');
  });

  it('should detect null values as missing', () => {
    const data = { name: null, email: 'john@example.com' };
    const result = validateRequired(data, ['name', 'email']);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('name');
  });

  it('should detect undefined values as missing', () => {
    const data = { email: 'john@example.com' } as { name?: string; email: string };
    const result = validateRequired(data, ['name', 'email']);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('name');
  });
});

describe('ApiError', () => {
  it('should create error with default values', () => {
    const error = new ApiError('Something went wrong');
    expect(error.message).toBe('Something went wrong');
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.name).toBe('ApiError');
  });

  it('should create error with custom values', () => {
    const error = new ApiError('Not found', 404, 'NOT_FOUND');
    expect(error.message).toBe('Not found');
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
  });
});

describe('UnauthorizedError', () => {
  it('should create 401 error with default message', () => {
    const error = new UnauthorizedError();
    expect(error.message).toBe('请先登录');
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
  });

  it('should create 401 error with custom message', () => {
    const error = new UnauthorizedError('Token expired');
    expect(error.message).toBe('Token expired');
    expect(error.statusCode).toBe(401);
  });
});

describe('ForbiddenError', () => {
  it('should create 403 error with default message', () => {
    const error = new ForbiddenError();
    expect(error.message).toBe('无权限访问');
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
  });
});

describe('NotFoundError', () => {
  it('should create 404 error with default message', () => {
    const error = new NotFoundError();
    expect(error.message).toBe('资源不存在');
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
  });
});

describe('BadRequestError', () => {
  it('should create 400 error with default message', () => {
    const error = new BadRequestError();
    expect(error.message).toBe('请求参数错误');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('BAD_REQUEST');
  });
});

describe('response helpers', () => {
  it('should generate unique request id', () => {
    const id1 = createRequestId();
    const id2 = createRequestId();
    expect(id1).not.toBe(id2);
    expect(id1.length).toBeGreaterThan(10);
  });

  it('should include requestId in success response body', async () => {
    const response = successResponse({ ok: true }, 200, 'req-123');
    const json = await response.json();
    expect(json.requestId).toBe('req-123');
    expect(json.success).toBe(true);
  });

  it('should include requestId and code in error response body', async () => {
    const response = errorResponse('bad', 400, 'BAD_REQUEST', 'req-456');
    const json = await response.json();
    expect(json.requestId).toBe('req-456');
    expect(json.code).toBe('BAD_REQUEST');
    expect(json.success).toBe(false);
  });

  it('should include meta fields in success response body', async () => {
    const response = successResponseWithMeta(
      [{ id: 1 }],
      { source: 'mock', total: 1 },
      200,
      'req-meta'
    );
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual([{ id: 1 }]);
    expect(json.source).toBe('mock');
    expect(json.total).toBe(1);
    expect(json.requestId).toBe('req-meta');
  });
});
