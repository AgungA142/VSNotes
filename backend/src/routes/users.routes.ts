/**
 * Users Routes
 * GET    /v1/users/me
 * PATCH  /v1/users/me/settings
 */

import { Router } from 'express';
import { authenticate } from '@middleware/authenticate';
import { getMeHandler, updateSettingsHandler } from '@controllers/users/users.controller';

const router: Router = Router();

router.use(authenticate);

router.get('/me', getMeHandler);
router.patch('/me/settings', updateSettingsHandler);

export default router;
