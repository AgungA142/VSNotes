/**
 * Stale Sessions Cleanup Job
 *
 * Property 6 — Sesi Selalu Berakhir:
 *   Tidak boleh ada sesi `active` dengan `startedAt` lebih dari 24 jam lalu.
 *
 * Job ini berjalan setiap jam dan auto-complete sesi yang sudah lewat batas waktu.
 * State job tidak perlu dipersist ke DB karena ini idempotent — aman dijalankan ulang.
 */

import { Session } from '@models/Session';
import { logger } from '@config/logger';

export const STALE_SESSION_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 jam
const SCHEDULER_INTERVAL_MS = 60 * 60 * 1000; // 1 jam

let schedulerTimer: ReturnType<typeof setInterval> | null = null;

// ============================================================================
// Core logic
// ============================================================================

export async function cleanupStaleSessions(): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_SESSION_THRESHOLD_MS);

  const result = await Session.updateMany(
    { status: 'active', startedAt: { $lt: cutoff } },
    {
      $set: {
        status: 'completed',
        endedAt: new Date(),
      },
    }
  );

  const count = result.modifiedCount;
  if (count > 0) {
    logger.info(`[stale-sessions] Auto-completed ${count} stale session(s)`);
  }

  return count;
}

// ============================================================================
// Scheduler
// ============================================================================

export function startStaleSessionsScheduler(): void {
  if (schedulerTimer) return;

  // Jalankan sekali saat startup, lalu setiap jam
  cleanupStaleSessions().catch((err) =>
    logger.error('[stale-sessions] Cleanup error on startup:', err)
  );

  schedulerTimer = setInterval(() => {
    cleanupStaleSessions().catch((err) =>
      logger.error('[stale-sessions] Cleanup error:', err)
    );
  }, SCHEDULER_INTERVAL_MS);

  logger.info('[stale-sessions] Scheduler started (interval: 1h)');
}

export function stopStaleSessionsScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}
