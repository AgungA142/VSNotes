/**
 * Base Response Tests
 */

import { describe, it, expect } from 'vitest';
import { createSuccessResponse, BaseResponse } from '../base-response';

describe('BaseResponse', () => {
  it('should create success response with data', () => {
    const data = { id: 1, name: 'Test' };
    const statusCode = 200;
    const response = createSuccessResponse(data, statusCode);

    expect(response.success).toBe(true);
    expect(response.status_code).toBe(statusCode);
    expect(response.data).toEqual(data);
    expect(response.message).toBeUndefined();
  });

  it('should create success response with data and message', () => {
    const data = { id: 1, name: 'Test' };
    const statusCode = 200;
    const message = 'Operation successful';
    const response = createSuccessResponse(data, statusCode, message);

    expect(response.success).toBe(true);
    expect(response.status_code).toBe(statusCode);
    expect(response.data).toEqual(data);
    expect(response.message).toBe(message);
  });

  it('should have correct type structure', () => {
    const response: BaseResponse<{ test: string }> = createSuccessResponse(
      { test: 'value' },
      200
    );

    expect(response).toHaveProperty('success');
    expect(response).toHaveProperty('status_code');
    expect(response).toHaveProperty('data');
  });
});
