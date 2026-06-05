import type { Request, Response, NextFunction } from 'express';
import { createErrorResponse } from '@utils/responses/base-error-response';
import { exportSession, type ExportFormat } from '@services/export/export.service';

const ALLOWED_FORMATS = new Set<ExportFormat>(['md', 'txt', 'pdf']);

export async function exportSessionHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const format = (req.query['format'] as string | undefined) ?? 'md';

    if (!ALLOWED_FORMATS.has(format as ExportFormat)) {
      res.status(400).json(
        createErrorResponse(
          'INVALID_FORMAT',
          `Format tidak didukung: "${format}". Gunakan md, txt, atau pdf.`,
          400
        )
      );
      return;
    }

    const result = await exportSession(id, req.user!.userId, format as ExportFormat);

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(result.filename)}"`
    );

    if (result.kind === 'binary') {
      res.send(result.buffer);
    } else {
      res.send(result.content);
    }
  } catch (err) {
    next(err);
  }
}
