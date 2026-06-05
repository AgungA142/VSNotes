/**
 * Summaries Routes
 * POST /v1/sessions/:id/summary
 * GET  /v1/sessions/:id/summary
 */

import { Router } from 'express';
import { authenticate } from '@middleware/authenticate';
import {
  generateSummaryHandler,
  getSummaryHandler,
} from '@controllers/summaries/summaries.controller';

const router: Router = Router({ mergeParams: true });

router.use(authenticate);

router.post('/:id/summary', generateSummaryHandler);
router.get('/:id/summary', getSummaryHandler);

export default router;
