/**
 * Note Module Swagger Schemas
 * Schemas for note management endpoints
 */

export const noteSchemas = {
  CreateNoteRequest: {
    type: 'object',
    required: ['text', 'timestampSec'],
    properties: {
      text: {
        type: 'string',
        example: 'Important concept explained here',
        description: 'Note content',
      },
      timestampSec: {
        type: 'number',
        example: 120.5,
        description: 'Timestamp in seconds from session start',
      },
      type: {
        type: 'string',
        enum: ['auto', 'manual'],
        example: 'manual',
        description: 'Note type (auto-generated or manual)',
      },
    },
  },
  UpdateNoteRequest: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        example: 'Updated note content',
        description: 'Updated note content',
      },
    },
  },
  Note: {
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
      timestampSec: {
        type: 'number',
        example: 120.5,
        description: 'Timestamp in seconds from session start',
      },
      text: {
        type: 'string',
        example: 'Important concept explained here',
      },
      type: {
        type: 'string',
        enum: ['auto', 'manual'],
        example: 'manual',
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        example: '2024-01-15T10:32:00.000Z',
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        example: '2024-01-15T10:32:00.000Z',
      },
    },
  },
  NoteList: {
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
        type: 'object',
        properties: {
          notes: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Note',
            },
          },
          total: {
            type: 'integer',
            example: 15,
          },
        },
      },
    },
  },
};
