import { Request, Response, NextFunction } from 'express';
import { uploadAudioSchema } from '@utils/validation/transcription/transcription.validation';
import { enqueueTranscriptionJob } from '@jobs/transcription.job';
import { Session } from '@models/Session';
import { TranscriptSegment } from '@models/TranscriptSegment';
import { AppError } from '@middleware/error-handler';
import { createSuccessResponse } from '@utils/responses/base-response';

// POST /v1/sessions/:id/audio
export async function uploadAudioHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = uploadAudioSchema.parse(req.body);
    const sessionId = req.params.id;
    const userId = req.user!.userId;

    // Validasi ownership sesi
    const session = await Session.findOne({ _id: sessionId, userId });
    if (!session) throw new AppError(404, 'SESSION_NOT_FOUND', 'Sesi tidak ditemukan');
    if (session.status !== 'active') {
      throw new AppError(400, 'SESSION_NOT_ACTIVE', 'Hanya sesi aktif yang bisa menerima audio');
    }

    // Hitung timestampSec relatif terhadap startedAt sesi
    const capturedAt = new Date(input.capturedAt);
    const timestampSec = Math.max(
      0,
      Math.floor((capturedAt.getTime() - session.startedAt.getTime()) / 1000)
    );

    const jobId = await enqueueTranscriptionJob({
      sessionId,
      userId,
      audioData: input.audioData,
      timestampSec,
      durationSec: input.durationSec,
      capturedAt,
    });

    res.status(202).json(
      createSuccessResponse(
        { jobId, sessionId, status: 'queued', timestampSec },
        202,
        'Audio diterima dan sedang diproses'
      )
    );
  } catch (err) {
    next(err);
  }
}

// GET /v1/sessions/:id/transcript
export async function getTranscriptHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sessionId = req.params.id;
    const userId = req.user!.userId;

    // Validasi ownership sesi
    const session = await Session.findOne({ _id: sessionId, userId });
    if (!session) throw new AppError(404, 'SESSION_NOT_FOUND', 'Sesi tidak ditemukan');

    const segments = await TranscriptSegment.find({ sessionId, userId })
      .sort({ timestampSec: 1 });

    const data = {
      sessionId,
      segments: segments.map((s) => ({
        segmentId: String(s._id),
        sessionId: String(s.sessionId),
        timestampSec: s.timestampSec,
        text: s.text,
        language: s.language,
        createdAt: s.createdAt.toISOString(),
      })),
      totalSegments: segments.length,
    };

    res.status(200).json(createSuccessResponse(data, 200));
  } catch (err) {
    next(err);
  }
}
