import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../src/db.js';
import { password } from '../src/validation.js';
const input = z
  .object({
    ADMIN_EMAIL: z
      .string()
      .email()
      .transform((v) => v.toLowerCase()),
    ADMIN_NAME: z.string().trim().min(2).max(100),
    ADMIN_PASSWORD: password,
  })
  .parse(process.env);
try {
  const user = await db.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email: input.ADMIN_EMAIL } });
    if (existing)
      throw new Error(
        'That email already exists. Provisioning never elevates or overwrites an existing account; choose a dedicated new administrator email.',
      );
    const u = await tx.user.create({
      data: {
        fullName: input.ADMIN_NAME,
        email: input.ADMIN_EMAIL,
        passwordHash: await bcrypt.hash(input.ADMIN_PASSWORD, 12),
        role: 'ADMIN',
      },
    });
    await tx.activityLog.create({
      data: { actorId: u.id, action: 'ADMIN_PROVISIONED', entityType: 'USER', entityId: u.id },
    });
    return u;
  });
  console.log(
    `Administrator provisioned: ${user.email}. Remove ADMIN_PASSWORD from your environment after use.`,
  );
} finally {
  await db.$disconnect();
}
