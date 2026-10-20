import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { config as dotenv } from 'dotenv';
import { execFileSync } from 'node:child_process';
import request from 'supertest';
import sharp from 'sharp';
import { readdir } from 'node:fs/promises';

dotenv({ path: '.env.test', override: true, quiet: true });
const testUrl = new URL(process.env.DATABASE_URL ?? 'mysql://missing:missing@127.0.0.1/missing');
if (process.env.NODE_ENV !== 'test' || !testUrl.pathname.endsWith('_test'))
  throw new Error(
    'Integration tests require server/.env.test with NODE_ENV=test and a dedicated database ending in _test.',
  );
const { app } = await import('../src/app.js');
const { db } = await import('../src/db.js');
const { uploadDir } = await import('../src/config.js');
const { transaction, audit } = await import('../src/services.js');
const origin = process.env.APP_ORIGIN ?? 'http://localhost:5173';
const secret = 'test-only-password-9371';
const report = (categoryId: number, type = 'FOUND', title = 'Integration headphones') => ({
  title,
  categoryId,
  type,
  description: 'Found next to the windows in the campus library.',
  location: 'Central Library',
  eventDate: '2026-01-01',
  identifyingDetails: 'PRIVATE_SERIAL_9371',
});
const evidence = (itemId: number) => ({
  itemId,
  ownershipProof: 'These are my headphones; I left them during the afternoon lecture.',
  identifyingDetails: 'PRIVATE_CLAIM_SECRET_9371',
  supportingInformation: 'Test evidence only.',
});
async function client() {
  const agent = request.agent(app);
  const r = await agent.get('/api/auth/csrf');
  return { agent, token: r.body.data.token as string };
}
type Client = Awaited<ReturnType<typeof client>>;
function post(c: Client, url: string) {
  return c.agent.post(url).set('Origin', origin).set('X-CSRF-Token', c.token);
}
function patch(c: Client, url: string) {
  return c.agent.patch(url).set('Origin', origin).set('X-CSRF-Token', c.token);
}
function del(c: Client, url: string) {
  return c.agent.delete(url).set('Origin', origin).set('X-CSRF-Token', c.token);
}
async function register(c: Client, n: string) {
  const r = await post(c, '/api/auth/register').send({
    fullName: `Test ${n}`,
    email: `${n}@example.test`,
    password: secret,
    confirmPassword: secret,
  });
  expect(r.status).toBe(201);
  return r.body.data.id as number;
}
let owner: Client, claimant: Client, other: Client, admin: Client;
let ownerId: number,
  claimantId: number,
  adminId: number,
  categoryId: number,
  foundId: number,
  lostId: number,
  claimId: number,
  otherClaimId: number;
beforeAll(async () => {
  execFileSync(process.execPath, ['../node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
    env: process.env,
    stdio: 'pipe',
  });
  expect(
    (await db.$queryRaw<{ name: string }[]>`SELECT DATABASE() AS name`)[0].name.endsWith('_test'),
  ).toBe(true);
  // Reset only the explicitly guarded, dedicated test database.
  await db.$transaction([
    db.activityLog.deleteMany(),
    db.notification.deleteMany(),
    db.session.deleteMany(),
    db.claim.deleteMany(),
    db.item.deleteMany(),
    db.category.deleteMany(),
    db.user.deleteMany(),
  ]);
  owner = await client();
  claimant = await client();
  other = await client();
  admin = await client();
  ownerId = await register(owner, 'owner');
  claimantId = await register(claimant, 'claimant');
  await register(other, 'other');
  adminId = await register(admin, 'admin');
  await db.user.update({ where: { id: adminId }, data: { role: 'ADMIN' } });
  categoryId = (
    await db.category.create({
      data: { name: 'Test Electronics', description: 'Integration category' },
    })
  ).id;
}, 60000);
afterAll(async () => {
  await db.$disconnect();
});
describe('MySQL-backed CampusFind journeys and security', () => {
  it('registers students, hashes passwords, and returns no password hash', async () => {
    const r = await owner.agent.get('/api/auth/me');
    expect(r.status).toBe(200);
    expect(r.body.data.role).toBe('STUDENT');
    expect(r.body.data.passwordHash).toBeUndefined();
    const u = await db.user.findUniqueOrThrow({ where: { id: ownerId } });
    expect(u.passwordHash).not.toBe(secret);
    expect(u.passwordHash).toMatch(/^\$2/);
  });
  it('rejects self-assigned admin roles and duplicate email addresses', async () => {
    const c = await client();
    const input = {
      fullName: 'Intruder',
      email: 'intruder@example.test',
      password: secret,
      confirmPassword: secret,
    };
    expect((await post(c, '/api/auth/register').send({ ...input, role: 'ADMIN' })).status).toBe(
      400,
    );
    expect(
      (await post(c, '/api/auth/register').send({ ...input, email: 'OWNER@example.test' })).status,
    ).toBe(409);
  });
  it('logs in and revokes the session on logout', async () => {
    const c = await client();
    expect(
      (await post(c, '/api/auth/login').send({ email: 'owner@example.test', password: secret }))
        .status,
    ).toBe(200);
    expect((await c.agent.get('/api/auth/me')).status).toBe(200);
    expect((await post(c, '/api/auth/logout')).status).toBe(200);
    expect((await c.agent.get('/api/auth/me')).status).toBe(401);
  });
  it('rejects bad credentials and unknown users with the same response', async () => {
    const c = await client();
    const a = await post(c, '/api/auth/login').send({
      email: 'owner@example.test',
      password: 'incorrect',
    });
    const b = await post(c, '/api/auth/login').send({
      email: 'unknown@example.test',
      password: 'incorrect',
    });
    expect(a.status).toBe(401);
    expect(b.body).toEqual(a.body);
  });
  it('requires authentication, CSRF, correct origin, and server-side admin role', async () => {
    const guest = await client();
    expect((await guest.agent.get('/api/dashboard')).status).toBe(401);
    expect(
      (await owner.agent.post('/api/items').set('Origin', origin).send(report(categoryId))).status,
    ).toBe(403);
    expect(
      (
        await owner.agent
          .post('/api/items')
          .set('Origin', 'https://untrusted.example')
          .set('X-CSRF-Token', owner.token)
          .send(report(categoryId))
      ).status,
    ).toBe(403);
    expect((await owner.agent.get('/api/admin/dashboard')).status).toBe(403);
    expect((await post(guest, '/api/items').send(report(categoryId))).status).toBe(401);
  });
  it('creates lost and found listings in actual MySQL', async () => {
    const a = await post(owner, '/api/items').send(report(categoryId));
    const b = await post(owner, '/api/items').send(
      report(categoryId, 'LOST', 'Lost test calculator'),
    );
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    foundId = a.body.data.id;
    lostId = b.body.data.id;
    expect(await db.item.count({ where: { id: { in: [foundId, lostId] } } })).toBe(2);
  });
  it('does not expose private identifying details or reporter contact', async () => {
    const r = await request(app).get(`/api/items/${foundId}`);
    const list = await request(app).get('/api/items');
    expect(JSON.stringify(r.body)).not.toContain('PRIVATE_SERIAL');
    expect(JSON.stringify(list.body)).not.toContain('PRIVATE_SERIAL');
    expect(r.body.data.user).toBeUndefined();
    expect(r.body.data.email).toBeUndefined();
    expect((await owner.agent.get(`/api/items/${foundId}`)).body.data.identifyingDetails).toBe(
      'PRIVATE_SERIAL_9371',
    );
  });
  it('queries search, category, type, location, sort, and pagination', async () => {
    const r = await request(app).get(
      `/api/items?q=calculator&type=LOST&categoryId=${categoryId}&location=Library&sort=oldest&pageSize=1`,
    );
    expect(r.status).toBe(200);
    expect(r.body.data).toHaveLength(1);
    expect(r.body.data[0].id).toBe(lostId);
    expect(r.body.meta.total).toBe(1);
    expect((await request(app).get('/api/items?q=no-such-item')).body.data).toHaveLength(0);
  });
  it('validates real image contents and stores only re-encoded safe files', async () => {
    const png = await sharp({
      create: { width: 20, height: 20, channels: 3, background: '#2563eb' },
    })
      .png()
      .toBuffer();
    const r = await post(owner, '/api/items')
      .field(report(categoryId, 'FOUND', 'Found upload test'))
      .attach('image', png, { filename: '../../not-safe.png', contentType: 'image/png' });
    expect(r.status).toBe(201);
    expect(r.body.data.imagePath).toMatch(/^\/uploads\/[a-f0-9-]+\.webp$/);
    const before = await readdir(uploadDir);
    const invalid = await post(owner, '/api/items')
      .field(report(categoryId))
      .attach('image', Buffer.from('<script>bad</script>'), {
        filename: 'image.png',
        contentType: 'image/png',
      });
    expect(invalid.status).toBe(400);
    expect(await readdir(uploadDir)).toEqual(before);
  });
  it('rejects uploads larger than 5 MB', async () => {
    const r = await post(owner, '/api/items')
      .field(report(categoryId))
      .attach('image', Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: 'huge.png',
        contentType: 'image/png',
      });
    expect(r.status).toBe(400);
  });
  it('prevents unauthorized edits and withdrawals', async () => {
    expect((await patch(claimant, `/api/items/${foundId}`).send(report(categoryId))).status).toBe(
      403,
    );
    expect((await del(claimant, `/api/items/${foundId}`)).status).toBe(403);
  });
  it('lets a reporter edit an eligible listing and withdraw it without deleting history', async () => {
    const i = await post(owner, '/api/items').send(
      report(categoryId, 'LOST', 'Editable test item'),
    );
    expect(
      (
        await patch(owner, `/api/items/${i.body.data.id}`).send(
          report(categoryId, 'LOST', 'Updated test item'),
        )
      ).status,
    ).toBe(200);
    expect((await del(owner, `/api/items/${i.body.data.id}`)).status).toBe(200);
    expect((await request(app).get(`/api/items/${i.body.data.id}`)).status).toBe(404);
    expect((await db.item.findUniqueOrThrow({ where: { id: i.body.data.id } })).status).toBe(
      'WITHDRAWN',
    );
  });
  it('rejects claims on own listings and on lost items', async () => {
    expect((await post(owner, '/api/claims').send(evidence(foundId))).status).toBe(400);
    expect((await post(claimant, '/api/claims').send(evidence(lostId))).status).toBe(409);
  });
  it('submits ownership evidence and creates database notifications and audit records', async () => {
    const r = await post(claimant, '/api/claims').send(evidence(foundId));
    expect(r.status).toBe(201);
    claimId = r.body.data.id;
    const otherR = await post(other, '/api/claims').send(evidence(foundId));
    otherClaimId = otherR.body.data.id;
    expect(await db.notification.count({ where: { userId: claimantId } })).toBeGreaterThan(0);
    expect(await db.activityLog.count({ where: { entityType: 'CLAIM', entityId: claimId } })).toBe(
      1,
    );
  });
  it('rejects duplicate claims and disallows edits/withdrawals with pending claims', async () => {
    expect((await post(claimant, '/api/claims').send(evidence(foundId))).status).toBe(409);
    expect((await patch(owner, `/api/items/${foundId}`).send(report(categoryId))).status).toBe(409);
    expect((await del(owner, `/api/items/${foundId}`)).status).toBe(409);
  });
  it('limits evidence access to the claimant and admins', async () => {
    const own = await claimant.agent.get('/api/claims/mine');
    expect(own.body.data[0].identifyingDetails).toContain('PRIVATE_CLAIM');
    const reporter = await owner.agent.get(`/api/items/${foundId}/claims`);
    expect(reporter.status).toBe(200);
    expect(JSON.stringify(reporter.body)).not.toContain('PRIVATE_CLAIM');
    expect((await other.agent.get(`/api/items/${foundId}/claims`)).status).toBe(403);
    expect(
      (await patch(claimant, `/api/admin/claims/${claimId}`).send({ status: 'APPROVED' })).status,
    ).toBe(403);
  });
  it('requires explicit handover acknowledgement and a verified claim for found items', async () => {
    expect((await post(admin, `/api/admin/items/${foundId}/return`).send({})).status).toBe(400);
    expect(
      (await post(admin, `/api/admin/items/${foundId}/return`).send({ handoverConfirmed: true }))
        .status,
    ).toBe(409);
  });
  it('transactionally approves one claim, rejects competitors, and does not imply handover', async () => {
    const r = await patch(admin, `/api/admin/claims/${claimId}`).send({
      status: 'APPROVED',
      reviewNote: 'Unique identifier verified in person.',
    });
    expect(r.status).toBe(200);
    expect((await db.item.findUniqueOrThrow({ where: { id: foundId } })).status).toBe('VERIFIED');
    expect((await db.claim.findUniqueOrThrow({ where: { id: otherClaimId } })).status).toBe(
      'REJECTED',
    );
    expect(await db.claim.count({ where: { itemId: foundId, status: 'APPROVED' } })).toBe(1);
  });
  it('prevents a second approval after verification', async () => {
    expect(
      (await patch(admin, `/api/admin/claims/${otherClaimId}`).send({ status: 'APPROVED' })).status,
    ).toBe(409);
    expect(
      (await patch(admin, `/api/admin/claims/${claimId}`).send({ status: 'APPROVED' })).status,
    ).toBe(409);
  });
  it('marks the item returned after actual handover and fires the SQL notification trigger once', async () => {
    const before = await db.notification.count({ where: { userId: ownerId } });
    expect(
      (await post(admin, `/api/admin/items/${foundId}/return`).send({ handoverConfirmed: true }))
        .status,
    ).toBe(200);
    expect((await db.item.findUniqueOrThrow({ where: { id: foundId } })).status).toBe('RETURNED');
    expect(await db.notification.count({ where: { userId: ownerId } })).toBe(before + 1);
    expect(
      (await post(admin, `/api/admin/items/${foundId}/return`).send({ handoverConfirmed: true }))
        .status,
    ).toBe(409);
  });
  it('rejects one claim without closing an open item', async () => {
    const i = await post(owner, '/api/items').send(report(categoryId, 'FOUND', 'Rejection test'));
    const c = await post(claimant, '/api/claims').send(evidence(i.body.data.id));
    expect(
      (
        await patch(admin, `/api/admin/claims/${c.body.data.id}`).send({
          status: 'REJECTED',
          reviewNote: 'Identifier did not match.',
        })
      ).status,
    ).toBe(200);
    expect((await db.item.findUniqueOrThrow({ where: { id: i.body.data.id } })).status).toBe(
      'OPEN',
    );
  });
  it('serializes simultaneous competing approvals', async () => {
    const i = await post(owner, '/api/items').send(
      report(categoryId, 'FOUND', 'Concurrent review test'),
    );
    const a = await post(claimant, '/api/claims').send(evidence(i.body.data.id));
    const b = await post(other, '/api/claims').send(evidence(i.body.data.id));
    const results = await Promise.all([
      patch(admin, `/api/admin/claims/${a.body.data.id}`).send({ status: 'APPROVED' }),
      patch(admin, `/api/admin/claims/${b.body.data.id}`).send({ status: 'APPROVED' }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await db.claim.count({ where: { itemId: i.body.data.id, status: 'APPROVED' } })).toBe(1);
  });
  it('enforces foreign keys, unique emails, unique claimant pairs, and the approved-item database index', async () => {
    await expect(
      db.item.create({
        data: {
          ...report(2147483647),
          type: 'FOUND',
          eventDate: new Date('2026-01-01'),
          userId: ownerId,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
    await expect(
      db.user.create({
        data: { fullName: 'Duplicate', email: 'owner@example.test', passwordHash: 'not-used' },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
    await expect(
      db.claim.create({ data: { ...evidence(foundId), claimantId } }),
    ).rejects.toMatchObject({ code: 'P2002' });
    await expect(
      db.claim.update({ where: { id: otherClaimId }, data: { status: 'APPROVED' } }),
    ).rejects.toMatchObject({ code: 'P2002' });
    await expect(db.category.delete({ where: { id: categoryId } })).rejects.toMatchObject({
      code: 'P2003',
    });
  });
  it('rolls back item state, audit, and notification together on a mid-transaction failure', async () => {
    const before = await db.notification.count({ where: { userId: ownerId } });
    const logBefore = await db.activityLog.count();
    await expect(
      transaction(async (tx) => {
        await tx.item.update({ where: { id: lostId }, data: { status: 'RETURNED' } });
        await audit(tx, adminId, 'ROLLBACK_TEST', 'ITEM', lostId);
        await tx.notification.create({
          data: { userId: 2147483647, message: 'Force foreign-key failure' },
        });
      }),
    ).rejects.toThrow();
    expect((await db.item.findUniqueOrThrow({ where: { id: lostId } })).status).toBe('OPEN');
    expect(await db.notification.count({ where: { userId: ownerId } })).toBe(before);
    expect(await db.activityLog.count()).toBe(logBefore);
  });
  it('executes the view and keeps private evidence out of audit logs', async () => {
    const rows = await db.$queryRaw<{ item_id: number }[]>`SELECT * FROM public_item_summary`;
    expect(rows.length).toBeGreaterThan(0);
    expect(JSON.stringify(await db.activityLog.findMany())).not.toContain('PRIVATE_');
  });
  it('allows only recipients to mark notifications read', async () => {
    const n = await db.notification.findFirstOrThrow({ where: { userId: claimantId } });
    expect((await patch(other, `/api/notifications/${n.id}/read`)).status).toBe(404);
    expect((await patch(claimant, `/api/notifications/${n.id}/read`)).status).toBe(200);
    expect((await db.notification.findUniqueOrThrow({ where: { id: n.id } })).isRead).toBe(true);
  });
  it('supports admin category CRUD and rejects student category management', async () => {
    expect(
      (await post(owner, '/api/admin/categories').send({ name: 'Nope', description: '' })).status,
    ).toBe(403);
    const r = await post(admin, '/api/admin/categories').send({
      name: 'Temporary category',
      description: '',
    });
    expect(r.status).toBe(201);
    expect(
      (
        await patch(admin, `/api/admin/categories/${r.body.data.id}`).send({
          name: 'Renamed category',
          description: 'Edited',
        })
      ).status,
    ).toBe(200);
    expect((await del(admin, `/api/admin/categories/${r.body.data.id}`)).status).toBe(200);
  });
  it('deactivates a student, revokes sessions, and prevents login', async () => {
    expect(
      (await patch(admin, `/api/admin/users/${claimantId}`).send({ isActive: false })).status,
    ).toBe(200);
    expect((await claimant.agent.get('/api/auth/me')).status).toBe(401);
    expect(
      (
        await post(claimant, '/api/auth/login').send({
          email: 'claimant@example.test',
          password: secret,
        })
      ).status,
    ).toBe(401);
  });
  it('resolves a lost report only through explicit administrator recovery confirmation', async () => {
    expect(
      (await post(owner, `/api/admin/items/${lostId}/return`).send({ handoverConfirmed: true }))
        .status,
    ).toBe(403);
    expect(
      (await post(admin, `/api/admin/items/${lostId}/return`).send({ handoverConfirmed: true }))
        .status,
    ).toBe(200);
    expect((await db.item.findUniqueOrThrow({ where: { id: lostId } })).status).toBe('RETURNED');
  });
  it('admin withdrawal closes pending claims atomically and preserves evidence', async () => {
    const i = await post(owner, '/api/items').send(report(categoryId, 'FOUND', 'Moderation test'));
    const c = await post(other, '/api/claims').send(evidence(i.body.data.id));
    expect((await del(admin, `/api/admin/items/${i.body.data.id}`)).status).toBe(200);
    const stored = await db.claim.findUniqueOrThrow({ where: { id: c.body.data.id } });
    expect(stored.status).toBe('REJECTED');
    expect(stored.identifyingDetails).toContain('PRIVATE_CLAIM');
    expect((await db.item.findUniqueOrThrow({ where: { id: i.body.data.id } })).status).toBe(
      'WITHDRAWN',
    );
  });
  it('rejects self-involved administrator reviews without mutating the claim', async () => {
    const i = await post(admin, '/api/items').send(
      report(categoryId, 'FOUND', 'Admin conflict test'),
    );
    const c = await post(other, '/api/claims').send(evidence(i.body.data.id));
    expect(
      (await patch(admin, `/api/admin/claims/${c.body.data.id}`).send({ status: 'APPROVED' }))
        .status,
    ).toBe(403);
    expect((await db.claim.findUniqueOrThrow({ where: { id: c.body.data.id } })).status).toBe(
      'PENDING',
    );
  });
  it('rejects malformed non-ASCII CSRF tokens with a safe 403', async () => {
    const r = await owner.agent
      .post('/api/items')
      .set('Origin', origin)
      .set('X-CSRF-Token', 'é'.repeat(64))
      .send(report(categoryId));
    expect(r.status).toBe(403);
  });
});
