import { z } from 'zod';
import { Note } from '@models/Note';
import { TranscriptSegment } from '@models/TranscriptSegment';
import { Session } from '@models/Session';
import { generateText } from '@services/integrations/text/text.service';
import { AppError } from '@middleware/error-handler';
import { logger } from '@config/logger';

const keyMomentsResponseSchema = z.array(
  z.object({
    timestampSec: z.number().nonnegative(),
    text: z.string().min(1),
    reason: z.string(),
  })
);

// ============================================================================
// Detect key moments from transcript and save as auto-notes
// ============================================================================

export async function detectKeyMoments(
  sessionId: string,
  userId: string,
): Promise<number> {
  const session = await Session.findOne({ _id: sessionId, userId });
  if (!session) return 0; // sesi sudah dihapus, abaikan

  // Tentukan batas waktu: segmen dengan timestampSec > batas ini yang akan diproses.
  // Menggunakan timestampSec dari segmen terakhir yang ada saat batch auto-notes sebelumnya dibuat,
  // bukan timestamp dari catatan yang di-return AI (AI bisa saja mengembalikan timestamp yang tidak akurat).
  let sinceTimestampSec = -1;
  const lastAutoNote = await Note.findOne({ sessionId, userId, type: 'auto' })
    .sort({ createdAt: -1 });

  if (lastAutoNote) {
    const lastProcessedSegment = await TranscriptSegment.findOne({
      sessionId,
      userId,
      createdAt: { $lte: lastAutoNote.createdAt },
    }).sort({ timestampSec: -1 });
    sinceTimestampSec = lastProcessedSegment?.timestampSec ?? -1;
  }

  const segments = await TranscriptSegment.find({
    sessionId,
    userId,
    timestampSec: { $gt: sinceTimestampSec },
  }).sort({ timestampSec: 1 });

  // Butuh minimal 2 segmen baru (±60 detik) agar analisis bermakna
  if (segments.length < 2) {
    return 0;
  }

  const transcriptLines = segments
    .map((s) => `[${s.timestampSec}s] ${s.text}`)
    .join('\n');

  let moments: z.infer<typeof keyMomentsResponseSchema>;

  try {
    const prompt = buildKeyMomentsPrompt(transcriptLines);
    const raw = await generateText(prompt);
    moments = parseKeyMomentsResponse(raw);
  } catch (err) {
    logger.warn('Gemini API error saat detectKeyMoments', { sessionId, err });
    return 0;
  }

  if (moments.length === 0) {
    return 0;
  }

  const noteDocs = moments.map((m) => ({
    sessionId,
    userId,
    timestampSec: m.timestampSec,
    text: m.text,
    type: 'auto' as const,
  }));

  await Note.insertMany(noteDocs);

  logger.info('Auto-notes berhasil dibuat', { sessionId, count: noteDocs.length });

  return noteDocs.length;
}

// ============================================================================
// Helpers
// ============================================================================

function buildKeyMomentsPrompt(transcriptLines: string): string {
  return (
    'Identifikasi 3-7 momen penting dari transkrip berikut. ' +
    'Untuk setiap momen, tulis field "text" berupa ringkasan singkat 2-3 kalimat yang menjelaskan apa yang dibahas pada momen tersebut — bukan sekadar judul atau label. ' +
    'Return JSON array (tanpa markdown): ' +
    '[{"timestampSec": number, "text": string, "reason": string}]. ' +
    '"timestampSec" diambil dari angka dalam tanda kurung siku di baris transkrip yang paling relevan. ' +
    '"reason" berisi alasan singkat mengapa momen ini penting.\n\n' +
    `Transkrip:\n${transcriptLines}`
  );
}

function parseKeyMomentsResponse(
  raw: string
): z.infer<typeof keyMomentsResponseSchema> {
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    return keyMomentsResponseSchema.parse(parsed);
  } catch {
    logger.warn('Gagal parse response Gemini untuk key moments', { raw });
    return [];
  }
}
