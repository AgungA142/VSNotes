/**
 * Property-Based Tests: Stale Sessions Cleanup Job
 * Property 6 — Sesi Selalu Berakhir
 * Invariant: tidak ada sesi `active` dengan `startedAt` lebih dari 24 jam lalu
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { Session } from '@models/Session';
import { User } from '@models/User';
import { cleanupStaleSessions, STALE_SESSION_THRESHOLD_MS } from '../stale-sessions.job';

// ============================================================================
// Setup
// ============================================================================

beforeAll(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/test-stale-sessions-pbt');
  await Session.ensureIndexes();
  await User.ensureIndexes();
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

async function createTestUser(): Promise<string> {
  const user = await User.create({
    email: `user-${Date.now()}-${Math.random()}@example.com`,
    passwordHash: 'hashedpw',
    name: 'Test User',
  });
  return String(user._id);
}

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

async function countActiveSessionsOlderThan24h(): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_SESSION_THRESHOLD_MS);
  return Session.countDocuments({ status: 'active', startedAt: { $lt: cutoff } });
}

// ============================================================================
// Property 6: Sesi Selalu Berakhir
// ============================================================================

describe('Property: Sesi Selalu Berakhir', () => {
  it('Property: setelah cleanup, tidak ada sesi aktif dengan startedAt > 24 jam lalu', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Buat sesi stale dengan usia bervariasi: 25–72 jam yang lalu
        fc.array(fc.integer({ min: 25, max: 72 }), { minLength: 1, maxLength: 5 }),
        async (hoursOldList) => {
          await Session.deleteMany({});
          await User.deleteMany({});

          // Satu user per sesi agar tidak bentrok partial unique index
          for (let i = 0; i < hoursOldList.length; i++) {
            const userId = await createTestUser();
            await Session.create({
              userId,
              videoTitle: `Video Lama ${i}`,
              sourceApp: 'Chrome',
              sourceType: 'streaming',
              deviceId: `device-${i}`,
              status: 'active',
              startedAt: hoursAgo(hoursOldList[i]),
            });
          }

          // Jalankan cleanup
          await cleanupStaleSessions();

          // Invariant: tidak ada sesi aktif yang lebih dari 24 jam
          const staleCount = await countActiveSessionsOlderThan24h();
          expect(staleCount).toBe(0);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Property: cleanup tidak mengubah sesi aktif yang masih dalam batas 24 jam', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Sesi yang baru: 0–23 jam yang lalu (belum stale)
        fc.integer({ min: 0, max: 23 }),
        async (hoursOld) => {
          await Session.deleteMany({});
          await User.deleteMany({});

          const userId = await createTestUser();
          await Session.create({
            userId,
            videoTitle: 'Sesi Baru',
            sourceApp: 'Chrome',
            sourceType: 'streaming',
            deviceId: 'device-1',
            status: 'active',
            startedAt: hoursAgo(hoursOld),
          });

          await cleanupStaleSessions();

          // Sesi masih harus aktif karena belum melewati 24 jam
          const activeCount = await Session.countDocuments({ userId, status: 'active' });
          expect(activeCount).toBe(1);
        }
      ),
      { numRuns: 24 }
    );
  });

  it('Property: cleanup tidak mengubah sesi yang sudah completed/dismissed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 25, max: 72 }),
        fc.constantFrom('completed' as const, 'dismissed' as const),
        async (hoursOld, status) => {
          await Session.deleteMany({});
          await User.deleteMany({});

          const userId = await createTestUser();
          const session = await Session.create({
            userId,
            videoTitle: 'Sesi Lama',
            sourceApp: 'Chrome',
            sourceType: 'streaming',
            deviceId: 'device-1',
            status,
            startedAt: hoursAgo(hoursOld),
          });

          await cleanupStaleSessions();

          // Status tidak berubah — hanya sesi 'active' yang di-cleanup
          const found = await Session.findById(session._id);
          expect(found?.status).toBe(status);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Property: cleanup mengembalikan jumlah sesi yang diubah secara akurat', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 4 }),  // sesi stale
        fc.integer({ min: 0, max: 4 }),  // sesi segar
        async (staleCount, freshCount) => {
          await Session.deleteMany({});
          await User.deleteMany({});

          // Buat users berbeda per sesi agar tidak bentrok partial unique index
          for (let i = 0; i < staleCount; i++) {
            const uid = await createTestUser();
            const s = await Session.create({
              userId: uid,
              videoTitle: `Stale ${i}`,
              sourceApp: 'Chrome',
              sourceType: 'streaming',
              deviceId: 'device-stale',
              status: 'completed',
              startedAt: hoursAgo(25 + i),
            });
            await Session.updateOne({ _id: s._id }, { $set: { status: 'active' } });
          }

          for (let i = 0; i < freshCount; i++) {
            const uid = await createTestUser();
            await Session.create({
              userId: uid,
              videoTitle: `Fresh ${i}`,
              sourceApp: 'Chrome',
              sourceType: 'streaming',
              deviceId: 'device-fresh',
              status: 'active',
              startedAt: hoursAgo(i % 23),
            });
          }

          const cleaned = await cleanupStaleSessions();

          expect(cleaned).toBe(staleCount);

          // Sesi segar masih aktif
          const stillActive = await Session.countDocuments({ status: 'active' });
          expect(stillActive).toBe(freshCount);
        }
      ),
      { numRuns: 20 }
    );
  });
});
