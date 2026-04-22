import {z} from 'zod';
import {MessageMode} from '../types/enums';

/** POST /api/generate-reply */
export const generateReplyBodySchema = z
  .object({
    userId: z.string().min(1),
    matchId: z.union([z.string(), z.number()]).optional(),
    prompt: z.string().optional(),
    images: z.array(z.string()).optional(),
    skipRateLimiting: z.boolean().optional(),
    mode: z.nativeEnum(MessageMode).optional(),
    regenerate: z.boolean().optional(),
  })
  .passthrough()
  .superRefine((val, ctx) => {
    const p = (val.prompt ?? '').trim();
    const imgs = val.images?.length ?? 0;
    if (!p && imgs === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Prompt or at least one image is required',
        path: ['prompt'],
      });
    }
  });

/** POST /api/support (email support form) */
export const supportRequestBodySchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().min(1),
  plan: z.string().min(1),
  dailyMessagesUsed: z.coerce.number().int().nonnegative(),
  dailyMessageLimit: z.coerce.number().int().positive(),
  extraMessages: z.coerce.number().int().nonnegative(),
  name: z.string().optional(),
});
