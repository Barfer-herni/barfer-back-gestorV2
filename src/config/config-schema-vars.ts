import { z } from 'zod';

export const configValidationSchema = z.object({
  DATABASE_URL: z.string(),
  RESEND_FROM: z.string(),
  RESEND_TOKEN: z.string(),
  PORT: z.string(),
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().optional(),
  JWT_REFRESH_SECRET: z.string().optional(),
  JWT_REFRESH_EXPIRES_IN: z.string().optional(),
});
