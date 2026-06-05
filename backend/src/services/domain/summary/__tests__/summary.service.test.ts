import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Summary } from '@models/Summary';
import { TranscriptSegment } from '@models/TranscriptSegment';
import { Session } from '@models/Session';
import { User } from '@models/User';
import { generateSummary } from '../summary.service';

vi.mock('@services/integrations/text/text.service', () => ({
  generateText: vi.fn(),
}));
vi.mock('@config/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { generateText } from '@services/integrations/text/text.service';

// ============================================================================
// Setup
// ============================================================================

beforeAll(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/test-summary-service');
  await Session.ensureIndexes();
  await User.ensureIndexes();
  await Summary.ensureIndexes();
});
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});
beforeEach(async () => {
  await Summary.deleteMany({});
  await TranscriptSegment.deleteMany({});
  await Session.deleteMany({});
  await User.deleteMany({});
  vi.clearAllMocks();
});

// ============================================================================
// Helpers
// ============================================================================

async function createFixtures(transcriptTexts: string[] = []) {
  const user = await User.create({
    email: `ss-${Date.now()}@example.com`,
    passwordHash: 'pw',
    name: 'Test',
  });
  const session = await Session.create({
    userId: user._id,
    videoTitle: 'Test Video',
    sourceApp: 'Chrome',
    sourceType: 'streaming',
    deviceId: 'device-1',
    status: 'completed',
  });
  const sessionId = String(session._id);
  const userId = String(user._id);

  for (let i = 0; i < transcriptTexts.length; i++) {
    await TranscriptSegment.create({ sessionId, userId, timestampSec: i * 30, text: transcriptTexts[i] });
  }
  return { sessionId, userId };
}

// ============================================================================
// Format output rangkuman
// ============================================================================

describe('generateSummary() — format output', () => {
  it('mengembalikan content dan keyPoints dari JSON valid', async () => {
    const { sessionId, userId } = await createFixtures(['Belajar React Hooks itu mudah.']);
    vi.mocked(generateText).mockResolvedValue(
      '{"content":"React Hooks mempermudah state management.","keyPoints":["useState","useEffect"]}'
    );

    const result = await generateSummary(sessionId, userId, 'medium');

    expect(result.content).toBe('React Hooks mempermudah state management.');
    expect(result.keyPoints).toEqual(['useState', 'useEffect']);
    expect(result.lengthPref).toBe('medium');
    expect(result.sessionId).toBe(sessionId);
  });

  it('mem-parse response dari dalam markdown code block', async () => {
    const { sessionId, userId } = await createFixtures(['Python adalah bahasa scripting populer.']);
    vi.mocked(generateText).mockResolvedValue(
      '```json\n{"content":"Python mudah dipelajari.","keyPoints":["sintaks bersih","banyak library"]}\n```'
    );

    const result = await generateSummary(sessionId, userId, 'short');

    expect(result.content).toBe('Python mudah dipelajari.');
    expect(result.keyPoints).toHaveLength(2);
  });

  it('menggunakan regex fallback saat JSON malformed tetapi content bisa diekstrak', async () => {
    const { sessionId, userId } = await createFixtures(['Transkrip video machine learning.']);
    // JSON tidak valid karena ada trailing comma
    vi.mocked(generateText).mockResolvedValue(
      '{"content":"Machine learning menggunakan data untuk prediksi.","keyPoints":["supervised","unsupervised",]}'
    );

    const result = await generateSummary(sessionId, userId, 'medium');

    // Fallback regex tetap mengekstrak content
    expect(result.content).toBeTruthy();
  });

  it('mengembalikan raw text sebagai content (last resort) saat semua parsing gagal', async () => {
    const { sessionId, userId } = await createFixtures(['Transkrip ini tidak bisa diparse.']);
    vi.mocked(generateText).mockResolvedValue('Ini bukan JSON sama sekali, hanya teks biasa.');

    const result = await generateSummary(sessionId, userId, 'medium');

    // Last resort: teks dikembalikan sebagai content
    expect(result.content).toBeTruthy();
    expect(result.keyPoints).toEqual([]);
  });

  it('menghasilkan summary berbeda untuk tiap lengthPref', async () => {
    const transcripts = ['Pelajaran tentang algoritma sorting.', 'QuickSort lebih cepat dari BubbleSort.'];

    for (const pref of ['short', 'medium', 'long'] as const) {
      await Summary.deleteMany({});
      await Session.deleteMany({});
      await User.deleteMany({});
      await TranscriptSegment.deleteMany({});

      const { sessionId, userId } = await createFixtures(transcripts);
      vi.mocked(generateText).mockResolvedValue(
        `{"content":"Rangkuman ${pref}","keyPoints":["poin ${pref}"]}`
      );

      const result = await generateSummary(sessionId, userId, pref);
      expect(result.lengthPref).toBe(pref);

      // Prompt yang dikirim ke AI harus mengandung instruksi sesuai pref
      const promptSent = vi.mocked(generateText).mock.calls[0][0] as string;
      expect(promptSent).toContain('=== ATURAN FORMAT content ===');
      vi.clearAllMocks();
    }
  });
});

// ============================================================================
// Fallback mechanism saat Gemini API error
// ============================================================================

describe('generateSummary() — fallback saat AI error', () => {
  it('menggunakan fallback extract saat generateText melempar error', async () => {
    const { sessionId, userId } = await createFixtures([
      'Kalimat pertama yang penting.',
      'Kalimat kedua berisi informasi berguna.',
    ]);
    vi.mocked(generateText).mockRejectedValue(new Error('Gemini API timeout'));

    const result = await generateSummary(sessionId, userId, 'medium');

    // Fallback mengekstrak kalimat dari transcript
    expect(result.content).toBeTruthy();
    expect(result.keyPoints.length).toBeGreaterThan(0);
    // Hasil disimpan ke DB meski dari fallback
    const saved = await Summary.findOne({ sessionId });
    expect(saved).not.toBeNull();
  });

  it('fallback mengekstrak maksimal 5 key points dari transcript', async () => {
    // 10 segmen → fallback ambil maks 5 poin
    const segments = Array.from({ length: 10 }, (_, i) => `Kalimat ${i + 1} ini penting.`);
    const { sessionId, userId } = await createFixtures(segments);
    vi.mocked(generateText).mockRejectedValue(new Error('Rate limit'));

    const result = await generateSummary(sessionId, userId, 'medium');

    expect(result.keyPoints.length).toBeLessThanOrEqual(5);
  });

  it('fallback tetap menghasilkan summary valid saat rate limit 429', async () => {
    const { sessionId, userId } = await createFixtures(['Transkrip penting tentang React.']);
    vi.mocked(generateText).mockRejectedValue(new Error('429 Too Many Requests'));

    const result = await generateSummary(sessionId, userId, 'short');

    expect(result).toBeDefined();
    expect(result.content).toBeTruthy();
  });
});

// ============================================================================
// Transcript pendek (< 100 kata)
// ============================================================================

describe('generateSummary() — transcript pendek', () => {
  it('berhasil generate summary dari 1 segment pendek', async () => {
    const { sessionId, userId } = await createFixtures(['React adalah library JavaScript.']);
    vi.mocked(generateText).mockResolvedValue('{"content":"React adalah library JS.","keyPoints":["React","JavaScript"]}');

    const result = await generateSummary(sessionId, userId, 'short');

    expect(result.content).toBeTruthy();
  });

  it('transcript 1 kata tetap diproses (tidak diblokir service)', async () => {
    const { sessionId, userId } = await createFixtures(['React.']);
    vi.mocked(generateText).mockResolvedValue('{"content":"Tentang React.","keyPoints":["React"]}');

    const result = await generateSummary(sessionId, userId, 'short');

    expect(result).toBeDefined();
    // Prompt tetap berisi teks transcript
    const prompt = vi.mocked(generateText).mock.calls[0][0] as string;
    expect(prompt).toContain('React.');
  });

  it('transcript kosong (0 segment) — 400 NO_TRANSCRIPT', async () => {
    const { sessionId, userId } = await createFixtures([]);

    await expect(generateSummary(sessionId, userId, 'medium')).rejects.toMatchObject({
      statusCode: 400,
      code: 'NO_TRANSCRIPT',
    });
    expect(generateText).not.toHaveBeenCalled();
  });
});
