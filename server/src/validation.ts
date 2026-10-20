import { z } from 'zod';
export const id = z.coerce.number().int().positive();
const text = (min: number, max: number) => z.string().trim().min(min).max(max);
export const password = z
  .string()
  .min(12)
  .max(72)
  .refine((v) => Buffer.byteLength(v, 'utf8') <= 72, 'Password must fit within 72 UTF-8 bytes');
export const registration = z
  .object({
    fullName: text(2, 100),
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    password,
    confirmPassword: z.string(),
  })
  .strict()
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords must match',
  });
export const login = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    password: z.string().min(1).max(72),
  })
  .strict();
export const itemInput = z
  .object({
    title: text(3, 120),
    categoryId: id,
    description: text(15, 3000),
    type: z.enum(['LOST', 'FOUND']),
    location: text(2, 160),
    eventDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine(
        (v) =>
          !Number.isNaN(Date.parse(v)) &&
          new Date(v).toISOString().slice(0, 10) === v &&
          v <= new Date().toISOString().slice(0, 10),
        'Choose a valid date that is not in the future',
      )
      .transform((v) => new Date(`${v}T00:00:00Z`)),
    identifyingDetails: text(0, 2000).optional(),
  })
  .strict();
export const claimInput = z
  .object({
    itemId: id,
    ownershipProof: text(20, 3000),
    identifyingDetails: text(10, 2000),
    supportingInformation: text(0, 2000).optional(),
  })
  .strict();
export const reviewInput = z
  .object({ status: z.enum(['APPROVED', 'REJECTED']), reviewNote: text(0, 500).optional() })
  .strict();
export const categoryInput = z.object({ name: text(2, 60), description: text(0, 255) }).strict();
export const pagination = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});
export const itemQuery = pagination.extend({
  q: text(0, 120).optional(),
  categoryId: id.optional(),
  type: z.enum(['LOST', 'FOUND']).optional(),
  location: text(0, 160).optional(),
  status: z.enum(['OPEN', 'VERIFIED', 'RETURNED', 'WITHDRAWN']).optional(),
  sort: z.enum(['newest', 'oldest', 'event']).default('newest'),
  mine: z.enum(['true']).optional(),
});
