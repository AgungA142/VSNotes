/**
 * Shared Zod validation schemas for Video Summary & Auto-Notes
 * Used across backend and web applications for consistent validation
 */

import { z } from 'zod';

// Session validation schemas
export const sessionStatusSchema = z.enum(['active', 'completed', 'dismissed']);
export const sourceTypeSchema = z.enum(['local', 'streaming']);

export const createSessionSchema = z.object({
  videoTitle: z.string().min(1).max(500),
  sourceApp: z.string().min(1).max(100),
  sourceType: sourceTypeSchema,
  deviceId: z.string().min(1),
});

export const updateSessionSchema = z.object({
  status: sessionStatusSchema.optional(),
  endedAt: z.date().optional(),
  durationSec: z.number().positive().optional(),
});

// Note validation schemas
export const noteTypeSchema = z.enum(['auto', 'manual']);

export const createNoteSchema = z.object({
  sessionId: z.string().min(1),
  timestampSec: z.number().min(0),
  text: z.string().min(1).max(5000),
  type: noteTypeSchema,
});

export const updateNoteSchema = z.object({
  text: z.string().min(1).max(5000).optional(),
  timestampSec: z.number().min(0).optional(),
});

// Summary validation schemas
export const lengthPreferenceSchema = z.enum(['short', 'medium', 'long']);

export const generateSummarySchema = z.object({
  sessionId: z.string().min(1),
  lengthPref: lengthPreferenceSchema.optional().default('medium'),
});

// User validation schemas
export const registerUserSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .max(100)
    .regex(/[A-Z]/, 'Password harus mengandung huruf kapital')
    .regex(/[0-9]/, 'Password harus mengandung angka')
    .regex(/[^a-zA-Z0-9]/, 'Password harus mengandung simbol'),
  confirmPassword: z.string().min(1),
  name: z.string().min(1).max(100),
});

export const loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const updateUserSettingsSchema = z.object({
  summaryLengthPref: lengthPreferenceSchema.optional(),
  autoStartSession: z.boolean().optional(),
  notificationsEnabled: z.boolean().optional(),
  watchPlatforms: z
    .array(z.string().trim().toLowerCase().min(1).max(50))
    .min(1)
    .max(50)
    .optional(),
});

// Export validation schemas
export const exportFormatSchema = z.enum(['pdf', 'md', 'txt']);

export const exportSessionSchema = z.object({
  format: exportFormatSchema,
  includeTranscript: z.boolean().optional().default(false),
});

// Audio upload validation
export const uploadAudioSchema = z.object({
  audioData: z.string(), // base64 encoded
  durationSec: z.number().positive(),
  capturedAt: z.string().datetime(),
});

// Type exports for TypeScript inference
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type GenerateSummaryInput = z.infer<typeof generateSummarySchema>;
export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type LoginUserInput = z.infer<typeof loginUserSchema>;
export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;
export type ExportSessionInput = z.infer<typeof exportSessionSchema>;
export type UploadAudioInput = z.infer<typeof uploadAudioSchema>;
