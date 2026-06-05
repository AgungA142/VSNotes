/**
 * Environment Variable Validation
 * Validates all required environment variables using zod
 * App will not start if any required env variable is missing
 */

import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  // MongoDB
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  // Google Gemini API (wajib jika TRANSCRIPTION_PROVIDER=gemini atau tidak di-set)
  GEMINI_API_KEY: z.string().optional().default(''),

  // Groq API (wajib jika TRANSCRIPTION_PROVIDER=groq)
  GROQ_API_KEY: z.string().optional().default(''),

  // Transcription provider: 'gemini' | 'groq' (default: gemini)
  TRANSCRIPTION_PROVIDER: z.enum(['gemini', 'groq']).default('gemini'),

  // JWT Authentication
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters for security'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Server Configuration
  PORT: z.string().default('3000').transform(Number),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // CORS
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:5173')
    .transform((val) => val.split(',').map((origin) => origin.trim())),

  // Audio Processing
  AUDIO_CHUNK_SIZE_SEC: z.string().default('30').transform(Number),
  AUDIO_SAMPLE_RATE: z.string().default('16000').transform(Number),

  // Cloud Storage (optional)
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_REGION: z.string().optional(),

  // Logging
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'])
    .default('info'),

  // Email / SMTP (opsional — jika tidak di-set, link reset di-log ke console)
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.string().default('587').transform(Number),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  FROM_EMAIL: z.string().optional().default('noreply@vsnotes.app'),
  APP_URL: z.string().optional().default('http://localhost:3000'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate environment variables
 * Throws error if validation fails
 */
function validateEnv(): Env {
  try {
    const env = envSchema.parse(process.env);
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
        .join('\n');

      console.error('❌ Environment variable validation failed:\n');
      console.error(missingVars);
      console.error(
        '\n💡 Please check your .env file and ensure all required variables are set.'
      );
      console.error('   See .env.example for reference.\n');

      process.exit(1);
    }
    throw error;
  }
}

// Validate and export environment variables
export const env = validateEnv();
