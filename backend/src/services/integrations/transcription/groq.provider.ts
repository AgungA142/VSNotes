import Groq from 'groq-sdk';
import { env } from '@config/env';
import { logger } from '@config/logger';
import type { TranscriptionResult } from './transcription.service';

let groqClient: Groq | null = null;

function getClient(): Groq {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: env.GROQ_API_KEY });
  }
  return groqClient;
}

export async function transcribeAudio(audioBuffer: Buffer): Promise<TranscriptionResult> {
  const client = getClient();

  // Groq SDK membutuhkan File object (tersedia native di Node.js 20+)
  const file = new File([audioBuffer], 'audio.wav', { type: 'audio/wav' });

  const response = await client.audio.transcriptions.create({
    file,
    model: 'whisper-large-v3-turbo',
    response_format: 'verbose_json',
  });

  const text = response.text.trim();
  // verbose_json menyertakan detected language
  const language = (response as unknown as { language?: string }).language ?? 'id';

  logger.debug('Groq transcription selesai', { chars: text.length, language });

  return { text, language };
}
