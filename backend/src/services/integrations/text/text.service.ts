import Groq from 'groq-sdk';
import { env } from '@config/env';
import { logger } from '@config/logger';
import { generateText as generateWithGemini } from '../gemini/gemini.service';

// Model Groq untuk text generation — cukup cepat dan gratis
const GROQ_TEXT_MODEL = 'llama-3.3-70b-versatile';

let groqClient: Groq | null = null;
function getGroqClient(): Groq {
  if (!groqClient) groqClient = new Groq({ apiKey: env.GROQ_API_KEY });
  return groqClient;
}

function isRateLimit(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('RESOURCE_EXHAUSTED');
}

async function generateWithGroq(prompt: string): Promise<string> {
  const response = await getGroqClient().chat.completions.create({
    model: GROQ_TEXT_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
  });
  return response.choices[0]?.message?.content ?? '';
}

/**
 * Generate text menggunakan Gemini (default) dengan auto-fallback ke Groq Llama
 * saat Gemini terkena rate limit (429 / RESOURCE_EXHAUSTED).
 */
export async function generateText(prompt: string): Promise<string> {
  if (!env.GEMINI_API_KEY) {
    if (!env.GROQ_API_KEY) {
      throw new Error('Tidak ada API key AI yang dikonfigurasi (GEMINI_API_KEY atau GROQ_API_KEY).');
    }
    return generateWithGroq(prompt);
  }

  try {
    return await generateWithGemini(prompt);
  } catch (err) {
    if (isRateLimit(err) && env.GROQ_API_KEY) {
      logger.warn('Gemini rate limit (generateText) — fallback ke Groq Llama', {
        error: err instanceof Error ? err.message : String(err),
      });
      return generateWithGroq(prompt);
    }
    throw err;
  }
}
