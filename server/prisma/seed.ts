import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db } from '../src/db.js';
import { password } from '../src/validation.js';
import { submitClaim } from '../src/services.js';

if (process.env.NODE_ENV === 'production') throw new Error('Demo seed is disabled in production.');
const demoPassword = password.parse(process.env.DEMO_PASSWORD);
const hash = await bcrypt.hash(demoPassword, 12);
try {
  const categories = [
    'Electronics',
    'ID & Cards',
    'Books & Notes',
    'Bags',
    'Keys',
    'Clothing',
    'Accessories',
    'Other',
  ];
  for (const name of categories)
    await db.category.upsert({
      where: { name },
      create: { name, description: `Campus ${name.toLowerCase()} and related belongings.` },
      update: {},
    });
  const users = [];
  for (const [fullName, email] of [
    ['[Demo] Asha Rao', 'asha@example.test'],
    ['[Demo] Kabir Shah', 'kabir@example.test'],
    ['[Demo] Mira Sen', 'mira@example.test'],
  ]) {
    users.push(
      await db.user.upsert({
        where: { email },
        create: { fullName, email, passwordHash: hash },
        update: {},
      }),
    );
  }
  const samples: [string, 'LOST' | 'FOUND', string, string, string][] = [
    [
      'Student ID card',
      'LOST',
      'ID & Cards',
      'Central Library',
      'My student ID card went missing after an afternoon study session. Please hand it in at the campus desk.',
    ],
    [
      'Wireless earbuds',
      'FOUND',
      'Electronics',
      'Engineering Block',
      'A pair of wireless earbuds in their charging case was found near the lecture halls. Describe the case to claim.',
    ],
    [
      'Scientific calculator',
      'LOST',
      'Electronics',
      'Science Lab',
      'A scientific calculator was left behind after the morning practical. It has a protective sliding cover.',
    ],
    [
      'Insulated water bottle',
      'FOUND',
      'Accessories',
      'Sports Complex',
      'An insulated metal water bottle was found beside the basketball court after practice.',
    ],
    [
      'Spiral notebook',
      'LOST',
      'Books & Notes',
      'Student Centre',
      'A spiral notebook with lecture notes went missing in the student common area.',
    ],
    [
      'Everyday backpack',
      'FOUND',
      'Bags',
      'Central Library',
      'A backpack was left under a reading desk. Its contents are safely held at the campus lost and found desk.',
    ],
    [
      'USB flash drive',
      'LOST',
      'Electronics',
      'Computer Lab',
      'A USB flash drive was misplaced near the computer workstations. It contains project files.',
    ],
    [
      'Classic wristwatch',
      'FOUND',
      'Accessories',
      'Cafeteria',
      'A wristwatch was found on a cafeteria table. Please describe its dial and strap to verify ownership.',
    ],
    [
      'Room keys with keyring',
      'FOUND',
      'Keys',
      'Student Centre',
      'A set of keys with a keyring was found on the seating area near the student centre entrance.',
    ],
  ];
  for (let n = 0; n < samples.length; n++) {
    const [title, type, categoryName, location, description] = samples[n];
    const userId = users[n % users.length].id;
    if (await db.item.findFirst({ where: { title, userId } })) continue;
    const category = await db.category.findUniqueOrThrow({ where: { name: categoryName } });
    await db.item.create({
      data: {
        title,
        type,
        categoryId: category.id,
        userId,
        location,
        description: `${description} (Demonstration listing.)`,
        eventDate: new Date(new Date(Date.now() - (n + 1) * 86400000).toISOString().slice(0, 10)),
        createdAt: new Date(Date.now() - n * 10800000),
        identifyingDetails: 'Demo private detail: a small star sticker on the back.',
      },
    });
  }
  const found = await db.item.findFirstOrThrow({
    where: { title: 'Wireless earbuds', type: 'FOUND', userId: users[1].id },
  });
  for (const user of [users[0], users[2]]) {
    if (
      found.status === 'OPEN' &&
      !(await db.claim.findUnique({
        where: { itemId_claimantId: { itemId: found.id, claimantId: user.id } },
      }))
    ) {
      await submitClaim(user.id, {
        itemId: found.id,
        ownershipProof:
          'Demonstration evidence: I left these after the afternoon lecture in the engineering block.',
        identifyingDetails: 'Demo private detail: a small star sticker on the back.',
        supportingInformation: 'Demonstration only; no real personal information.',
      });
    }
  }
  console.log(
    'Demo seed complete. Student emails: asha@example.test, kabir@example.test, mira@example.test. Password comes from DEMO_PASSWORD. Existing records were preserved.',
  );
} finally {
  await db.$disconnect();
}
