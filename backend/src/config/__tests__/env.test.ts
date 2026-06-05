/**
 * Environment Configuration Tests
 */

import { describe, it, expect } from 'vitest';
import { env } from '../env';

describe('Environment Configuration', () => {
  it('should load environment variables', () => {
    // If env validation fails, the import will throw an error
    expect(env).toBeDefined();
  });

  it('should have required environment variables', () => {
    expect(env.PORT).toBeDefined();
    expect(env.NODE_ENV).toBeDefined();
    expect(env.MONGODB_URI).toBeDefined();
    expect(env.JWT_SECRET).toBeDefined();
    expect(env.GEMINI_API_KEY).toBeDefined();
  });

  it('should parse CORS_ORIGINS as array', () => {
    expect(Array.isArray(env.CORS_ORIGINS)).toBe(true);
    expect(env.CORS_ORIGINS.length).toBeGreaterThan(0);
  });

  it('should parse numeric values correctly', () => {
    expect(typeof env.PORT).toBe('number');
    expect(typeof env.AUDIO_CHUNK_SIZE_SEC).toBe('number');
    expect(typeof env.AUDIO_SAMPLE_RATE).toBe('number');
  });
});
