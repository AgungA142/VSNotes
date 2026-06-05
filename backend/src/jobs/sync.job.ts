/**
 * Sync Job — server-side reconciliation of offline operations from multiple devices.
 *
 * Flow:
 *   enqueueSyncJob()    → create SyncJob record (status: pending)
 *   processPendingSyncJobs() → pick up pending jobs, execute, mark completed/failed
 *   startSyncJobScheduler()  → runs the processor every 60 s
 *
 * Conflict resolution: last-write-wins via updatedAt timestamp.
 * Job state persists in MongoDB so progress survives process restarts.
 */

import { Types } from 'mongoose';
import { SyncJob } from '@models/SyncJob';
import { Session } from '@models/Session';
import { Note } from '@models/Note';
import { enqueueTranscriptionJob } from '@jobs/transcription.job';
import { logger } from '@config/logger';

const MAX_RETRIES = 3;
const SCHEDULER_INTERVAL_MS = 60_000;

let schedulerTimer: ReturnType<typeof setInterval> | null = null;

// ============================================================================
// Public API
// ============================================================================

export async function enqueueSyncJob(params: {
  userId: string;
  operationType: 'create' | 'update' | 'delete';
  resourceType: 'session' | 'note' | 'audio';
  resourceId: string;
  payload: Record<string, unknown>;
}): Promise<string> {
  const job = await SyncJob.create({
    userId: new Types.ObjectId(params.userId),
    operationType: params.operationType,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    payload: params.payload,
    status: 'pending',
  });

  // Kick off immediately in background
  processSingleJob(String(job._id)).catch((err) =>
    logger.error('Unhandled error in processSingleJob', { jobId: String(job._id), err })
  );

  return String(job._id);
}

export function startSyncJobScheduler(): void {
  if (schedulerTimer) return;
  logger.info('Sync job scheduler started (interval: 60 s)');
  schedulerTimer = setInterval(processPendingSyncJobs, SCHEDULER_INTERVAL_MS);
}

export function stopSyncJobScheduler(): void {
  if (!schedulerTimer) return;
  clearInterval(schedulerTimer);
  schedulerTimer = null;
  logger.info('Sync job scheduler stopped');
}

// ============================================================================
// Processing
// ============================================================================

async function processPendingSyncJobs(): Promise<void> {
  const jobs = await SyncJob.find({ status: 'pending' })
    .sort({ createdAt: 1 })
    .limit(50)
    .lean();

  if (jobs.length === 0) return;

  logger.debug('Processing pending sync jobs', { count: jobs.length });

  for (const job of jobs) {
    await processSingleJob(String(job._id));
  }
}

async function processSingleJob(jobId: string): Promise<void> {
  const job = await SyncJob.findById(jobId);
  if (!job || job.status === 'completed') return;

  if (job.retryCount >= MAX_RETRIES) {
    await SyncJob.findByIdAndUpdate(jobId, { status: 'failed', errorMessage: 'Max retries exceeded' });
    return;
  }

  await SyncJob.findByIdAndUpdate(jobId, { status: 'processing' });

  try {
    await executeJob(job);
    await SyncJob.findByIdAndUpdate(jobId, { status: 'completed' });
    logger.info('Sync job completed', { jobId, resourceType: job.resourceType, operationType: job.operationType });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const isLastRetry = job.retryCount + 1 >= MAX_RETRIES;

    await SyncJob.findByIdAndUpdate(jobId, {
      status: isLastRetry ? 'failed' : 'pending',
      retryCount: job.retryCount + 1,
      errorMessage,
    });

    logger.warn('Sync job failed', { jobId, attempt: job.retryCount + 1, errorMessage });
  }
}

async function executeJob(job: InstanceType<typeof SyncJob>): Promise<void> {
  const userId = String(job.userId);
  const { operationType, resourceType, resourceId, payload } = job;

  if (resourceType === 'session') {
    if (operationType === 'create') {
      // Only create if session doesn't already exist (idempotency)
      const existing = await Session.findOne({ _id: resourceId, userId });
      if (!existing) {
        await Session.create({ ...payload, userId, _id: resourceId });
      }
    } else if (operationType === 'update') {
      // Last-write-wins: only update if local updatedAt is newer than stored
      const session = await Session.findOne({ _id: resourceId, userId });
      if (session) {
        const serverTime = session.updatedAt.getTime();
        const payloadTime = new Date((payload.updatedAt as string | undefined) ?? 0).getTime();
        if (payloadTime > serverTime) {
          await Session.findByIdAndUpdate(resourceId, { ...payload, userId });
        }
      }
    } else if (operationType === 'delete') {
      await Session.findOneAndDelete({ _id: resourceId, userId });
    }
    return;
  }

  if (resourceType === 'note') {
    if (operationType === 'create') {
      const existing = await Note.findOne({ _id: resourceId, userId });
      if (!existing) {
        await Note.create({ ...payload, userId, _id: resourceId });
      }
    } else if (operationType === 'update') {
      // Last-write-wins
      const note = await Note.findOne({ _id: resourceId, userId });
      if (note) {
        const serverTime = note.updatedAt.getTime();
        const payloadTime = new Date((payload.updatedAt as string | undefined) ?? 0).getTime();
        if (payloadTime > serverTime) {
          await Note.findByIdAndUpdate(resourceId, { ...payload, userId });
        }
      }
    } else if (operationType === 'delete') {
      await Note.findOneAndDelete({ _id: resourceId, userId });
    }
    return;
  }

  if (resourceType === 'audio') {
    // Re-queue as a transcription job
    await enqueueTranscriptionJob({
      sessionId: resourceId,
      userId,
      audioData: payload.audioData as string,
      timestampSec: (payload.timestampSec as number | undefined) ?? 0,
      durationSec: payload.durationSec as number,
      capturedAt: new Date(payload.capturedAt as string),
    });
    return;
  }
}
