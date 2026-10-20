import express from 'express';
import type { Prisma } from '@prisma/client';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { db } from './db.js';
import { config, cookieOptions, sessionCookie, uploadDir } from './config.js';
import { HttpError, errorHandler } from './errors.js';
import { resolveClientDist } from './paths.js';
import {
  session,
  csrf,
  issueCsrf,
  requireAuth,
  requireAdmin,
  authLimiter,
  writeLimiter,
  createSession,
  hashToken,
  safeUser,
} from './security.js';
import {
  registration,
  login,
  id,
  itemInput,
  itemQuery,
  claimInput,
  reviewInput,
  categoryInput,
  pagination,
} from './validation.js';
import { upload, saveImage, removeImage } from './uploads.js';
import { z } from 'zod';
import {
  publicItem,
  createItem,
  editItem,
  withdrawItem,
  submitClaim,
  reviewClaim,
  markReturned,
  transaction,
  audit,
} from './services.js';

export const app = express();
app.disable('x-powered-by');
if (config.TRUST_PROXY === '1') app.set('trust proxy', 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'blob:', 'data:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        ...(config.NODE_ENV !== 'production' ? { upgradeInsecureRequests: null } : {}),
      },
    },
  }),
);
app.use(express.json({ limit: '48kb' }), cookieParser());
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.get('/api/health', async (_req, res) => {
  await db.$queryRaw`SELECT 1`;
  res.json({ data: { status: 'ok', database: 'connected' } });
});
app.get('/api/auth/csrf', issueCsrf);
app.use('/api', csrf, session, writeLimiter);
app.post('/api/auth/register', authLimiter, async (req, res) => {
  const input = registration.parse(req.body);
  if (
    config.COLLEGE_EMAIL_DOMAIN &&
    input.email.split('@')[1] !== config.COLLEGE_EMAIL_DOMAIN.toLowerCase()
  )
    throw new HttpError(400, `Please use your @${config.COLLEGE_EMAIL_DOMAIN} college email.`);
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await transaction(async (tx) => {
    const u = await tx.user.create({
      data: { fullName: input.fullName, email: input.email, passwordHash, role: 'STUDENT' },
      select: safeUser,
    });
    await audit(tx, u.id, 'ACCOUNT_REGISTERED', 'USER', u.id);
    return u;
  });
  const token = await createSession(user.id);
  res
    .cookie(sessionCookie, token, { ...cookieOptions, maxAge: config.SESSION_DAYS * 86400000 })
    .status(201)
    .json({ data: user });
});
// A fixed dummy hash makes unknown-email login follow the password verification path too.
const dummyHash = await bcrypt.hash('not-a-real-account-password', 12);
app.post('/api/auth/login', authLimiter, async (req, res) => {
  const input = login.parse(req.body);
  const user = await db.user.findUnique({ where: { email: input.email } });
  const valid = await bcrypt.compare(input.password, user?.passwordHash ?? dummyHash);
  if (!user || !user.isActive || !valid)
    throw new HttpError(401, 'Email or password is incorrect.');
  const token = await createSession(user.id);
  res
    .cookie(sessionCookie, token, { ...cookieOptions, maxAge: config.SESSION_DAYS * 86400000 })
    .json({ data: await db.user.findUnique({ where: { id: user.id }, select: safeUser }) });
});
app.post('/api/auth/logout', requireAuth, async (req, res) => {
  await db.session.deleteMany({ where: { id: hashToken(req.cookies[sessionCookie]) } });
  res.clearCookie(sessionCookie, cookieOptions).json({ data: { message: 'Signed out.' } });
});
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ data: req.user });
});
app.get('/api/categories', async (_req, res) => {
  res.json({
    data: await db.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { items: { where: { status: 'OPEN' } } } } },
    }),
  });
});
app.get('/api/stats', async (_req, res) => {
  const [lost, found, returned, total] = await Promise.all([
    db.item.count({ where: { type: 'LOST', status: 'OPEN' } }),
    db.item.count({ where: { type: 'FOUND', status: 'OPEN' } }),
    db.item.count({ where: { status: 'RETURNED' } }),
    db.item.count({ where: { status: { not: 'WITHDRAWN' } } }),
  ]);
  res.json({ data: { lost, found, returned, total } });
});
app.get('/api/items', async (req, res) => {
  const f = itemQuery.parse(req.query);
  if (f.mine && !req.user) throw new HttpError(401, 'Please sign in to view your listings.');
  if (f.status === 'WITHDRAWN' && !f.mine && req.user?.role !== 'ADMIN')
    throw new HttpError(403, 'Withdrawn listings are private.');
  const where: Prisma.ItemWhereInput = {
    ...(f.mine ? { userId: req.user!.id } : { status: { not: 'WITHDRAWN' } }),
    ...(f.status ? { status: f.status } : {}),
    ...(f.q ? { OR: [{ title: { contains: f.q } }, { description: { contains: f.q } }] } : {}),
    ...(f.categoryId ? { categoryId: f.categoryId } : {}),
    ...(f.type ? { type: f.type } : {}),
    ...(f.location ? { location: { contains: f.location } } : {}),
  };
  const orderBy: Prisma.ItemOrderByWithRelationInput[] = [
    f.sort === 'event'
      ? { eventDate: 'desc' }
      : { createdAt: f.sort === 'oldest' ? 'asc' : 'desc' },
    { id: 'desc' },
  ];
  const [items, total] = await db.$transaction([
    db.item.findMany({
      where,
      select: publicItem,
      orderBy,
      take: f.pageSize,
      skip: (f.page - 1) * f.pageSize,
    }),
    db.item.count({ where }),
  ]);
  res.json({
    data: items,
    meta: { page: f.page, pageSize: f.pageSize, total, pages: Math.ceil(total / f.pageSize) },
  });
});
app.get('/api/items/:id', async (req, res) => {
  const item = await db.item.findUnique({
    where: { id: id.parse(req.params.id) },
    select: { ...publicItem, identifyingDetails: true, _count: { select: { claims: true } } },
  });
  if (
    !item ||
    (item.status === 'WITHDRAWN' && item.userId !== req.user?.id && req.user?.role !== 'ADMIN')
  )
    throw new HttpError(404, 'Item not found.');
  const { identifyingDetails, ...safe } = item;
  res.json({
    data: {
      ...safe,
      ...(item.userId === req.user?.id || req.user?.role === 'ADMIN' ? { identifyingDetails } : {}),
    },
  });
});
app.post('/api/items', requireAuth, upload.single('image'), async (req, res) => {
  const input = itemInput.parse(req.body);
  const image = await saveImage(req.file);
  try {
    res.status(201).json({ data: await createItem(req.user!.id, input, image) });
  } catch (e) {
    await removeImage(image);
    throw e;
  }
});
app.patch('/api/items/:id', requireAuth, upload.single('image'), async (req, res) => {
  const input = itemInput.parse(req.body);
  const itemId = id.parse(req.params.id);
  const image = await saveImage(req.file);
  try {
    const result = await editItem(req.user!.id, itemId, input, image);
    await removeImage(result.oldImage);
    res.json({ data: result.item });
  } catch (e) {
    await removeImage(image);
    throw e;
  }
});
app.delete('/api/items/:id', requireAuth, async (req, res) => {
  res.json({ data: await withdrawItem(req.user!.id, id.parse(req.params.id)) });
});
app.post('/api/claims', requireAuth, async (req, res) => {
  res.status(201).json({ data: await submitClaim(req.user!.id, claimInput.parse(req.body)) });
});
app.get('/api/claims/mine', requireAuth, async (req, res) => {
  const { page, pageSize } = pagination.parse(req.query);
  const where = { claimantId: req.user!.id };
  const [claims, total] = await db.$transaction([
    db.claim.findMany({
      where,
      include: { item: { select: publicItem } },
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    db.claim.count({ where }),
  ]);
  res.json({ data: claims, meta: { page, pageSize, total, pages: Math.ceil(total / pageSize) } });
});
app.get('/api/items/:id/claims', requireAuth, async (req, res) => {
  const itemId = id.parse(req.params.id);
  const item = await db.item.findUnique({ where: { id: itemId } });
  if (!item) throw new HttpError(404, 'Item not found.');
  if (item.userId !== req.user!.id && req.user!.role !== 'ADMIN')
    throw new HttpError(403, 'Access denied.');
  const { page, pageSize } = pagination.parse(req.query);
  // Reporters see workflow status, never claimant evidence or private contact details.
  const select =
    req.user!.role === 'ADMIN'
      ? undefined
      : { id: true, status: true, createdAt: true, reviewedAt: true };
  const [claims, total] = await db.$transaction([
    db.claim.findMany({
      where: { itemId },
      select,
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    db.claim.count({ where: { itemId } }),
  ]);
  res.json({ data: claims, meta: { page, pageSize, total, pages: Math.ceil(total / pageSize) } });
});
app.get('/api/dashboard', requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const [total, lost, found, pending, returned, activity] = await Promise.all([
    db.item.count({ where: { userId } }),
    db.item.count({ where: { userId, type: 'LOST', status: 'OPEN' } }),
    db.item.count({ where: { userId, type: 'FOUND', status: 'OPEN' } }),
    db.claim.count({ where: { claimantId: userId, status: 'PENDING' } }),
    db.item.count({ where: { userId, status: 'RETURNED' } }),
    db.activityLog.findMany({
      where: { actorId: userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);
  res.json({ data: { total, lost, found, pending, returned, activity } });
});
app.get('/api/notifications', requireAuth, async (req, res) => {
  const { page, pageSize } = pagination.parse(req.query);
  const where = { userId: req.user!.id };
  const [notifications, total, unread] = await db.$transaction([
    db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    db.notification.count({ where }),
    db.notification.count({ where: { ...where, isRead: false } }),
  ]);
  res.json({
    data: notifications,
    meta: { page, pageSize, total, unread, pages: Math.ceil(total / pageSize) },
  });
});
app.patch('/api/notifications/:id/read', requireAuth, async (req, res) => {
  const result = await db.notification.updateMany({
    where: { id: id.parse(req.params.id), userId: req.user!.id },
    data: { isRead: true },
  });
  if (!result.count) throw new HttpError(404, 'Notification not found.');
  res.json({ data: { message: 'Marked as read.' } });
});
app.use('/api/admin', requireAuth, requireAdmin);
app.get('/api/admin/dashboard', async (_req, res) => {
  const [users, lost, found, pending, returned, activity] = await Promise.all([
    db.user.count(),
    db.item.count({ where: { type: 'LOST' } }),
    db.item.count({ where: { type: 'FOUND' } }),
    db.claim.count({ where: { status: 'PENDING' } }),
    db.item.count({ where: { status: 'RETURNED' } }),
    db.activityLog.findMany({
      include: { actor: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 15,
    }),
  ]);
  res.json({ data: { users, lost, found, pending, returned, activity } });
});
app.get('/api/admin/claims', async (req, res) => {
  const f = pagination
    .extend({
      status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
      q: z.string().trim().max(120).optional(),
    })
    .parse(req.query);
  const where: Prisma.ClaimWhereInput = {
    ...(f.status ? { status: f.status } : {}),
    ...(f.q ? { item: { title: { contains: f.q } } } : {}),
  };
  const [claims, total] = await db.$transaction([
    db.claim.findMany({
      where,
      include: {
        item: { select: { ...publicItem, identifyingDetails: true } },
        claimant: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: f.pageSize,
      skip: (f.page - 1) * f.pageSize,
    }),
    db.claim.count({ where }),
  ]);
  res.json({
    data: claims,
    meta: { page: f.page, pageSize: f.pageSize, total, pages: Math.ceil(total / f.pageSize) },
  });
});
app.patch('/api/admin/claims/:id', async (req, res) => {
  res.json({
    data: await reviewClaim(req.user!.id, id.parse(req.params.id), reviewInput.parse(req.body)),
  });
});
app.post('/api/admin/items/:id/return', async (req, res) => {
  z.object({ handoverConfirmed: z.literal(true) })
    .strict()
    .parse(req.body);
  res.json({ data: await markReturned(req.user!.id, id.parse(req.params.id)) });
});
app.delete('/api/admin/items/:id', async (req, res) => {
  res.json({ data: await withdrawItem(req.user!.id, id.parse(req.params.id), true) });
});
app.post('/api/admin/categories', async (req, res) => {
  const input = categoryInput.parse(req.body);
  const result = await transaction(async (tx) => {
    const c = await tx.category.create({ data: input });
    await audit(tx, req.user!.id, 'CATEGORY_CREATED', 'CATEGORY', c.id);
    return c;
  });
  res.status(201).json({ data: result });
});
app.patch('/api/admin/categories/:id', async (req, res) => {
  const categoryId = id.parse(req.params.id);
  const input = categoryInput.parse(req.body);
  res.json({
    data: await transaction(async (tx) => {
      const c = await tx.category.update({ where: { id: categoryId }, data: input });
      await audit(tx, req.user!.id, 'CATEGORY_UPDATED', 'CATEGORY', c.id);
      return c;
    }),
  });
});
app.delete('/api/admin/categories/:id', async (req, res) => {
  const categoryId = id.parse(req.params.id);
  await transaction(async (tx) => {
    await tx.category.delete({ where: { id: categoryId } });
    await audit(tx, req.user!.id, 'CATEGORY_DELETED', 'CATEGORY', categoryId);
  });
  res.json({ data: { message: 'Category deleted.' } });
});
app.get('/api/admin/users', async (req, res) => {
  const f = pagination.extend({ q: z.string().trim().max(120).optional() }).parse(req.query);
  const where: Prisma.UserWhereInput = f.q
    ? { OR: [{ fullName: { contains: f.q } }, { email: { contains: f.q } }] }
    : {};
  const [users, total] = await db.$transaction([
    db.user.findMany({
      where,
      select: safeUser,
      orderBy: { createdAt: 'desc' },
      take: f.pageSize,
      skip: (f.page - 1) * f.pageSize,
    }),
    db.user.count({ where }),
  ]);
  res.json({
    data: users,
    meta: { page: f.page, pageSize: f.pageSize, total, pages: Math.ceil(total / f.pageSize) },
  });
});
app.patch('/api/admin/users/:id', async (req, res) => {
  const userId = id.parse(req.params.id);
  const input = z.object({ isActive: z.boolean() }).strict().parse(req.body);
  if (userId === req.user!.id) throw new HttpError(400, 'You cannot deactivate your own account.');
  res.json({
    data: await transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new HttpError(404, 'User not found.');
      if (user.role === 'ADMIN')
        throw new HttpError(
          403,
          'Administrator accounts must be managed through the provisioning script.',
        );
      const result = await tx.user.update({ where: { id: userId }, data: input, select: safeUser });
      if (!input.isActive) await tx.session.deleteMany({ where: { userId } });
      await audit(
        tx,
        req.user!.id,
        input.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        'USER',
        userId,
      );
      return result;
    }),
  });
});
app.use('/api', (_req, _res) => {
  throw new HttpError(404, 'API endpoint not found.');
});
app.use(
  '/uploads',
  express.static(uploadDir, {
    dotfiles: 'deny',
    index: false,
    maxAge: '1d',
    setHeaders: (res) => {
      res.setHeader('Content-Security-Policy', "default-src 'none'");
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  }),
);
app.use('/uploads', (_req, res) => {
  res.status(404).json({ error: { message: 'Image not found.' } });
});
const staticDir = resolveClientDist(import.meta.url);
if (existsSync(staticDir)) {
  app.use(express.static(staticDir));
  app.get('/{*path}', (_req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
  });
}
app.use(errorHandler);
