import { Request, Response, NextFunction } from 'express';
import { generateSummaryBodySchema } from '@utils/validation/summary/summary.validation';
import { generateSummary, getSummary } from '@services/domain/summary/summary.service';
import { createSuccessResponse } from '@utils/responses/base-response';

export async function generateSummaryHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { lengthPref } = generateSummaryBodySchema.parse(req.body);
    const data = await generateSummary(req.params.id, req.user!.userId, lengthPref);
    res.status(201).json(createSuccessResponse(data, 201, 'Rangkuman berhasil dibuat'));
  } catch (err) {
    next(err);
  }
}

export async function getSummaryHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await getSummary(req.params.id, req.user!.userId);
    res.status(200).json(createSuccessResponse(data, 200));
  } catch (err) {
    next(err);
  }
}
