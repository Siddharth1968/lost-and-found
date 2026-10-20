import 'dotenv/config';
import path from 'node:path';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1024).max(65535).default(4000),
  APP_ORIGIN: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z
    .string()
    .url()
    .refine((v) => v.startsWith('mysql://'), 'A dedicated MySQL URL is required'),
  SESSION_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  COLLEGE_EMAIL_DOMAIN: z.string().default(''),
  UPLOAD_DIR: z.string().default('./uploads'),
  TRUST_PROXY: z.enum(['0', '1']).default('0'),
});
export const config = schema.parse(process.env);
if (config.NODE_ENV === 'production' && !config.APP_ORIGIN.startsWith('https://'))
  throw new Error('Production APP_ORIGIN must use HTTPS');
export const uploadDir = path.resolve(config.UPLOAD_DIR);
export const cookieOptions = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};
export const sessionCookie =
  config.NODE_ENV === 'production' ? '__Host-campusfind_session' : 'campusfind_session';
export const csrfCookie =
  config.NODE_ENV === 'production' ? '__Host-campusfind_csrf' : 'campusfind_csrf';
