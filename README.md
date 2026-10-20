# CampusFind 2.0

**Lost something? Let’s find it together.** A standalone college Lost and Found DBMS application: React, Express, TypeScript, Prisma, and MySQL. No hosted backend, paid API, or unrelated project service.

Version 2.0 adds an editorial interface, original interactive 3D artwork, responsive motion, multistep reports, and dashboards using live database counts. See the [redesign and verification report](docs/redesign-2.md) for screenshots, changed files, motion fallbacks and bundle measurements. The existing backend, schema and workflows are preserved.

## Repository boundary

Sole repository: `https://github.com/Siddharth1968/lost-and-found.git`. Verified checkout: `C:\Users\asus\CampusFindWorkspace\lost-and-found`. Run commands from this repository root unless stated otherwise.

```sh
git clone https://github.com/Siddharth1968/lost-and-found.git
cd lost-and-found
git rev-parse --show-toplevel
git remote -v
```

## Quick start

Prerequisites: Node.js **22.12+**, npm 10+, MySQL **8.0.16+ (8.4 recommended)**, InnoDB and utf8mb4. Verified with Node 24.18.0 and MySQL 8.4.6. CHECK constraints need MySQL 8.0.16+; MariaDB is not the verified target.

1. Create a dedicated database and new credentials as a local MySQL administrator:

   ```sql
   CREATE DATABASE campusfind CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'campusfind'@'localhost' IDENTIFIED BY 'REPLACE_WITH_YOUR_NEW_PASSWORD';
   GRANT ALL PRIVILEGES ON campusfind.* TO 'campusfind'@'localhost';
   ```

   Migrations create a view, trigger, and functional unique index. With binary logging enabled, ask your DBA to permit trusted trigger creation or execute migrations with a privileged migration account. On a **dedicated local development instance only**, a DBA can run `SET GLOBAL log_bin_trust_function_creators = 1;`. Never change another project's server. After migration the runtime user needs only SELECT/INSERT/UPDATE/DELETE; DDL privileges are for setup.

2. Run `npm ci`. Copy `server/.env.example` to `server/.env` (`Copy-Item` in PowerShell, `cp` on Unix). Set your own `DATABASE_URL`, URL-encoding password characters. Set `DEMO_PASSWORD` to a new password of 12–72 UTF-8 bytes if using demo data. Leave `COLLEGE_EMAIL_DOMAIN` empty for unrestricted local demonstrations. Never commit `.env`.

3. Generate the ORM client, migrate, and optionally seed:

   ```sh
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

   The repeatable seed preserves existing accounts/listings. It creates three marked fictional students (`asha@example.test`, `kabir@example.test`, `mira@example.test`), eight categories, nine sample listings, and two pending claims. Login uses **your** `DEMO_PASSWORD`. Rerunning never resets existing passwords. Seeding is disabled in production.

4. Set `ADMIN_EMAIL`, `ADMIN_NAME`, and a new strong `ADMIN_PASSWORD` in `server/.env`. Run `npm run admin:create`. This creates a dedicated new administrator and refuses to elevate/overwrite an existing email. Remove `ADMIN_PASSWORD` afterward. Public registration always creates students and rejects role fields.

5. Run `npm run dev` and open **http://localhost:5173**. The API is on `127.0.0.1:4000`; Vite proxies `/api` and `/uploads`. Use `localhost` consistently: `APP_ORIGIN` must exactly match the browser origin. To use `127.0.0.1` instead, change that setting and restart the API.

## Implemented journeys

- Public live statistics, listings, categories, search, category/type/location/status filters, sorting, pagination, grid/list views and item details.
- Registration/login/logout, bcrypt, revocable MySQL sessions, HTTP-only cookies, CSRF, exact-origin checks, optional college domain restriction.
- Lost/found reports, safe optional images, private identifiers, eligible edits and withdrawal with history retained.
- Private claims, unique item/claimant pairs, admin verification/rejection, separate physical handover, notifications.
- Student dashboard/activity, My listings, My claims and notifications.
- Admin evidence comparison, moderation, handover confirmation, category CRUD, student deactivation/reactivation and session revocation.
- Six core tables plus sessions, foreign/unique keys, indexes, CHECKs, functional uniqueness, reporting view and return-notification trigger.

## Workflow rules

Found items: `OPEN → VERIFIED → RETURNED` or `OPEN → WITHDRAWN`. Lost items: `OPEN → RETURNED` after admin-confirmed recovery, or `OPEN → WITHDRAWN`.

Approval verifies ownership, never physical handover. Only admins review claims and confirm return. Admins cannot review their own claims or claims on their own listings. Approval rejects competing pending claims in the same transaction. Listings with any claims cannot be edited. Student withdrawal with pending claims is blocked; admin moderation rejects pending claims transactionally. A rejected claimant cannot submit again for the same item; further evidence goes through the campus desk. Domain/audit history is retained; only unused categories are physically deleted.

## Checks and integration tests

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

The publication check passed 10 unit tests and 32 MySQL integration tests, plus TypeScript, lint and the production build. Unit coverage includes source and compiled static asset paths, ensuring both resolve this checkout's own `client/dist`.

After the opt-in demo seed, `npm run db:verify-sql` executes every academic SQL example and verifies that its sample writes were rolled back. `npm run format` formats the TypeScript/CSS sources.

Create a **separate database ending in `_test`** and a dedicated account:

```sql
CREATE DATABASE campusfind_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'campusfind_test'@'localhost' IDENTIFIED BY 'REPLACE_WITH_ANOTHER_NEW_PASSWORD';
GRANT ALL PRIVILEGES ON campusfind_test.* TO 'campusfind_test'@'localhost';
```

Copy `server/.env.test.example` to `server/.env.test`, configure its URL, and run `npm run test:integration`. The suite migrates and **clears only the guarded test database**. It refuses to run without `NODE_ENV=test` and a name ending in `_test`. Tests use actual MySQL. See the [verification report](docs/verification.md).

## Compiled application and operations

```sh
npm run build
npm run start -w server
```

Express serves the built client and SPA routes. For local compiled preview keep `NODE_ENV=development` and set `APP_ORIGIN=http://localhost:4000`. A deployment needs HTTPS, `NODE_ENV=production`, and the correct HTTPS origin. The service binds to loopback behind a reverse proxy. Set `TRUST_PROXY=1` only behind exactly one trusted proxy that overwrites forwarded headers. Production cookies use Secure, HttpOnly, SameSite=Lax and `__Host-`. **No deployment has been performed.**

Uploads are decoded, stripped and re-encoded as WebP in `server/uploads`: JPEG/PNG/WebP input, 5 MB input limit, 25 megapixel decode limit, 1600px output. Replaced images and failed DB writes are cleaned up; crashes can leave orphans. Local storage requires persistent disk and backups; do not run multiple instances without shared storage. Back up MySQL and uploads together. Session tokens are stored only as SHA-256 hashes. Expired sessions are purged for a user at sign-in. Rate limits are process-local for the requested single-server architecture.

## Structure and academic deliverables

| Path               | Purpose                                                   |
| ------------------ | --------------------------------------------------------- |
| `client/src/pages` | Public, student and administrator React journeys          |
| `server/src`       | REST routes, security, uploads, transactional services    |
| `server/prisma`    | Schema, two MySQL migrations, repeatable development seed |
| `server/scripts`   | Explicit administrator provisioning                       |
| `server/tests`     | Validation and real MySQL integration suites              |
| `docs`             | Academic and operational documentation                    |

- [Project overview and requirements](docs/project-overview.md)
- [ER diagram, schema, 3NF and data dictionary](docs/database.md)
- [Complete creation SQL](docs/schema.sql)
- [Executable SQL demonstrations](docs/sql-queries.sql)
- [Architecture and REST API](docs/architecture.md)
- [25 DBMS viva questions](docs/viva.md)
- [Security and limitations](docs/security.md)
- [Verification report](docs/verification.md)
- [This machine’s isolated MySQL instance](docs/local-instance.md)

## Troubleshooting

- Cannot connect: start the dedicated MySQL server, check port/grants, and URL-encode password characters. Never substitute another project's connection.
- Trigger error 1419: ask your DBA to run the migration or permit trusted trigger creation on your own instance. MySQL DDL commits implicitly; inspect partial objects before resolving a failed migration. Never reset student work.
- 403 on writes: match `APP_ORIGIN` exactly, enable first-party cookies and refresh for a new CSRF token.
- No categories: run the demo seed or create categories in the administrator workspace.
- Category deletion blocked: existing listings reference it; rename/edit it instead. Foreign-key restrictions preserve history.

Prisma 6 is pinned for its verified MySQL schema/client API. See the verification report for dependency advisory status; do not blindly apply a major Prisma upgrade.
