/**
 * Session Module Swagger Schemas
 * Schemas for session management endpoints
 */

export const sessionSchemas = {
  CreateSessionRequest: {
    type: 'object',
    required: ['videoTitle', 'sourceApp', 'sourceType'],
    properties: {
      videoTitle: {
        type: 'string',
        example: 'Introduction to TypeScript',
        description: 'Title of the video being watched',
      },
      sourceApp: {
        type: 'string',
        example: 'Google Chrome',
        description: 'Application playing the video',
      },
      sourceType: {
        type: 'string',
        enum: ['local', 'streaming'],
        example: 'streaming',
        description: 'Type of video source',
      },
      deviceId: {
        type: 'string',
        example: 'device-12345',
        description: 'Unique device identifier',
      },
    },
  },
  UpdateSessionRequest: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['active', 'completed', 'dismissed'],
        example: 'completed',
        description: 'Session status',
      },
      endedAt: {
        type: 'string',
        format: 'date-time',
        example: '2024-01-15T11:30:00.000Z',
        description: 'Session end timestamp',
      },
      durationSec: {
        type: 'integer',
        example: 3600,
        description: 'Session duration in seconds',
      },
    },
  },
  Session: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        example: '507f1f77bcf86cd799439011',
      },
      userId: {
        type: 'string',
        example: '507f191e810c19729de860ea',
      },
      videoTitle: {
        type: 'string',
        example: 'Introduction to TypeScript',
      },
      sourceApp: {
        type: 'string',
        example: 'Google Chrome',
      },
      sourceType: {
        type: 'string',
        enum: ['local', 'streaming'],
        example: 'streaming',
      },
      startedAt: {
        type: 'string',
        format: 'date-time',
        example: '2024-01-15T10:30:00.000Z',
      },
      endedAt: {
        type: 'string',
        format: 'date-time',
        example: '2024-01-15T11:30:00.000Z',
        nullable: true,
      },
      durationSec: {
        type: 'integer',
        example: 3600,
        nullable: true,
      },
      status: {
        type: 'string',
        enum: ['active', 'completed', 'dismissed'],
        example: 'active',
      },
      deviceId: {
        type: 'string',
        example: 'device-12345',
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        example: '2024-01-15T10:30:00.000Z',
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        example: '2024-01-15T10:30:00.000Z',
      },
    },
  },
  SessionList: {
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
          sessions: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Session',
            },
          },
          total: {
            type: 'integer',
            example: 10,
          },
        },
      },
    },
  },
  UploadAudioChunkRequest: {
    type: 'object',
    required: ['audioData', 'durationSec'],
    properties: {
      audioData: {
        type: 'string',
        format: 'byte',
        description: 'Base64 encoded WAV audio data',
      },
      durationSec: {
        type: 'integer',
        example: 30,
        description: 'Duration of audio chunk in seconds',
      },
      capturedAt: {
        type: 'string',
        format: 'date-time',
        example: '2024-01-15T10:30:00.000Z',
        description: 'Timestamp when audio was captured',
      },
    },
  },
  TranscriptSegment: {
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
      timestampSec: {
        type: 'number',
        example: 120.5,
        description: 'Timestamp in seconds from session start',
      },
      text: {
        type: 'string',
        example: 'TypeScript is a typed superset of JavaScript...',
      },
      language: {
        type: 'string',
        example: 'en',
        description: 'Detected language code',
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        example: '2024-01-15T10:32:00.000Z',
      },
    },
  },
};
