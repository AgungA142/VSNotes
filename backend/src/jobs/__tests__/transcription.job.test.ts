import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { TranscriptionJob } from '@models/TranscriptionJob';
import { TranscriptSegment } from '@models/TranscriptSegment';
import { Session } from '@models/Session';
import { User } from '@models/User';

// Mock transcription service dan sleep agar test cepat
vi.mock('@services/integrations/transcription/transcription.service', () => ({
  transcribeAudio: vi.fn(),
}));

vi.mock('@config/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// Override sleep agar retry tidak benar-benar menunggu
vi.mock('../transcription.job', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../transcription.job')>();
  return mod;
});

import { enqueueTranscriptionJob } from '../transcription.job';
import { transcribeAudio } from '@services/integrations/transcription/transcription.service';

// ============================================================================
// Setup MongoDB
// ============================================================================

beforeAll(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/test-transcription-job');
  await Session.ensureIndexes();
  await User.ensureIndexes();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

beforeEach(async () => {
  await TranscriptionJob.deleteMany({});
  await TranscriptSegment.deleteMany({});
  await Session.deleteMany({});
  await User.deleteMany({});
  vi.clearAllMocks();
});

// ============================================================================
// Helpers
// ============================================================================

async function createFixtures() {
  const user = await User.create({
    email: `tj-${Date.now()}@example.com`,
    passwordHash: 'hashedpw',
    name: 'Test User',
  });
  const session = await Session.create({
    userId: user._id,
    videoTitle: 'Test Video',
    sourceApp: 'Chrome',
    sourceType: 'streaming',
    deviceId: 'device-1',
    status: 'active',
  });
  return { userId: String(user._id), sessionId: String(session._id) };
}

function makeParams(overrides?: Partial<Parameters<typeof enqueueTranscriptionJob>[0]>) {
  return {
    sessionId: 'session-id',
    userId: 'user-id',
    audioData: Buffer.from('fake-audio').toString('base64'),
    timestampSec: 30,
    durationSec: 30,
    capturedAt: new Date(),
    ...overrides,
  };
}

// Tunggu job selesai diproses (background fire-and-forget)
async function waitForJob(jobId: string, timeoutMs = 3000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const job = await TranscriptionJob.findById(jobId);
    if (job?.status === 'completed' || job?.status === 'failed') return;
    await new Promise((r) => setTimeout(r, 50));
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('TranscriptionJob', () => {
  describe('enqueueTranscriptionJob()', () => {
    it('membuat job di DB dengan status pending', async () => {
      const { userId, sessionId } = await createFixtures();
      vi.mocked(transcribeAudio).mockResolvedValue({ text: 'ok', language: 'id' });

      const jobId = await enqueueTranscriptionJob(makeParams({ userId, sessionId }));

      const job = await TranscriptionJob.findById(jobId);
      expect(job).not.toBeNull();
      expect(['pending', 'processing', 'completed']).toContain(job!.status);
    });

    it('menyimpan TranscriptSegment dengan timestampSec yang benar setelah berhasil', async () => {
      const { userId, sessionId } = await createFixtures();
      vi.mocked(transcribeAudio).mockResolvedValue({ text: 'Halo dunia', language: 'id' });

      const jobId = await enqueueTranscriptionJob(
        makeParams({ userId, sessionId, timestampSec: 120 })
      );
      await waitForJob(jobId);

      const segment = await TranscriptSegment.findOne({ sessionId, timestampSec: 120 });
      expect(segment).not.toBeNull();
      expect(segment!.text).toBe('Halo dunia');
      expect(segment!.language).toBe('id');
      expect(segment!.timestampSec).toBe(120);
    });

    it('menyimpan timestampSec = 0 dengan benar (awal video)', async () => {
      const { userId, sessionId } = await createFixtures();
      vi.mocked(transcribeAudio).mockResolvedValue({ text: 'Intro video', language: 'en' });

      const jobId = await enqueueTranscriptionJob(
        makeParams({ userId, sessionId, timestampSec: 0 })
      );
      await waitForJob(jobId);

      const segment = await TranscriptSegment.findOne({ sessionId, timestampSec: 0 });
      expect(segment).not.toBeNull();
      expect(segment!.timestampSec).toBe(0);
    });

    it('job selesai dengan status completed setelah transkripsi berhasil', async () => {
      const { userId, sessionId } = await createFixtures();
      vi.mocked(transcribeAudio).mockResolvedValue({ text: 'Berhasil', language: 'id' });

      const jobId = await enqueueTranscriptionJob(makeParams({ userId, sessionId }));
      await waitForJob(jobId);

      const job = await TranscriptionJob.findById(jobId);
      expect(job!.status).toBe('completed');
    });

    it('upsert — retry tidak membuat duplikat segment untuk timestampSec yang sama', async () => {
      const { userId, sessionId } = await createFixtures();
      vi.mocked(transcribeAudio).mockResolvedValue({ text: 'Teks baru', language: 'id' });

      // Buat segment lama di timestampSec 60
      await TranscriptSegment.create({
        sessionId,
        userId,
        timestampSec: 60,
        text: 'Teks lama',
        language: 'id',
      });

      const jobId = await enqueueTranscriptionJob(
        makeParams({ userId, sessionId, timestampSec: 60 })
      );
      await waitForJob(jobId);

      // Hanya 1 segment di timestampSec 60 (upsert, bukan insert duplikat)
      const segments = await TranscriptSegment.find({ sessionId, timestampSec: 60 });
      expect(segments).toHaveLength(1);
      expect(segments[0].text).toBe('Teks baru');
    });
  });

  describe('retry logic', () => {
    it('mencoba ulang saat transkripsi gagal dan akhirnya berhasil', async () => {
      const { userId, sessionId } = await createFixtures();

      // Gagal sekali, berhasil di attempt kedua
      vi.mocked(transcribeAudio)
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValue({ text: 'Berhasil setelah retry', language: 'id' });

      const jobId = await enqueueTranscriptionJob(makeParams({ userId, sessionId }));
      await waitForJob(jobId, 8000);

      const job = await TranscriptionJob.findById(jobId);
      expect(job!.status).toBe('completed');

      const segment = await TranscriptSegment.findOne({ sessionId });
      expect(segment!.text).toBe('Berhasil setelah retry');
    }, 10000);

    it('tandai job failed setelah semua retry habis', async () => {
      const { userId, sessionId } = await createFixtures();

      // Selalu gagal
      vi.mocked(transcribeAudio).mockRejectedValue(new Error('Persistent error'));

      const jobId = await enqueueTranscriptionJob(makeParams({ userId, sessionId }));
      await waitForJob(jobId, 40000);

      const job = await TranscriptionJob.findById(jobId);
      expect(job!.status).toBe('failed');
      expect(job!.error).toContain('transcription_failed');
      expect(job!.retryCount).toBeGreaterThan(0);

      // Tidak ada segment yang tersimpan
      const segmentCount = await TranscriptSegment.countDocuments({ sessionId });
      expect(segmentCount).toBe(0);
    }, 45000);

    it('retryCount di DB mencerminkan jumlah percobaan yang gagal', async () => {
      const { userId, sessionId } = await createFixtures();
      vi.mocked(transcribeAudio).mockRejectedValue(new Error('Always fails'));

      const jobId = await enqueueTranscriptionJob(makeParams({ userId, sessionId }));
      await waitForJob(jobId, 40000);

      const job = await TranscriptionJob.findById(jobId);
      // MAX_RETRIES = 2, jadi ada 3 percobaan total → retryCount = 3
      expect(job!.retryCount).toBe(3);
    }, 45000);
  });
});
