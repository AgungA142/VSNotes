import type { Request, Response, NextFunction } from 'express';
import { createSuccessResponse } from '@utils/responses/base-response';
import { createErrorResponse } from '@utils/responses/base-error-response';
import { updateUserSettingsSchema } from '@utils/validation/users/users.validation';
import { getUserById, updateUserSettings } from '@services/domain/users/users.service';

export async function getMeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await getUserById(req.user!.userId);
    if (!user) {
      res.status(404).json(createErrorResponse('USER_NOT_FOUND', 'Pengguna tidak ditemukan', 404));
      return;
    }
    res.status(200).json(createSuccessResponse(user, 200));
  } catch (err) {
    next(err);
  }
}

export async function updateSettingsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = updateUserSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(
        createErrorResponse('VALIDATION_ERROR', 'Data tidak valid', 400, parsed.error.flatten())
      );
      return;
    }

    const user = await updateUserSettings(req.user!.userId, parsed.data);
    if (!user) {
      res.status(404).json(createErrorResponse('USER_NOT_FOUND', 'Pengguna tidak ditemukan', 404));
      return;
    }
    res.status(200).json(createSuccessResponse(user, 200, 'Pengaturan berhasil diperbarui'));
  } catch (err) {
    next(err);
  }
}
