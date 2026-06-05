/**
 * Summary Module Swagger Schemas
 * Schemas for summary generation endpoints
 */

export const summarySchemas = {
  GenerateSummaryRequest: {
    type: 'object',
    properties: {
      lengthPref: {
        type: 'string',
        enum: ['short', 'medium', 'long'],
        example: 'medium',
        description: 'Preferred summary length',
      },
    },
  },
  Summary: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        example: '507f1f77bcf86cd799439011',
      },
      sessionId: {
        type: 'string',
        example: '507f191e810c19729de860ea',
      },
      userId: {
        type: 'string',
        example: '507f191e810c19729de860ea',
      },
      content: {
        type: 'string',
        example: 'This video provides an introduction to TypeScript, covering its main features...',
        description: 'Summary content',
      },
      keyPoints: {
        type: 'array',
        items: {
          type: 'string',
        },
        example: [
          'TypeScript is a typed superset of JavaScript',
          'Provides static type checking',
          'Compiles to plain JavaScript',
        ],
        description: 'Key points extracted from the video',
      },
      lengthPref: {
        type: 'string',
        enum: ['short', 'medium', 'long'],
        example: 'medium',
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        example: '2024-01-15T11:30:00.000Z',
      },
    },
  },
  SummaryResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: true,
      },
      status_code: {
        type: 'integer',
        example: 200,
      },
      data: {
        $ref: '#/components/schemas/Summary',
      },
    },
  },
};
