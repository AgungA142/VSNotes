import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '@config/env';
import { logger } from '@config/logger';
import type { TranscriptionResult } from '../transcription/transcription.service';

const TRANSCRIPTION_MODEL = 'gemini-2.0-flash';
const TEXT_MODEL = 'gemini-2.0-flash';

function getClient(): GoogleGenerativeAI {
  return new GoogleGenerativeAI(env.GEMINI_API_KEY);
}

// ============================================================================
// Transkripsi audio
// ============================================================================

export async function transcribeAudio(audioBuffer: Buffer): Promise<TranscriptionResult> {
  const model = getClient().getGenerativeModel({ model: TRANSCRIPTION_MODEL });

  const audioPart = {
    inlineData: {
      data: audioBuffer.toString('base64'),
      mimeType: 'audio/wav' as const,
    },
  };

  const prompt =
    'Transcribe this audio accurately. ' +
    'Return only a JSON object with two fields: ' +
    '"text" (the full transcription) and "language" (ISO 639-1 language code, e.g. "id", "en"). ' +
    'Do not include any explanation or markdown. Example: {"text":"...", "language":"id"}';

  const result = await model.generateContent([audioPart, prompt]);
  const raw = result.response.text().trim();

  return parseTranscriptionResponse(raw);
}

function parseTranscriptionResponse(raw: string): TranscriptionResult {
  // Hapus markdown code block jika ada
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed.text === 'string' && typeof parsed.language === 'string') {
      return { text: parsed.text, language: parsed.language };
    }
  } catch {
    logger.warn('Gemini transcription response bukan JSON valid, pakai raw text', { raw });
  }

  // Fallback: gunakan raw text sebagai transkripsi
  return { text: cleaned, language: 'id' };
}

// ============================================================================
// Generate text umum (untuk summary, auto-notes, dsb.)
// ============================================================================

export async function generateText(prompt: string): Promise<string> {
  const model = getClient().getGenerativeModel({ model: TEXT_MODEL });
  const result = await model.generateContent(prompt);
  return result.response.text();
}
