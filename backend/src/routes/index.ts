/**
 * Main Router
 * Mounts all module routes under /v1
 */

import { Router, type Router as RouterType } from 'express';
import authRoutes from './auth.routes';
import sessionsRoutes from './sessions.routes';
import transcriptionRoutes from './transcription.routes';
import summariesRoutes from './summaries.routes';
import { notesSessionRouter, notesRouter } from './notes.routes';
import usersRoutes from './users.routes';
import exportRoutes from './export.routes';

const router: RouterType = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/sessions', exportRoutes);
router.use('/sessions', sessionsRoutes);
router.use('/sessions', transcriptionRoutes);
router.use('/sessions', summariesRoutes);
router.use('/sessions', notesSessionRouter);
router.use('/notes', notesRouter);

export default router;
