export const usersSchemas = {
  UserSettings: {
    type: 'object',
    properties: {
      summaryLengthPref: {
        type: 'string',
        enum: ['short', 'medium', 'long'],
        example: 'medium',
      },
      autoStartSession: { type: 'boolean', example: true },
      notificationsEnabled: { type: 'boolean', example: true },
      watchPlatforms: {
        type: 'array',
        items: { type: 'string' },
        example: ['youtube', 'netflix', 'udemy', 'coursera'],
        description: 'Daftar nama platform streaming untuk deteksi video otomatis (lowercase)',
      },
    },
  },
  UserProfileData: {
    type: 'object',
    properties: {
      _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
      email: { type: 'string', example: 'budi@example.com' },
      name: { type: 'string', example: 'Budi Santoso' },
      settings: { $ref: '#/components/schemas/UserSettings' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  UserProfileResponse: {
    allOf: [
      { $ref: '#/components/schemas/BaseResponse' },
      {
        type: 'object',
        properties: {
          status_code: { type: 'integer', example: 200 },
          data: { $ref: '#/components/schemas/UserProfileData' },
        },
      },
    ],
  },
  UpdateSettingsRequest: {
    type: 'object',
    properties: {
      summaryLengthPref: {
        type: 'string',
        enum: ['short', 'medium', 'long'],
        description: 'Preferensi panjang rangkuman default',
      },
      autoStartSession: {
        type: 'boolean',
        description: 'Mulai sesi otomatis saat video terdeteksi',
      },
      notificationsEnabled: {
        type: 'boolean',
        description: 'Aktifkan notifikasi sistem',
      },
      watchPlatforms: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 50,
        description: 'Daftar platform streaming untuk deteksi (lowercase, deduplicated otomatis)',
        example: ['youtube', 'netflix', 'udemy', 'coursera'],
      },
    },
  },
};
