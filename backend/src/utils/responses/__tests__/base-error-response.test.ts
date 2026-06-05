/**
 * Base Error Response Tests
 */

import { describe, it, expect } from 'vitest';
import { createErrorResponse, BaseErrorResponse } from '../base-error-response';

describe('BaseErrorResponse', () => {
  it('should create error response with code and message', () => {
    const code = 'VALIDATION_ERROR';
    const message = 'Invalid input';
    const response = createErrorResponse(code, message);

    expect(response.success).toBe(false);
    expect(response.error.code).toBe(code);
    expect(response.error.message).toBe(message);
    expect(response.error.details).toBeUndefined();
  });

  it('should create error response with details', () => {
    const code = 'VALIDATION_ERROR';
    const message = 'Invalid input';
    const statusCode = 400;
    const details = { field: 'email', reason: 'Invalid format' };
    const response = createErrorResponse(code, message, statusCode, details);

    expect(response.success).toBe(false);
    expect(response.status_code).toBe(statusCode);
    expect(response.error.code).toBe(code);
    expect(response.error.message).toBe(message);
    expect(response.error.details).toEqual(details);
  });

  it('should have correct type structure', () => {
    const response: BaseErrorResponse = createErrorResponse(
      'TEST_ERROR',
      'Test message',
      500
    );

    expect(response).toHaveProperty('success');
    expect(response).toHaveProperty('status_code');
    expect(response).toHaveProperty('error');
    expect(response.error).toHaveProperty('code');
    expect(response.error).toHaveProperty('message');
  });
});
