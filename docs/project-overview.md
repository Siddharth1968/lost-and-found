# Project overview

Campus belongings often disappear into informal message groups. Reports are hard to search, ownership evidence can become public, and nobody records the final handover. CampusFind provides a searchable, private-by-default college reporting and verification workflow backed by a relational database.

## Objectives and scope

Reconnect students with belongings; verify ownership privately; record handover separately; preserve consistent audit history; demonstrate relational modeling, 3NF, SQL, constraints, views, triggers, indexes, locking and transactions. Scope is one college, React UI, one Express service, MySQL and local uploads. The campus desk physically verifies and hands over belongings. No payments, email, SMS, external identity or unrelated infrastructure.

## Functional requirements

| Area | Implemented requirement |
|---|---|
| Accounts | Student registration, login/logout, session revocation, protected roles |
| Listings | Lost/found reports, photos, private identifiers, eligible edits, withdrawal |
| Discovery | Text/category/type/location/status queries, sort, pagination, detail views |
| Ownership | Private proof, unique claimant pair, admin review, conflict prevention |
| Handover | Explicit admin acknowledgement after physical return |
| Dashboards | Database-backed statistics, recent activity |
| Administration | Category CRUD, moderation, student activation/deactivation |
| Updates | Per-user database notifications and ownership-checked read marking |

## Nonfunctional requirements

Integrity: InnoDB foreign keys, uniqueness, CHECKs and transactional writes. Security: bcrypt, opaque cookies, CSRF, exact origins, validation, private projections and re-encoded uploads. Reliability: atomic decisions and clear errors. Usability: responsive light UI, semantic forms, focus states, loading/error/empty states and reduced-motion support. Maintainability: TypeScript, small monorepo, executable migrations, tests and documentation. Performance: bounded pagination and indexed filters; large-scale load capacity is not claimed without measurement.

## Demonstration

Report a found item as student A with a private identifier. Search and claim it as student B. Open the admin workspace as a separately provisioned administrator, compare evidence and approve. Show that the item is VERIFIED, not RETURNED. After a simulated physical handover, confirm return under Item moderation. Show notifications, audit rows, the view and SQL examples. Only fictional student details are needed.
