import 'dotenv/config';
import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
const url = new URL(process.env.DATABASE_URL ?? 'mysql://missing@127.0.0.1/missing');
if (!/^\/campusfind(?:_test)?$/.test(url.pathname))
  throw new Error(
    'SQL demonstrations require the dedicated campusfind or campusfind_test database.',
  );
const c = await mysql.createConnection({ uri: url.toString(), multipleStatements: true });
try {
  const [seed] = await c.query<mysql.RowDataPacket[]>(
    "SELECT user_id FROM users WHERE email = 'asha@example.test'",
  );
  if (!seed.length) throw new Error('Run the opt-in development seed before SQL demonstrations.');
  // Only the repository-owned static academic file may use multipleStatements.
  await c.query(await readFile('../docs/sql-queries.sql', 'utf8'));
  const [leftovers] = await c.query<mysql.RowDataPacket[]>(
    "SELECT item_id FROM items WHERE title = 'Viva transaction notebook'",
  );
  if (leftovers.length) throw new Error('Transaction demonstration unexpectedly persisted a row.');
  console.log('All academic SQL demonstrations executed successfully; demo mutations rolled back.');
} finally {
  await c.end();
}
