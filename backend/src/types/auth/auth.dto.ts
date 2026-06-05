/**
 * Auth DTOs
 * Data Transfer Objects for authentication endpoints
 */

export interface RegisterRequestDto {
  email: string;
  password: string;
  name: string;
}

export interface RegisterResponseDto {
  userId: string;
  email: string;
  name: string;
  token: string;
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface LoginResponseDto {
  userId: string;
  email: string;
  name: string;
  token: string;
}

export interface RefreshTokenResponseDto {
  token: string;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  iat?: number; // JWT issued-at (detik Unix), diisi otomatis oleh jsonwebtoken
}

export interface UserProfileDto {
  userId: string;
  email: string;
  name: string;
  settings: {
    summaryLengthPref: 'short' | 'medium' | 'long';
    autoStartSession: boolean;
    notificationsEnabled: boolean;
  };
  createdAt: string;
}
