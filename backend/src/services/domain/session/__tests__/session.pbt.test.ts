/**
 * Property-Based Tests: Session Service
 * Property 3 — Tidak Ada Sesi Aktif Ganda
 * Invariant: count(sessions where userId = X and status = 'active') <= 1
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { Session } from '@models/Session';
import { User } from '@models/User';
import { createSession, updateSession } from '../session.service';

// ============================================================================
// Setup MongoDB
// ============================================================================

beforeAll(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/test-session-pbt');
  await User.ensureIndexes();
  await Session.ensureIndexes();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

beforeEach(async () => {
  await Session.deleteMany({});
  await User.deleteMany({});
});

// ============================================================================
// Helpers
// ============================================================================

async function createTestUser(email: string): Promise<string> {
  const user = await User.create({
    email,
    passwordHash: 'hashedpw',
    name: 'Test User',
  });
  return String(user._id);
}

function makeSessionInput(overrides?: { videoTitle?: string; sourceType?: 'local' | 'streaming' }) {
  return {
    videoTitle: overrides?.videoTitle ?? 'Test Video',
    sourceApp: 'Google Chrome',
    sourceType: overrides?.sourceType ?? ('streaming' as const),
    deviceId: 'device-test',
  };
}

async function countActiveSessions(userId: string): Promise<number> {
  return Session.countDocuments({ userId, status: 'active' });
}

// ============================================================================
// Property 3: Tidak Ada Sesi Aktif Ganda
// ============================================================================

describe('Property: Tidak Ada Sesi Aktif Ganda', () => {
  it('Property: setelah N permintaan buat sesi secara berurutan, paling banyak 1 sesi aktif', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 8 }),
        async (numRequests) => {
          await Session.deleteMany({});
          await User.deleteMany({});

          const userId = await createTestUser(`user-${Date.now()}@example.com`);

          let succeeded = 0;
          for (let i = 0; i < numRequests; i++) {
            try {
              await createSession(userId, makeSessionInput({ videoTitle: `Video ${i + 1}` }));
              succeeded++;
            } catch (err: unknown) {
              expect((err as { code?: string }).code).toBe('ACTIVE_SESSION_EXISTS');
            }
          }

          expect(succeeded).toBeLessThanOrEqual(1);
          expect(await countActiveSessions(userId)).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Property: concurrent requests pun tidak menghasilkan lebih dari 1 sesi aktif', async () => {
    // Partial unique index di MongoDB menjamin atomicity ini di level database
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 6 }),
        async (numRequests) => {
          await Session.deleteMany({});
          await User.deleteMany({});

          const userId = await createTestUser(`concurrent-${Date.now()}@example.com`);

          const results = await Promise.allSettled(
            Array.from({ length: numRequests }, (_, i) =>
              createSession(userId, makeSessionInput({ videoTitle: `Video ${i + 1}` }))
            )
          );

          const succeeded = results.filter((r) => r.status === 'fulfilled');
          const failed = results.filter((r) => r.status === 'rejected');

          // Invariant: tepat 1 yang berhasil (atau 0 jika semua gagal — sangat jarang)
          expect(succeeded.length).toBeLessThanOrEqual(1);
          for (const f of failed) {
            expect((f as PromiseRejectedResult).reason.code).toBe('ACTIVE_SESSION_EXISTS');
          }

          expect(await countActiveSessions(userId)).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Property: setelah sesi diselesaikan, user bisa membuat sesi baru', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }),
        async (numSessions) => {
          await Session.deleteMany({});
          await User.deleteMany({});

          const userId = await createTestUser(`seq-${Date.now()}@example.com`);

          for (let i = 0; i < numSessions; i++) {
            // Buat sesi baru
            const session = await createSession(userId, makeSessionInput({ videoTitle: `Video ${i + 1}` }));
            expect(await countActiveSessions(userId)).toBe(1);

            // Selesaikan sesi sebelum membuat sesi berikutnya
            await updateSession(session.sessionId, userId, { status: 'completed' });
            expect(await countActiveSessions(userId)).toBe(0);
          }

          // Total sesi = numSessions, semua completed
          const total = await Session.countDocuments({ userId });
          const active = await countActiveSessions(userId);
          expect(total).toBe(numSessions);
          expect(active).toBe(0);
        }
      ),
      { numRuns: 15 }
    );
  });

  it('Property: sesi aktif tidak pernah > 1 setelah campuran create/complete/dismiss', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.oneof(
            fc.constant('create' as const),
            fc.constant('complete' as const),
            fc.constant('dismiss' as const)
          ),
          { minLength: 1, maxLength: 10 }
        ),
        async (actions) => {
          await Session.deleteMany({});
          await User.deleteMany({});

          const userId = await createTestUser(`mix-${Date.now()}@example.com`);
          let currentSessionId: string | null = null;

          for (const action of actions) {
            if (action === 'create') {
              try {
                const s = await createSession(userId, makeSessionInput());
                currentSessionId = s.sessionId;
              } catch {
                // Gagal karena sudah ada sesi aktif — itu yang diharapkan
              }
            } else if (action === 'complete' && currentSessionId) {
              await updateSession(currentSessionId, userId, { status: 'completed' });
              currentSessionId = null;
            } else if (action === 'dismiss' && currentSessionId) {
              await updateSession(currentSessionId, userId, { status: 'dismissed' });
              currentSessionId = null;
            }

            // Invariant dicek setiap langkah
            const activeCount = await countActiveSessions(userId);
            expect(activeCount).toBeLessThanOrEqual(1);
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  it('Property: isolasi data — sesi aktif satu user tidak mempengaruhi user lain', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 4 }),
        async (numUsers) => {
          await Session.deleteMany({});
          await User.deleteMany({});

          const userIds = await Promise.all(
            Array.from({ length: numUsers }, (_, i) =>
              createTestUser(`user${i}-${Date.now()}@example.com`)
            )
          );

          // Setiap user membuat 1 sesi aktif
          await Promise.all(
            userIds.map((uid) => createSession(uid, makeSessionInput()))
          );

          // Setiap user hanya punya 1 sesi aktif (tidak tercampur)
          for (const uid of userIds) {
            const count = await countActiveSessions(uid);
            expect(count).toBe(1);
          }
        }
      ),
      { numRuns: 15 }
    );
  });
});
