import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { db } from './db.js';
import { config, cookieOptions, csrfCookie, sessionCookie } from './config.js';
import { HttpError } from './errors.js';

export const safeUser = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const;
export type AuthUser = {
  id: number;
  fullName: string;
  email: string;
  role: 'ADMIN' | 'STUDENT';
  isActive: boolean;
  createdAt: Date;
};
declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}
export const hashToken = (v: string) => createHash('sha256').update(v).digest('hex');
export const session: RequestHandler = async (req, _res, next) => {
  const token: unknown = req.cookies?.[sessionCookie];
  if (typeof token === 'string' && /^[a-f0-9]{64}$/.test(token)) {
    const s = await db.session.findUnique({
      where: { id: hashToken(token) },
      include: { user: { select: safeUser } },
    });
    if (s && s.expiresAt > new Date() && s.user.isActive) req.user = s.user;
  }
  next();
};
export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.user) throw new HttpError(401, 'Please sign in to continue.');
  next();
};
export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (req.user?.role !== 'ADMIN') throw new HttpError(403, 'Administrator access is required.');
  next();
};
export const csrf: RequestHandler = (req, _res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }
  if (req.get('origin') !== new URL(config.APP_ORIGIN).origin)
    throw new HttpError(403, 'Request origin is not allowed.');
  const a = req.get('x-csrf-token');
  const b: unknown = req.cookies?.[csrfCookie];
  if (
    !a ||
    typeof b !== 'string' ||
    !/^[a-f0-9]{64}$/.test(a) ||
    !/^[a-f0-9]{64}$/.test(b) ||
    !timingSafeEqual(Buffer.from(a), Buffer.from(b))
  )
    throw new HttpError(403, 'Security token expired. Refresh and try again.');
  next();
};
export const issueCsrf: RequestHandler = (_req, res) => {
  const token = randomBytes(32).toString('hex');
  res.cookie(csrfCookie, token, { ...cookieOptions, maxAge: 86400000 });
  res.json({ data: { token } });
};
export async function createSession(userId: number) {
  const token = randomBytes(32).toString('hex');
  await db.session.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });
  await db.session.create({
    data: {
      id: hashToken(token),
      userId,
      expiresAt: new Date(Date.now() + config.SESSION_DAYS * 86400000),
    },
  });
  return token;
}
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: { message: 'Too many authentication attempts. Please try again in 15 minutes.' },
  },
});
export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: (req) => ['GET', 'HEAD'].includes(req.method),
  message: { error: { message: 'Too many updates. Please try again later.' } },
});
