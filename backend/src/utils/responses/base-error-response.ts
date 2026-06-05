/**
 * Standardized HTTP response shape for error responses
 */

export interface BaseErrorResponse {
  success: false;
  status_code: number;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function createErrorResponse(
  code: string,
  message: string,
  statusCode: number = 500,
  details?: unknown
): BaseErrorResponse {
  return {
    success: false,
    status_code: statusCode,
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
  };
}
