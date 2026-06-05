import { Session } from '@models/Session';
import { detectKeyMoments } from '@services/domain/notes/auto-notes.service';
import { logger } from '@config/logger';

const INTERVAL_MS = 2 * 60 * 1000; // 2 menit

let timer: ReturnType<typeof setInterval> | null = null;

// ============================================================================
// Scheduler lifecycle
// ============================================================================

export function startAutoNotesScheduler(): void {
  if (timer) return; // sudah berjalan

  logger.info('Auto-notes scheduler dimulai (interval: 2 menit)');
  timer = setInterval(runAutoNotesForActiveSessions, INTERVAL_MS);
}

export function stopAutoNotesScheduler(): void {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
  logger.info('Auto-notes scheduler dihentikan');
}

// ============================================================================
// Per-cycle: proses semua sesi aktif
// ============================================================================

async function runAutoNotesForActiveSessions(): Promise<void> {
  let activeSessions: { _id: unknown; userId: unknown }[];

  try {
    activeSessions = await Session.find({ status: 'active' }, { _id: 1, userId: 1 }).lean();
  } catch (err) {
    logger.error('Auto-notes scheduler: gagal query sesi aktif', { err });
    return;
  }

  if (activeSessions.length === 0) return;

  logger.debug('Auto-notes scheduler: memproses sesi aktif', { count: activeSessions.length });

  await Promise.allSettled(
    activeSessions.map((session) =>
      processSession(String(session._id), String(session.userId))
    )
  );
}

async function processSession(sessionId: string, userId: string): Promise<void> {
  try {
    const created = await detectKeyMoments(sessionId, userId);
    if (created > 0) {
      logger.info('Auto-notes job: catatan baru dibuat', { sessionId, created });
    }
  } catch (err) {
    logger.error('Auto-notes job: error memproses sesi', { sessionId, err });
  }
}
