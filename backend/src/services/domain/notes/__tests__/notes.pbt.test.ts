/**
 * Property-Based Tests: Notes
 * Property 2 — Timestamp Catatan Valid
 * Invariant: untuk setiap note n: n.timestampSec >= 0
 *
 * Lapisan validasi:
 *   1. Zod schema (createNoteSchema) — menolak nilai negatif di controller layer
 *   2. MongoDB model (Note.timestampSec min: 0) — safety net di DB layer
 *   3. Service (createNote) — meneruskan nilai dari input yang sudah divalidasi
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { Note } from '@models/Note';
import { Session } from '@models/Session';
import { User } from '@models/User';
import { createNote } from '../notes.service';
import { createNoteSchema } from '@utils/validation/notes/notes.validation';

// ============================================================================
// Setup
// ============================================================================

beforeAll(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/test-notes-pbt');
  await Session.ensureIndexes();
  await User.ensureIndexes();
  await Note.ensureIndexes();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

beforeEach(async () => {
  await Note.deleteMany({});
  await Session.deleteMany({});
  await User.deleteMany({});
});

// ============================================================================
// Helpers
// ============================================================================

async function createFixtures() {
  const user = await User.create({
    email: `np-${Date.now()}-${Math.random()}@example.com`,
    passwordHash: 'pw',
    name: 'Test',
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

async function allNotesHaveValidTimestamp(sessionId: string): Promise<boolean> {
  const notes = await Note.find({ sessionId });
  return notes.every((n) => n.timestampSec >= 0);
}

// ============================================================================
// Property 2: Timestamp Catatan Valid
// ============================================================================

describe('Property: Timestamp Catatan Valid (timestampSec >= 0)', () => {

  // --------------------------------------------------------------------------
  // Lapisan 1: Zod schema
  // --------------------------------------------------------------------------

  it('Property: zod schema menolak semua nilai negatif', () => {
    fc.assert(
      fc.property(
        fc.integer({ max: -1 }),
        (negativeTs) => {
          const result = createNoteSchema.safeParse({
            text: 'Catatan test',
            timestampSec: negativeTs,
          });
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues[0].path).toContain('timestampSec');
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it('Property: zod schema menerima semua nilai non-negatif', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 86400 }), // 0 sampai 24 jam dalam detik
        (validTs) => {
          const result = createNoteSchema.safeParse({
            text: 'Catatan test',
            timestampSec: validTs,
          });
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });

  // --------------------------------------------------------------------------
  // Lapisan 2: MongoDB model
  // --------------------------------------------------------------------------

  it('Property: MongoDB model menolak timestampSec negatif di level DB', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: -10000, max: -1 }),
        async (negativeTs) => {
          await Note.deleteMany({});
          await Session.deleteMany({});
          await User.deleteMany({});

          const { userId, sessionId } = await createFixtures();

          await expect(
            Note.create({ sessionId, userId, timestampSec: negativeTs, text: 'Test', type: 'manual' })
          ).rejects.toThrow();

          // Invariant: tidak ada note dengan timestampSec negatif di DB
          expect(await allNotesHaveValidTimestamp(sessionId)).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });

  // --------------------------------------------------------------------------
  // Lapisan 3: Service — createNote dengan nilai campuran
  // --------------------------------------------------------------------------

  it('Property: setelah N operasi createNote, semua note di DB punya timestampSec >= 0', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            timestampSec: fc.integer({ min: -100, max: 100000 }),
            text: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          { minLength: 1, maxLength: 8 }
        ),
        async (inputs) => {
          await Note.deleteMany({});
          await Session.deleteMany({});
          await User.deleteMany({});

          const { userId, sessionId } = await createFixtures();

          for (const input of inputs) {
            const valid = createNoteSchema.safeParse(input);
            if (valid.success) {
              await createNote(sessionId, userId, valid.data);
            } else {
              // Input negatif: pastikan service juga menolak jika dilewatkan langsung
              if (input.timestampSec < 0) {
                await expect(
                  Note.create({ sessionId, userId, ...input, type: 'manual' })
                ).rejects.toThrow();
              }
            }
          }

          // Invariant dicek di DB
          expect(await allNotesHaveValidTimestamp(sessionId)).toBe(true);
        }
      ),
      { numRuns: 25 }
    );
  });

  // --------------------------------------------------------------------------
  // Edge cases
  // --------------------------------------------------------------------------

  it('Property: timestampSec = 0 (awal video) selalu valid', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(0),
        async (ts) => {
          await Note.deleteMany({});
          await Session.deleteMany({});
          await User.deleteMany({});

          const { userId, sessionId } = await createFixtures();
          const note = await createNote(sessionId, userId, { timestampSec: ts, text: 'Awal video.' });

          expect(note.timestampSec).toBe(0);
        }
      ),
      { numRuns: 5 }
    );
  });

  it('Property: timestampSec sangat besar (melebihi durasi video) tetap valid', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 86401, max: 999999 }), // lebih dari 24 jam
        async (largeTs) => {
          await Note.deleteMany({});
          await Session.deleteMany({});
          await User.deleteMany({});

          const { userId, sessionId } = await createFixtures();
          const note = await createNote(sessionId, userId, {
            timestampSec: largeTs,
            text: 'Catatan dengan timestamp besar.',
          });

          // Tidak ada batas atas → harus tersimpan dengan nilai asli
          expect(note.timestampSec).toBe(largeTs);
          expect(await allNotesHaveValidTimestamp(sessionId)).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Property: float timestampSec dibulatkan atau ditolak — tidak pernah < 0 di DB', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: 0, max: 3600, noNaN: true }),
        async (floatTs) => {
          await Note.deleteMany({});
          await Session.deleteMany({});
          await User.deleteMany({});

          const { userId, sessionId } = await createFixtures();

          // Service menerima atau menolak — yang penting tidak tersimpan negatif
          try {
            await createNote(sessionId, userId, { timestampSec: floatTs, text: 'Float timestamp.' });
          } catch {
            // Mungkin ditolak — tidak apa-apa
          }

          expect(await allNotesHaveValidTimestamp(sessionId)).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });
});
