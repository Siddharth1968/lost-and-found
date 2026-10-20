import { app } from './app.js';
import { config } from './config.js';
import { db } from './db.js';
await db.$connect();
const server = app.listen(config.PORT, '127.0.0.1', () =>
  console.log(`CampusFind API: http://localhost:${config.PORT}`),
);
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, () => {
    server.close(() => {
      void db.$disconnect().then(() => process.exit(0));
    });
  });
