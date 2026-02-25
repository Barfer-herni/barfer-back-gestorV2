import { z } from 'zod';

export const configValidationSchema = z.object({
  DATABASE_URL: z.string(),
  RESEND_FROM: z.string(),
  RESEND_TOKEN: z.string(),
  PORT: z.string(),
});
