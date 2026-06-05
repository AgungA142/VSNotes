import { z } from 'zod';

export const generateSummaryBodySchema = z.object({
  lengthPref: z.enum(['short', 'medium', 'long']).default('medium'),
});

export type GenerateSummaryBodyInput = z.infer<typeof generateSummaryBodySchema>;
