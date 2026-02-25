import { registerAs } from '@nestjs/config';

export default registerAs('env', () => ({
  DATABASE_URL: process.env.DATABASE_URL,
  RESEND_FROM: process.env.RESEND_FROM,
  RESEND_TOKEN: process.env.RESEND_TOKEN,
  PORT: process.env.PORT,
}));
