import { describe, it, expect } from 'vitest';
import {
  validateRequired,
  ApiError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
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
