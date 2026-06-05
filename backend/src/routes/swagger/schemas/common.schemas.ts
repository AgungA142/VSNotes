/**
 * Common Swagger Schemas
 * Shared schemas used across all endpoints
 */

export const commonSchemas = {
  BaseResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: true,
        description: 'Indicates if the request was successful',
      },
      status_code: {
        type: 'integer',
        example: 200,
        description: 'HTTP status code',
      },
      data: {
        type: 'object',
        description: 'Response data (varies by endpoint)',
      },
      message: {
        type: 'string',
        example: 'Operation successful',
        description: 'Optional success message',
      },
    },
    required: ['success', 'status_code', 'data'],
  },
  BaseErrorResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: false,
        description: 'Always false for error responses',
      },
      status_code: {
        type: 'integer',
        example: 400,
        description: 'HTTP status code',
      },
      error: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            example: 'VALIDATION_ERROR',
            description: 'Error code for programmatic handling',
          },
          message: {
            type: 'string',
            example: 'Invalid request data',
            description: 'Human-readable error message',
          },
          details: {
            type: 'object',
            description: 'Additional error details (optional)',
          },
        },
        required: ['code', 'message'],
      },
    },
    required: ['success', 'status_code', 'error'],
  },
  ValidationError: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: false,
      },
      status_code: {
        type: 'integer',
        example: 400,
      },
      error: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            example: 'VALIDATION_ERROR',
          },
          message: {
            type: 'string',
            example: 'Request validation failed',
          },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  example: 'email',
                },
                message: {
                  type: 'string',
                  example: 'Invalid email format',
                },
              },
            },
          },
        },
      },
    },
  },
  UnauthorizedError: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: false,
      },
      status_code: {
        type: 'integer',
        example: 401,
      },
      error: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            example: 'UNAUTHORIZED',
          },
          message: {
            type: 'string',
            example: 'Authentication required',
          },
        },
      },
    },
  },
  NotFoundError: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: false,
      },
      status_code: {
        type: 'integer',
        example: 404,
      },
      error: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            example: 'NOT_FOUND',
          },
          message: {
            type: 'string',
            example: 'Resource not found',
          },
        },
      },
    },
  },
};
