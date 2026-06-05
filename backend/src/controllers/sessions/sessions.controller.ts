import { Request, Response, NextFunction } from 'express';
import {
  createSessionSchema,
  updateSessionSchema,
  sessionQuerySchema,
} from '@utils/validation/sessions/sessions.validation';
import {
  createSession,
  listSessions,
  getSession,
  updateSession,
  deleteSession,
} from '@services/domain/session/session.service';
import { createSuccessResponse } from '@utils/responses/base-response';

export async function createSessionHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = createSessionSchema.parse(req.body);
    const data = await createSession(req.user!.userId, input);
    res.status(201).json(createSuccessResponse(data, 201, 'Sesi berhasil dibuat'));
  } catch (err) {
    next(err);
  }
}

export async function listSessionsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = sessionQuerySchema.parse(req.query);
    const data = await listSessions(req.user!.userId, query);
    res.status(200).json(createSuccessResponse(data, 200));
  } catch (err) {
    next(err);
  }
}

export async function getSessionHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getSession(req.params.id, req.user!.userId);
    res.status(200).json(createSuccessResponse(data, 200));
  } catch (err) {
    next(err);
  }
}

export async function updateSessionHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = updateSessionSchema.parse(req.body);
    const data = await updateSession(req.params.id, req.user!.userId, input);
    res.status(200).json(createSuccessResponse(data, 200, 'Sesi berhasil diperbarui'));
  } catch (err) {
    next(err);
  }
}

export async function deleteSessionHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await deleteSession(req.params.id, req.user!.userId);
    res.status(200).json(createSuccessResponse(null, 200, 'Sesi berhasil dihapus'));
  } catch (err) {
    next(err);
  }
}
