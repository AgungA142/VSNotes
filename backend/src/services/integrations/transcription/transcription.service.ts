import { env } from '@config/env';
import { logger } from '@config/logger';
import { transcribeAudio as transcribeWithGemini } from '../gemini/gemini.service';
import { transcribeAudio as transcribeWithGroq } from './groq.provider';

export interface TranscriptionResult {
  text: string;
  language: string;
}

function isRateLimit(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('RESOURCE_EXHAUSTED');
}

/**
 * Transcribe audio.
 * - TRANSCRIPTION_PROVIDER=gemini (default): coba Gemini, auto-fallback ke Groq jika 429
 * - TRANSCRIPTION_PROVIDER=groq: selalu pakai Groq tanpa fallback
 *
 * Fallback ke Groq hanya aktif jika GROQ_API_KEY di-set.
 */
export async function transcribeAudio(audioBuffer: Buffer): Promise<TranscriptionResult> {
  const provider = env.TRANSCRIPTION_PROVIDER;

  if (provider === 'groq') {
    if (!env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY tidak di-set. Tambahkan ke .env lalu restart server.');
    }
    return transcribeWithGroq(audioBuffer);
  }

  // provider === 'gemini' (default) — coba Gemini, fallback ke Groq saat rate limit
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY tidak di-set. Tambahkan ke .env lalu restart server.');
  }

  try {
    return await transcribeWithGemini(audioBuffer);
  } catch (err) {
    if (isRateLimit(err) && env.GROQ_API_KEY) {
      logger.warn('Gemini rate limit (429) — fallback ke Groq Whisper', {
        error: err instanceof Error ? err.message : String(err),
      });
      return transcribeWithGroq(audioBuffer);
    }
    throw err;
  }
}
