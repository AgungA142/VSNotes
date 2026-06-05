/**
 * Transcription Routes
 * POST /v1/sessions/:id/audio
 * GET  /v1/sessions/:id/transcript
 */

import { Router } from 'express';
import { authenticate } from '@middleware/authenticate';
import { uploadAudioHandler, getTranscriptHandler } from '@controllers/transcription/transcription.controller';

const router: Router = Router({ mergeParams: true });

router.use(authenticate);

router.post('/:id/audio', uploadAudioHandler);
router.get('/:id/transcript', getTranscriptHandler);

export default router;
