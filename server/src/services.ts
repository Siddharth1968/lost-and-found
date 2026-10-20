import { Prisma, type Item, type PrismaClient } from '@prisma/client';
import type { z } from 'zod';
import { db } from './db.js';
import { HttpError } from './errors.js';
import type { claimInput, itemInput, reviewInput } from './validation.js';

export const publicItem = {
  id: true,
  userId: true,
  title: true,
  categoryId: true,
  category: true,
  description: true,
  type: true,
  location: true,
  eventDate: true,
  status: true,
  imagePath: true,
  createdAt: true,
  updatedAt: true,
} as const;
export const audit = (
  tx: Prisma.TransactionClient,
  actorId: number,
  action: string,
  entityType: string,
  entityId: number,
) => tx.activityLog.create({ data: { actorId, action, entityType, entityId } });
export const notify = (tx: Prisma.TransactionClient, userId: number, message: string) =>
  tx.notification.create({ data: { userId, message } });
export const transaction = <T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  client: PrismaClient = db,
) =>
  client.$transaction(fn, {
    isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    timeout: 15000,
  });
// All claim and item writes lock the parent item first, serializing per-item decisions.
export async function lockItem(tx: Prisma.TransactionClient, itemId: number): Promise<Item> {
  await tx.$queryRaw`SELECT item_id FROM items WHERE item_id = ${itemId} FOR UPDATE`;
  const item = await tx.item.findUnique({ where: { id: itemId } });
  if (!item) throw new HttpError(404, 'Item not found.');
  return item;
}
export async function createItem(
  actorId: number,
  input: z.infer<typeof itemInput>,
  imagePath?: string,
) {
  return transaction(async (tx) => {
    const item = await tx.item.create({
      data: { ...input, userId: actorId, imagePath },
      select: publicItem,
    });
    await audit(tx, actorId, 'ITEM_REPORTED', 'ITEM', item.id);
    return item;
  });
}
export async function editItem(
  actorId: number,
  itemId: number,
  input: z.infer<typeof itemInput>,
  imagePath?: string,
) {
  return transaction(async (tx) => {
    const old = await lockItem(tx, itemId);
    if (old.userId !== actorId) throw new HttpError(403, 'You can only edit your own listings.');
    if (old.status !== 'OPEN') throw new HttpError(409, 'Only open listings can be edited.');
    if (await tx.claim.count({ where: { itemId } }))
      throw new HttpError(409, 'Listings with claims cannot be edited. Contact an administrator.');
    if (old.type !== input.type)
      throw new HttpError(400, 'A listing cannot change between lost and found.');
    const item = await tx.item.update({
      where: { id: itemId },
      data: { ...input, ...(imagePath ? { imagePath } : {}) },
      select: publicItem,
    });
    await audit(tx, actorId, 'ITEM_EDITED', 'ITEM', itemId);
    return { item, oldImage: imagePath ? old.imagePath : undefined };
  });
}
export async function withdrawItem(actorId: number, itemId: number, admin = false) {
  return transaction(async (tx) => {
    const item = await lockItem(tx, itemId);
    if (item.userId !== actorId && !admin)
      throw new HttpError(403, 'You can only withdraw your own listings.');
    if (item.status !== 'OPEN') throw new HttpError(409, 'Only open listings can be withdrawn.');
    const pending = await tx.claim.findMany({ where: { itemId, status: 'PENDING' } });
    if (pending.length && !admin)
      throw new HttpError(409, 'An administrator must moderate listings with pending claims.');
    for (const claim of pending) {
      await tx.claim.update({
        where: { id: claim.id },
        data: {
          status: 'REJECTED',
          reviewedBy: actorId,
          reviewedAt: new Date(),
          reviewNote: 'Listing withdrawn by an administrator.',
        },
      });
      await notify(
        tx,
        claim.claimantId,
        `Your claim for “${item.title}” was closed because the listing was withdrawn.`,
      );
    }
    const result = await tx.item.update({
      where: { id: itemId },
      data: { status: 'WITHDRAWN' },
      select: publicItem,
    });
    await audit(tx, actorId, admin ? 'ITEM_MODERATED' : 'ITEM_WITHDRAWN', 'ITEM', itemId);
    return result;
  });
}
export async function submitClaim(actorId: number, input: z.infer<typeof claimInput>) {
  return transaction(async (tx) => {
    const item = await lockItem(tx, input.itemId);
    if (item.userId === actorId) throw new HttpError(400, 'You cannot claim your own listing.');
    if (item.type !== 'FOUND' || item.status !== 'OPEN')
      throw new HttpError(409, 'Only open found items accept ownership claims.');
    const duplicate = await tx.claim.findUnique({
      where: { itemId_claimantId: { itemId: item.id, claimantId: actorId } },
    });
    if (duplicate) throw new HttpError(409, 'You have already submitted a claim for this item.');
    const claim = await tx.claim.create({ data: { ...input, claimantId: actorId } });
    await notify(
      tx,
      actorId,
      `Your claim for “${item.title}” has been submitted for verification.`,
    );
    await notify(
      tx,
      item.userId,
      `An ownership claim for “${item.title}” is awaiting administrator verification.`,
    );
    await audit(tx, actorId, 'CLAIM_SUBMITTED', 'CLAIM', claim.id);
    return claim;
  });
}
export async function reviewClaim(
  adminId: number,
  claimId: number,
  input: z.infer<typeof reviewInput>,
) {
  const reference = await db.claim.findUnique({ where: { id: claimId }, select: { itemId: true } });
  if (!reference) throw new HttpError(404, 'Claim not found.');
  return transaction(async (tx) => {
    const item = await lockItem(tx, reference.itemId);
    const claim = await tx.claim.findUniqueOrThrow({ where: { id: claimId } });
    if (claim.status !== 'PENDING')
      throw new HttpError(409, 'This claim has already been reviewed.');
    if (claim.claimantId === adminId || item.userId === adminId)
      throw new HttpError(
        403,
        'Another administrator must review claims involving your own account or listing.',
      );
    if (item.status !== 'OPEN')
      throw new HttpError(409, 'This item is no longer open for claim review.');
    const updated = await tx.claim.update({
      where: { id: claimId },
      data: { ...input, reviewedBy: adminId, reviewedAt: new Date() },
    });
    if (input.status === 'APPROVED') {
      await tx.item.update({ where: { id: item.id }, data: { status: 'VERIFIED' } });
      const others = await tx.claim.findMany({
        where: { itemId: item.id, id: { not: claimId }, status: 'PENDING' },
      });
      await tx.claim.updateMany({
        where: { itemId: item.id, id: { not: claimId }, status: 'PENDING' },
        data: {
          status: 'REJECTED',
          reviewedBy: adminId,
          reviewedAt: new Date(),
          reviewNote: 'Another ownership claim was verified.',
        },
      });
      for (const other of others)
        await notify(
          tx,
          other.claimantId,
          `Your claim for “${item.title}” was rejected after another claim was verified.`,
        );
      await notify(
        tx,
        item.userId,
        `Ownership of “${item.title}” has been verified. Arrange handover through your campus lost and found desk.`,
      );
    }
    await notify(
      tx,
      claim.claimantId,
      input.status === 'APPROVED'
        ? `Your claim for “${item.title}” was approved. Visit the campus lost and found desk for handover.`
        : `Your claim for “${item.title}” was rejected. Review the decision in My claims.`,
    );
    await audit(tx, adminId, `CLAIM_${input.status}`, 'CLAIM', claimId);
    return updated;
  });
}
export async function markReturned(adminId: number, itemId: number) {
  return transaction(async (tx) => {
    const item = await lockItem(tx, itemId);
    const approved = await tx.claim.findFirst({ where: { itemId, status: 'APPROVED' } });
    if (item.type === 'FOUND' && (item.status !== 'VERIFIED' || !approved))
      throw new HttpError(409, 'Verify an ownership claim before confirming handover.');
    if (item.type === 'LOST' && item.status !== 'OPEN')
      throw new HttpError(409, 'Only an open lost report can be resolved.');
    const result = await tx.item.update({
      where: { id: itemId },
      data: { status: 'RETURNED' },
      select: publicItem,
    });
    if (approved)
      await notify(
        tx,
        approved.claimantId,
        `“${item.title}” was marked returned after handover. Thank you for using CampusFind!`,
      );
    // The SQL trigger notifies the reporter, even for status changes made directly in SQL.
    await audit(tx, adminId, 'HANDOVER_CONFIRMED', 'ITEM', itemId);
    return result;
  });
}
