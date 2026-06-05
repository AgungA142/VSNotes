import { Session } from '@models/Session';
import { Note } from '@models/Note';
import { TranscriptSegment } from '@models/TranscriptSegment';
import { Summary } from '@models/Summary';
import { AppError } from '@middleware/error-handler';
import type {
  CreateSessionInput,
  UpdateSessionInput,
  SessionQueryInput,
} from '@utils/validation/sessions/sessions.validation';
import type {
  CreateSessionResponseDto,
  SessionDto,
  SessionListDto,
} from '../../../types/session/session.dto';

// ============================================================================
// Mapper
// ============================================================================

function toSessionDto(session: InstanceType<typeof Session>): SessionDto {
  const s = session.toObject();
  return {
    sessionId: String(s._id),
    userId: String(s.userId),
    videoTitle: s.videoTitle,
    sourceApp: s.sourceApp,
    sourceType: s.sourceType,
    startedAt: s.startedAt.toISOString(),
    endedAt: s.endedAt?.toISOString(),
    durationSec: s.durationSec,
    status: s.status,
    deviceId: s.deviceId,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

// ============================================================================
// Create session
// ============================================================================

export async function createSession(
  userId: string,
  input: CreateSessionInput
): Promise<CreateSessionResponseDto> {
  let session: InstanceType<typeof Session>;
  try {
    session = await Session.create({
      userId,
      videoTitle: input.videoTitle,
      sourceApp: input.sourceApp,
      sourceType: input.sourceType,
      deviceId: input.deviceId,
      status: 'active',
      startedAt: new Date(),
    });
  } catch (err: unknown) {
    // MongoDB DuplicateKey (E11000) dari partial unique index 'one_active_session_per_user'
    if (
      typeof err === 'object' &&
      err !== null &&
      (err as { code?: number }).code === 11000
    ) {
      throw new AppError(409, 'ACTIVE_SESSION_EXISTS', 'Sudah ada sesi aktif. Selesaikan sesi saat ini terlebih dahulu.');
    }
    throw err;
  }

  return {
    sessionId: String(session._id),
    userId: String(session.userId),
    videoTitle: session.videoTitle,
    sourceApp: session.sourceApp,
    sourceType: session.sourceType,
    startedAt: session.startedAt.toISOString(),
    status: session.status,
    deviceId: session.deviceId,
  };
}

// ============================================================================
// List sessions
// ============================================================================

export async function listSessions(
  userId: string,
  query: SessionQueryInput
): Promise<SessionListDto> {
  const { page, limit } = query;
  const skip = (page - 1) * limit;

  const [sessions, total] = await Promise.all([
    Session.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Session.countDocuments({ userId }),
  ]);

  return {
    sessions: sessions.map(toSessionDto),
    total,
    page,
    pageSize: limit,
  };
}

// ============================================================================
// Get session by ID
// ============================================================================

export async function getSession(sessionId: string, userId: string): Promise<SessionDto> {
  const session = await Session.findOne({ _id: sessionId, userId });
  if (!session) {
    throw new AppError(404, 'SESSION_NOT_FOUND', 'Sesi tidak ditemukan');
  }
  return toSessionDto(session);
}

// ============================================================================
// Update session
// ============================================================================

export async function updateSession(
  sessionId: string,
  userId: string,
  input: UpdateSessionInput
): Promise<SessionDto> {
  const session = await Session.findOne({ _id: sessionId, userId });
  if (!session) {
    throw new AppError(404, 'SESSION_NOT_FOUND', 'Sesi tidak ditemukan');
  }

  if (input.status) {
    session.status = input.status;

    if (input.status === 'completed') {
      const endedAt = input.endedAt ? new Date(input.endedAt) : new Date();
      session.endedAt = endedAt;
      session.durationSec =
        input.durationSec ?? Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000);
    }
  }

  if (input.endedAt && input.status !== 'completed') {
    session.endedAt = new Date(input.endedAt);
  }

  if (input.durationSec !== undefined && input.status !== 'completed') {
    session.durationSec = input.durationSec;
  }

  await session.save();
  return toSessionDto(session);
}

// ============================================================================
// Delete session (cascade)
// ============================================================================

export async function deleteSession(sessionId: string, userId: string): Promise<void> {
  const session = await Session.findOne({ _id: sessionId, userId });
  if (!session) {
    throw new AppError(404, 'SESSION_NOT_FOUND', 'Sesi tidak ditemukan');
  }

  // Cascade delete data terkait
  await Promise.all([
    Note.deleteMany({ sessionId }),
    TranscriptSegment.deleteMany({ sessionId }),
    Summary.deleteOne({ sessionId }),
  ]);

  await session.deleteOne();
}
