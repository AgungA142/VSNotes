import { z } from 'zod';
import { Summary } from '@models/Summary';
import { TranscriptSegment } from '@models/TranscriptSegment';
import { Session } from '@models/Session';
import { generateText } from '@services/integrations/text/text.service';
import { AppError } from '@middleware/error-handler';
import { logger } from '@config/logger';
import type { GenerateSummaryResponseDto } from '../../../types/summary/summary.dto';

const LENGTH_CONFIGS: Record<
  'short' | 'medium' | 'long',
  { contentInstruction: string; keyPointsInstruction: string }
> = {
  short: {
    contentInstruction:
      'Tulis HANYA 2-3 kalimat yang mencakup gambaran besar: topik apa yang dibahas dan apa kesimpulan utamanya. ' +
      'JANGAN sebutkan detail, contoh, sub-topik, atau poin spesifik apapun. ' +
      'Bayangkan menjelaskan ke seseorang dalam 15 detik.',
    keyPointsInstruction:
      'Tulis tepat 3 poin, masing-masing maksimal 8 kata, berupa label topik utama saja (bukan penjelasan).',
  },
  medium: {
    contentInstruction:
      'Tulis 2-3 paragraf pendek yang mencakup SEMUA topik utama yang dibahas. ' +
      'Setiap paragraf membahas satu kelompok topik. ' +
      'Sertakan konteks singkat untuk setiap topik agar pembaca memahami apa yang dibahas, ' +
      'tapi JANGAN masuk ke detail teknis atau contoh spesifik.',
    keyPointsInstruction:
      'Tulis 5-7 poin, masing-masing 1 kalimat yang menjelaskan isi atau temuan dari topik tersebut.',
  },
  long: {
    contentInstruction:
      'Tulis rangkuman KOMPREHENSIF dan LENGKAP dalam 5-7 paragraf. ' +
      'WAJIB mencakup SETIAP topik, subtopik, konsep, contoh, angka, dan detail yang disebutkan di transkrip. ' +
      'Struktur: (1) Pembuka: konteks dan tujuan pembahasan. ' +
      '(2-5) Isi: setiap paragraf membahas satu topik secara mendalam — jelaskan konsep, sebab-akibat, contoh yang disebutkan. ' +
      '(6) Penutup: kesimpulan dan poin penting yang perlu diingat. ' +
      'Pembaca harus bisa memahami seluruh isi video hanya dari rangkuman ini.',
    keyPointsInstruction:
      'Tulis 8-12 poin. Setiap poin berupa kalimat lengkap yang menjelaskan satu temuan, konsep, ' +
      'atau fakta spesifik dari transkrip — sertakan detail seperti angka, nama, atau contoh jika ada.',
  },
};

const summaryResponseSchema = z.object({
  content: z.string().min(1),
  keyPoints: z.array(z.string()),
});

// ============================================================================
// Generate summary
// ============================================================================

export async function generateSummary(
  sessionId: string,
  userId: string,
  lengthPref: 'short' | 'medium' | 'long' = 'medium'
): Promise<GenerateSummaryResponseDto> {
  const session = await Session.findOne({ _id: sessionId, userId });
  if (!session) {
    throw new AppError(404, 'SESSION_NOT_FOUND', 'Sesi tidak ditemukan');
  }

  // Invariant (Property 4): summary hanya bisa dibuat jika ada transcript
  const segments = await TranscriptSegment.find({ sessionId, userId }).sort({ timestampSec: 1 });
  if (segments.length === 0) {
    throw new AppError(
      400,
      'NO_TRANSCRIPT',
      'Rangkuman membutuhkan transkripsi. Belum ada transkripsi untuk sesi ini.'
    );
  }

  const transcriptText = segments.map((s) => s.text).join('\n');

  let content: string;
  let keyPoints: string[];

  try {
    const prompt = buildSummaryPrompt(transcriptText, lengthPref);
    const raw = await generateText(prompt);
    ({ content, keyPoints } = parseSummaryResponse(raw));
  } catch (err) {
    logger.warn('Gemini API error saat generate summary, menggunakan fallback', {
      sessionId,
      err,
    });
    ({ content, keyPoints } = fallbackExtract(segments.map((s) => s.text)));
  }

  // Upsert: update jika sudah ada, buat baru jika belum (sessionId adalah unique key)
  const summary = await Summary.findOneAndUpdate(
    { sessionId, userId },
    { content, keyPoints, lengthPref },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return toDto(summary);
}

// ============================================================================
// Get existing summary
// ============================================================================

export async function getSummary(
  sessionId: string,
  userId: string
): Promise<GenerateSummaryResponseDto> {
  const session = await Session.findOne({ _id: sessionId, userId });
  if (!session) {
    throw new AppError(404, 'SESSION_NOT_FOUND', 'Sesi tidak ditemukan');
  }

  const summary = await Summary.findOne({ sessionId, userId });
  if (!summary) {
    throw new AppError(404, 'SUMMARY_NOT_FOUND', 'Rangkuman belum dibuat untuk sesi ini');
  }

  return toDto(summary);
}

// ============================================================================
// Helpers
// ============================================================================

function toDto(summary: InstanceType<typeof Summary>): GenerateSummaryResponseDto {
  const s = summary.toObject();
  return {
    summaryId: String(s._id),
    sessionId: String(s.sessionId),
    content: s.content,
    keyPoints: s.keyPoints,
    lengthPref: s.lengthPref,
    createdAt: s.createdAt.toISOString(),
  };
}

function buildSummaryPrompt(
  transcript: string,
  lengthPref: 'short' | 'medium' | 'long'
): string {
  const { contentInstruction, keyPointsInstruction } = LENGTH_CONFIGS[lengthPref];
  return (
    'Kamu adalah asisten yang merangkum transkrip video. Ikuti aturan berikut dengan ketat:\n' +
    '1. Gunakan HANYA informasi yang ada di transkrip. Jangan tambahkan fakta, opini, atau pengetahuan dari luar.\n' +
    '2. Jika sesuatu tidak disebutkan di transkrip, JANGAN tulis.\n' +
    '3. Rangkuman harus mencerminkan proporsi pembahasan di transkrip — topik yang banyak dibahas mendapat porsi lebih.\n\n' +
    `=== ATURAN FORMAT content ===\n${contentInstruction}\n\n` +
    `=== ATURAN FORMAT keyPoints ===\n${keyPointsInstruction}\n\n` +
    'Return JSON (tanpa markdown, tanpa teks lain): {"content": string, "keyPoints": string[]}.\n\n' +
    `=== TRANSKRIP ===\n${transcript}`
  );
}

function parseSummaryResponse(raw: string): { content: string; keyPoints: string[] } {
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  // 1. Coba JSON.parse standar
  try {
    const parsed = JSON.parse(cleaned);
    return summaryResponseSchema.parse(parsed);
  } catch {
    // lanjut ke fallback
  }

  // 2. AI kadang menghasilkan JSON malformed (paragraf jadi key terpisah).
  //    Ekstrak "content" dan "keyPoints" dengan regex.
  try {
    // Ambil nilai setelah "content": "..." — berhenti di ", "keyPoints" atau "}
    const contentMatch = cleaned.match(/"content"\s*:\s*"([\s\S]*?)"\s*(?:,\s*"keyPoints"|,\s*}|})/);
    const keyPointsMatch = cleaned.match(/"keyPoints"\s*:\s*(\[[\s\S]*?\])/);

    if (contentMatch) {
      const content = contentMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');

      let keyPoints: string[] = [];
      if (keyPointsMatch) {
        try {
          const parsed = JSON.parse(keyPointsMatch[1]);
          if (Array.isArray(parsed)) keyPoints = parsed.filter((x) => typeof x === 'string');
        } catch {
          // keyPoints tetap []
        }
      }

      return { content, keyPoints };
    }
  } catch {
    // lanjut ke last resort
  }

  // 3. Last resort: kembalikan teks mentah sebagai content
  logger.warn('Gagal parse response AI untuk summary', { raw: raw.slice(0, 300) });
  return { content: cleaned, keyPoints: [] };
}

function fallbackExtract(texts: string[]): { content: string; keyPoints: string[] } {
  const keyPoints: string[] = [];

  for (const text of texts) {
    if (keyPoints.length >= 5) break;
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    keyPoints.push(...sentences.slice(0, 2));
  }

  const trimmed = keyPoints.slice(0, 5);
  const content = trimmed.join(' ');

  return { content, keyPoints: trimmed };
}
