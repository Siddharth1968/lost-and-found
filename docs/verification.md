# Testing and verification report

This records the original implementation before the visual redesign. See [CampusFind 2.0 verification](redesign-2.md) for the current interface, build measurements and browser results.

Verified locally on **20 October 2026 (Asia/Kolkata)**. Source is in the standalone `Siddharth1968/lost-and-found` checkout, branch `main`. This is a local functional verification, not a production security certification or deployment.

## Environment and isolation

Windows, Node 24.18.0, npm 11.16.0, MySQL Community 8.4.6 (project-local portable instance, loopback port 3307). Application database `campusfind`; separate test database `campusfind_test`. No other project's connection, service, source, configuration, deployment or credentials was used. Root and application database credentials were independently generated and kept in ignored local files. The administrator provisioning password was removed from the runtime environment after provisioning.

## Results

| Check                                            | Result                                                                                                           |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Dependency installation and Prisma generation    | Clean `npm ci` reinstall passed; resolved Prisma/client 6.19.3; checks repeated successfully after reinstall     |
| MySQL migrations                                 | Both migrations applied; subsequent deploy reports no pending migrations                                         |
| Development seed                                 | Passed repeatedly without duplicating sample accounts/listings/claims or resetting records                       |
| Administrator provisioning                       | Dedicated new administrator created; no default password                                                         |
| Validation tests (`npm test`)                    | **6 passed**; no database required                                                                               |
| MySQL integration (`npm run test:integration`)   | **32 passed**, actual MySQL, dedicated test DB                                                                   |
| TypeScript (`npm run typecheck`)                 | Client and server passed                                                                                         |
| ESLint (`npm run lint`)                          | Passed                                                                                                           |
| Production build (`npm run build`)               | Server and client passed; vendor chunks split, no oversized-chunk warning                                        |
| SQL demonstration file (`npm run db:verify-sql`) | Every query executed successfully; sample writes rolled back                                                     |
| Runtime smoke                                    | `/api/health` reports connected; SPA `/browse` returns 200 from both source and compiled Express runtime         |
| Desktop browser                                  | Search, registration, report creation, private claim, admin verification and simulated handover passed           |
| Responsive browser                               | Desktop 1440×1000, tablet 768×1024, mobile 390×844 and narrow initial preview inspected                          |
| Git/secret boundary                              | Dedicated remote/root checked; local credentials, uploads/test output, node_modules, builds and `.local` ignored |
| Push / deployment                                | Neither performed; no commits created                                                                            |

## Integration coverage

Registration/hash/private profile; role injection and duplicate email; login/logout/revocation; uniform failed login; unauthenticated/CSRF/origin/admin denial; lost/found database inserts; public evidence/contact privacy; combined search/filter/sort/pagination; actual PNG decoding/WebP storage; fake and oversized images; unauthorized modifications; eligible edits/soft withdrawal; own-item/lost-item claim rejection; claim notifications/audit; duplicates and claimed-item edit/withdrawal protection; claimant/reporter/admin evidence access; explicit handover requirement; atomic approval and competitor rejection; stale/second approval conflict; handover and trigger exactly once; ordinary rejection; **simultaneous conflicting approvals**; FK/email/claimant-pair/approved-item constraints; **mid-transaction FK failure rolling back status, trigger notification and audit together**; view execution; recipient-only read marking; category CRUD/role protection; deactivation/session revocation/login denial; admin-only lost recovery; moderator withdrawal with evidence preserved; self-involved review denial; malformed non-ASCII CSRF rejection.

The test runner explicitly includes only `tests/**/*.test.ts`, preventing compiled copies in `dist` from being executed. Production compilation excludes tests. Integration reset requires `NODE_ENV=test` and a database name ending in `_test`.

## Browser proof and fixes

Real UI input created `[Demo] Browser QA`, submitted a found bottle listing, then submitted a private claim on the fictional wireless-earbud listing. The separately provisioned admin compared private details, approved that claim, and explicitly completed a **simulated physical handover on fictional demo data**. The item changed from OPEN to VERIFIED before RETURNED; competitors were rejected. Counts refresh after admin mutations. Mobile navigation includes Sign out and its session revocation was verified. Demo data now includes that extra QA account/listing and one returned item; seed reruns preserve this history.

Screenshots are in `docs/screenshots`. Browser viewing is evidence of the selected journeys, not exhaustive cross-browser or accessibility certification. Keyboard focus, semantic labels, reduced-motion support, loading/empty/error states and secondary text contrast are implemented. No automated screen-reader audit or load test was performed.

## Known dependency advisory

`npm audit` reports **three high-severity entries from one remaining transitive chain**: `deepmerge-ts@7.1.5 → @prisma/config@6.19.3 → prisma@6.19.3`, advisory [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), recursive-object stack exhaustion. npm proposes a major Prisma upgrade. The affected merge code is part of the Prisma CLI/configuration path, and this API never accepts user-provided Prisma config or recursive JavaScript objects. This narrows exposure but does not make the audit clean; npm also includes the CLI through Prisma's optional peer relationship with `--omit=dev`. No critical advisories remain in the installed dependency audit. Older sharp/Vitest/Effect findings were addressed through version updates. Review a supported patched Prisma toolchain before public production deployment; do not apply `audit fix --force` without migration and MySQL regression testing.

## Operational limits and handoff

HTTPS/reverse-proxy configuration, production backups/persistent upload storage, email ownership verification, password recovery, MFA, campus SSO, distributed rate limits and production load testing are not provided by this single-college mini project. See `security.md` and README. No real student data was used. Secrets are never part of the deliverable.

The temporary Node preview/API processes and dedicated MySQL process were stopped after verification. Source, uploaded test artifacts and database files remain in this isolated checkout; generated data/secrets are ignored. To run on this machine, start the pre-provisioned isolated database with `powershell -File scripts/start-local-db.ps1` in one terminal, and `npm run dev` in another, then visit http://localhost:5173. On another computer, follow the normal README setup. No GitHub push, deployment, or changes to Ivyor were performed.
