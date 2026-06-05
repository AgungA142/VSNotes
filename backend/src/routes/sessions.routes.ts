/**
 * Sessions Routes
 * POST   /v1/sessions
 * GET    /v1/sessions
 * GET    /v1/sessions/:id
 * PATCH  /v1/sessions/:id
 * DELETE /v1/sessions/:id
 */

import { Router } from 'express';
import { authenticate } from '@middleware/authenticate';
import {
  createSessionHandler,
  listSessionsHandler,
  getSessionHandler,
  updateSessionHandler,
  deleteSessionHandler,
} from '@controllers/sessions/sessions.controller';

const router: Router = Router();

router.use(authenticate);

router.post('/', createSessionHandler);
router.get('/', listSessionsHandler);
router.get('/:id', getSessionHandler);
router.patch('/:id', updateSessionHandler);
router.delete('/:id', deleteSessionHandler);

export default router;
