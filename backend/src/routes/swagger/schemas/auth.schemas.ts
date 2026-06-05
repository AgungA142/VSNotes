/**
 * Auth Module Swagger Schemas
 * Schemas for authentication endpoints
 */

export const authSchemas = {
  RegisterRequest: {
    type: 'object',
    required: ['email', 'password', 'confirmPassword', 'name'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        example: 'user@example.com',
        description: 'Alamat email pengguna',
      },
      password: {
        type: 'string',
        format: 'password',
        minLength: 8,
        maxLength: 100,
        example: 'RahasiaKu123!',
        description: 'Password (min 8 karakter, min 1 huruf kapital, min 1 angka atau simbol)',
      },
      confirmPassword: {
        type: 'string',
        format: 'password',
        example: 'RahasiaKu123!',
        description: 'Konfirmasi password — harus sama dengan password',
      },
      name: {
        type: 'string',
        example: 'Budi Santoso',
        description: 'Nama lengkap pengguna',
      },
    },
  },
  LoginRequest: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        example: 'user@example.com',
        description: 'User email address',
      },
      password: {
        type: 'string',
        format: 'password',
        example: 'SecurePassword123!',
        description: 'User password',
      },
    },
  },
  AuthResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: true,
      },
      status_code: {
        type: 'integer',
        example: 201,
      },
      message: {
        type: 'string',
        example: 'Registrasi berhasil',
      },
      data: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            example: '507f1f77bcf86cd799439011',
            description: 'ID unik pengguna',
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'user@example.com',
          },
          name: {
            type: 'string',
            example: 'Budi Santoso',
          },
          token: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTcwMDYwNDgwMH0.signature',
            description: 'JWT token untuk autentikasi request berikutnya',
          },
        },
      },
    },
  },
  RefreshResponse: {
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
      message: {
        type: 'string',
        example: 'Token berhasil diperbarui',
      },
      data: {
        type: 'object',
        properties: {
          token: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            description: 'JWT token baru dengan expiry yang diperpanjang',
          },
        },
      },
    },
  },
  ForgotPasswordRequest: {
    type: 'object',
    required: ['email'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        example: 'budi@example.com',
        description: 'Alamat email akun yang ingin direset passwordnya',
      },
    },
  },
  ResetPasswordRequest: {
    type: 'object',
    required: ['token', 'password', 'confirmPassword'],
    properties: {
      token: {
        type: 'string',
        example: 'a3f2c1d4e5b6...',
        description: 'Token reset password dari tautan email (raw hex, 64 karakter)',
      },
      password: {
        type: 'string',
        format: 'password',
        minLength: 8,
        example: 'PasswordBaru123!',
        description: 'Password baru (min 8 karakter, 1 huruf kapital, 1 angka/simbol)',
      },
      confirmPassword: {
        type: 'string',
        format: 'password',
        example: 'PasswordBaru123!',
        description: 'Konfirmasi password baru — harus sama dengan password',
      },
    },
  },
  ResetPasswordResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      status_code: { type: 'integer', example: 200 },
      message: { type: 'string', example: 'Password berhasil diubah. Silakan login kembali.' },
      data: { type: 'object', nullable: true, example: null },
    },
  },
  ForgotPasswordResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      status_code: { type: 'integer', example: 200 },
      message: {
        type: 'string',
        example: 'Jika email terdaftar, kami telah mengirim tautan reset password. Periksa kotak masuk Anda.',
      },
      data: { type: 'object', nullable: true, example: null },
    },
  },
  UserProfile: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        example: '507f1f77bcf86cd799439011',
      },
      email: {
        type: 'string',
        example: 'user@example.com',
      },
      name: {
        type: 'string',
        example: 'John Doe',
      },
      settings: {
        type: 'object',
        properties: {
          summaryLengthPref: {
            type: 'string',
            enum: ['short', 'medium', 'long'],
            example: 'medium',
          },
          autoStartSession: {
            type: 'boolean',
            example: true,
          },
          notificationsEnabled: {
            type: 'boolean',
            example: true,
          },
        },
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        example: '2024-01-15T10:30:00.000Z',
      },
    },
  },
};
