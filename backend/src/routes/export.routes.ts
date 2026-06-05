/**
 * Export Routes
 * GET /v1/sessions/:id/export
 */

import { Router } from 'express';
import { authenticate } from '@middleware/authenticate';
import { exportSessionHandler } from '@controllers/export/export.controller';

const router: Router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/:id/export', exportSessionHandler);

export default router;
