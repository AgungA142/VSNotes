import { Types } from 'mongoose';
import { TranscriptionJob } from '@models/TranscriptionJob';
import { TranscriptSegment } from '@models/TranscriptSegment';
import { transcribeAudio } from '@services/integrations/transcription/transcription.service';
import { logger } from '@config/logger';

const MAX_RETRIES = 2;
const RETRY_DELAYS_MS = [5000, 15000]; // exponential backoff: 5s, 15s

// Parse "retry in Xs" from Gemini 429 response body
function parseRetryDelayMs(errorMessage: string): number | null {
  const match = errorMessage.match(/Please retry in ([\d.]+)s/);
  if (match) return Math.ceil(parseFloat(match[1])) * 1000;
  return null;
}

// ============================================================================
// Enqueue job baru
// ============================================================================

export async function enqueueTranscriptionJob(params: {
  sessionId: string;
  userId: string;
  audioData: string;
  timestampSec: number;
  durationSec: number;
  capturedAt: Date;
}): Promise<string> {
  const job = await TranscriptionJob.create({
    sessionId: new Types.ObjectId(params.sessionId),
    userId: new Types.ObjectId(params.userId),
    audioData: params.audioData,
    timestampSec: params.timestampSec,
    durationSec: params.durationSec,
    capturedAt: params.capturedAt,
    status: 'pending',
    retryCount: 0,
  });

  // Proses di background — tidak await agar response cepat
  processJobWithRetry(String(job._id)).catch((err) => {
    logger.error('Unhandled error di processJobWithRetry', { jobId: String(job._id), err });
  });

  return String(job._id);
}

// ============================================================================
// Proses job dengan retry + exponential backoff
// ============================================================================

async function processJobWithRetry(jobId: string): Promise<void> {
  const job = await TranscriptionJob.findById(jobId);
  if (!job) return;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_DELAYS_MS[attempt - 1] ?? 15000;
      await sleep(delay);

      // Reload job — bisa jadi sudah di-cancel dari luar
      const reloaded = await TranscriptionJob.findById(jobId);
      if (!reloaded || reloaded.status === 'completed') return;
    }

    try {
      await TranscriptionJob.findByIdAndUpdate(jobId, { status: 'processing' });

      const audioBuffer = Buffer.from(job.audioData, 'base64');
      const result = await transcribeAudio(audioBuffer);

      // Upsert segment — jika retry, overwrite teks lama bukan create duplikat
      await TranscriptSegment.findOneAndUpdate(
        { sessionId: job.sessionId, userId: job.userId, timestampSec: job.timestampSec },
        { text: result.text, language: result.language },
        { upsert: true },
      );

      await TranscriptionJob.findByIdAndUpdate(jobId, { status: 'completed' });

      logger.info('Transkripsi berhasil', {
        jobId,
        sessionId: String(job.sessionId),
        timestampSec: job.timestampSec,
      });

      return; // sukses, keluar dari loop
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const isLastAttempt = attempt === MAX_RETRIES;
      const is429 = errorMessage.includes('429') || errorMessage.includes('Too Many Requests');

      logger.warn(`Transkripsi gagal (attempt ${attempt + 1}/${MAX_RETRIES + 1})`, {
        jobId,
        error: errorMessage,
      });

      await TranscriptionJob.findByIdAndUpdate(jobId, {
        retryCount: attempt + 1,
        status: isLastAttempt ? 'failed' : 'pending',
        ...(isLastAttempt && { error: `transcription_failed: ${errorMessage}` }),
      });

      if (isLastAttempt) {
        logger.error('Transkripsi gagal setelah semua retry', { jobId, error: errorMessage });
        return;
      }

      // For rate-limit errors, honour the server-suggested retry delay
      if (is429) {
        const suggested = parseRetryDelayMs(errorMessage);
        if (suggested) {
          logger.info(`Rate limit — menunggu ${suggested / 1000}s sebelum retry`, { jobId });
          await sleep(suggested);
          continue;
        }
      }
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
