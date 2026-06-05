/**
 * Property-Based Tests: Summary Service
 * Property 4 — Rangkuman Hanya Dibuat dari Transcript yang Ada
 * Invariant: summary hanya boleh ada jika count(transcripts where sessionId = S) > 0
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { Summary } from '@models/Summary';
import { TranscriptSegment } from '@models/TranscriptSegment';
import { Session } from '@models/Session';
import { User } from '@models/User';
import { generateSummary } from '../summary.service';

// Mock Gemini — test tidak butuh AI nyata
vi.mock('@services/integrations/text/text.service', () => ({
  generateText: vi.fn().mockResolvedValue('{"content":"Rangkuman test","keyPoints":["Poin 1","Poin 2"]}'),
}));

vi.mock('@config/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// ============================================================================
// Setup
// ============================================================================

beforeAll(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/test-summary-pbt');
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
});

// ============================================================================
// Helpers
// ============================================================================

async function createFixtures() {
  const user = await User.create({
    email: `s-${Date.now()}-${Math.random()}@example.com`,
    passwordHash: 'hashedpw',
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
  return { userId: String(user._id), sessionId: String(session._id) };
}

async function addSegments(sessionId: string, userId: string, texts: string[]) {
  for (let i = 0; i < texts.length; i++) {
    await TranscriptSegment.create({ sessionId, userId, timestampSec: i * 30, text: texts[i] });
  }
}

async function summaryExists(sessionId: string): Promise<boolean> {
  const count = await Summary.countDocuments({ sessionId });
  return count > 0;
}

// ============================================================================
// Property 4: Rangkuman Hanya Dibuat dari Transcript yang Ada
// ============================================================================

describe('Property: Rangkuman Hanya Dibuat dari Transcript yang Ada', () => {
  it('Property: generateSummary gagal (400) jika tidak ada transcript, summary tidak tersimpan', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('short' as const, 'medium' as const, 'long' as const),
        async (lengthPref) => {
          await Summary.deleteMany({});
          await TranscriptSegment.deleteMany({});
          await Session.deleteMany({});
          await User.deleteMany({});

          const { userId, sessionId } = await createFixtures();
          // Tidak ada transcript sama sekali

          await expect(
            generateSummary(sessionId, userId, lengthPref)
          ).rejects.toMatchObject({ code: 'NO_TRANSCRIPT', statusCode: 400 });

          // Invariant: tidak ada summary tersimpan
          expect(await summaryExists(sessionId)).toBe(false);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('Property: generateSummary berhasil jika ada minimal 1 segment valid, summary tersimpan', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.string({ minLength: 5, maxLength: 100 }).filter((s) => s.trim().length >= 3),
          { minLength: 1, maxLength: 5 }
        ),
        fc.constantFrom('short' as const, 'medium' as const, 'long' as const),
        async (texts, lengthPref) => {
          await Summary.deleteMany({});
          await TranscriptSegment.deleteMany({});
          await Session.deleteMany({});
          await User.deleteMany({});

          const { userId, sessionId } = await createFixtures();
          await addSegments(sessionId, userId, texts);

          const result = await generateSummary(sessionId, userId, lengthPref);

          expect(result.content).toBeTruthy();
          expect(result.sessionId).toBe(sessionId);

          // Invariant: summary ada di DB
          expect(await summaryExists(sessionId)).toBe(true);
        }
      ),
      { numRuns: 15 }
    );
  });

  it('Property: invariant dijaga di berbagai sesi — sesi dengan transcript punya summary, tanpa tidak', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Boolean array: true = sesi punya transcript, false = tidak
        fc.array(fc.boolean(), { minLength: 2, maxLength: 5 }),
        async (hasTranscriptList) => {
          await Summary.deleteMany({});
          await TranscriptSegment.deleteMany({});
          await Session.deleteMany({});
          await User.deleteMany({});

          const sessions: Array<{ sessionId: string; userId: string; hasTranscript: boolean }> = [];

          for (const hasTranscript of hasTranscriptList) {
            const { userId, sessionId } = await createFixtures();
            if (hasTranscript) {
              await addSegments(sessionId, userId, ['Transkrip pertama.', 'Transkrip kedua.']);
            }
            sessions.push({ sessionId, userId, hasTranscript });
          }

          // Generate summary untuk semua sesi — yang tanpa transcript harus ditolak
          for (const { sessionId, userId, hasTranscript } of sessions) {
            if (hasTranscript) {
              await expect(generateSummary(sessionId, userId, 'medium')).resolves.toBeDefined();
            } else {
              await expect(generateSummary(sessionId, userId, 'medium')).rejects.toMatchObject({
                code: 'NO_TRANSCRIPT',
              });
            }
          }

          // Verifikasi invariant di DB
          for (const { sessionId, hasTranscript } of sessions) {
            const exists = await summaryExists(sessionId);
            expect(exists).toBe(hasTranscript);
          }
        }
      ),
      { numRuns: 15 }
    );
  });

  it('Property: upsert — generate ulang tidak membuat duplikat summary', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 4 }),
        async (times) => {
          await Summary.deleteMany({});
          await TranscriptSegment.deleteMany({});
          await Session.deleteMany({});
          await User.deleteMany({});

          const { userId, sessionId } = await createFixtures();
          await addSegments(sessionId, userId, ['Transkrip.']);

          for (let i = 0; i < times; i++) {
            await generateSummary(sessionId, userId, 'medium');
          }

          // Tetap hanya 1 summary per sesi (upsert)
          const count = await Summary.countDocuments({ sessionId });
          expect(count).toBe(1);
        }
      ),
      { numRuns: 10 }
    );
  });

  // Edge cases
  it('menolak generate summary untuk sesi dengan transcript whitespace-only (Mongoose validation)', async () => {
    const { userId, sessionId } = await createFixtures();

    // Segment dengan text whitespace tidak bisa disimpan — Mongoose required validation
    await expect(
      TranscriptSegment.create({ sessionId, userId, timestampSec: 0, text: '   ' })
    ).rejects.toThrow();

    // Tidak ada segment valid → summary ditolak
    await expect(generateSummary(sessionId, userId, 'medium')).rejects.toMatchObject({
      code: 'NO_TRANSCRIPT',
    });
  });

  it('menolak generate summary untuk sesi yang tidak ditemukan (404)', async () => {
    const fakeSessionId = new mongoose.Types.ObjectId().toString();
    const { userId } = await createFixtures();

    await expect(generateSummary(fakeSessionId, userId, 'medium')).rejects.toMatchObject({
      statusCode: 404,
      code: 'SESSION_NOT_FOUND',
    });
  });
});
