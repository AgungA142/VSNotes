/**
 * Standardized HTTP response shape for successful responses
 */

export interface BaseResponse<T> {
  success: true;
  status_code: number;
  data: T;
  message?: string;
}

export function createSuccessResponse<T>(
  data: T,
  statusCode: number = 200,
  message?: string
): BaseResponse<T> {
  return {
    success: true,
    status_code: statusCode,
    data,
    ...(message && { message }),
  };
}
