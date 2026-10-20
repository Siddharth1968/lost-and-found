# CampusFind repository isolation

Work only in the standalone `Siddharth1968/lost-and-found` checkout. Verify `git rev-parse --show-toplevel` and `git remote -v` before mutations. Never use another project's source, credentials, database, Git configuration or deployment. In particular, Ivyor is unrelated and must remain untouched.

Do not push, deploy, rewrite published history, or change global Git configuration without explicit user authorization. Preserve user changes. Keep secrets in ignored environment files; `.local` contains machine-specific private test infrastructure and must never be committed. Tests may clear only a dedicated database ending in `_test`. Use migrations, not `prisma db push`: custom MySQL constraints, a functional unique index, a view and a trigger live in the integrity migration.
