/**
 * Auth Routes
 * POST /v1/auth/register
 * POST /v1/auth/login
 * POST /v1/auth/refresh
 * POST /v1/auth/forgot-password
 * GET  /v1/auth/reset-password   — HTML form (browser)
 * POST /v1/auth/reset-password   — API + HTML form submit
 */

import express, { Router } from 'express';
import {
  registerHandler,
  loginHandler,
  refreshTokenHandler,
  forgotPasswordHandler,
  resetPasswordFormHandler,
  resetPasswordHandler,
} from '@controllers/auth/auth.controller';
import { authenticate } from '@middleware/authenticate';

const router: Router = Router();

router.post('/register', registerHandler);
router.post('/login', loginHandler);
router.post('/refresh', authenticate, refreshTokenHandler);
router.post('/forgot-password', forgotPasswordHandler);
router.get('/reset-password', resetPasswordFormHandler);
// Parse application/x-www-form-urlencoded (HTML form submit) di route ini saja
router.post('/reset-password', express.urlencoded({ extended: false }), resetPasswordHandler);

export default router;
