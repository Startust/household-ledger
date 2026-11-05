# ADR 0002: Replace the backend runtime with NestJS

Accepted 2026-11-05. User explicitly requested NestJS. Supersedes ADR 0001's framework/runtime choice;
its private, debit-only, server-first and database-worker product decisions remain valid.

Use NestJS 12.3.3 on Node 24.22.1 LTS, ESM/NodeNext and TypeScript 6.0.3. Use stable Prisma 7.10.1
instead of the registry's Prisma 8 RC. Swagger 12.1.0 declares TS 5/6 peers, so TS 7 was not selected.
Keep exact package versions and package-lock; pin container base image digests. PostgreSQL 18.6 is
required locally and in production, so concurrency behavior does not depend on SQLite substitutes.

Replace Django auth/DRF/admin with explicit DTO validation, PG-backed sessions, synchronizer CSRF,
Argon2id passwords, authenticated household guard, operations CLI and Swagger. Preserve business fields,
shared review, optimistic versions, atomic Plaid sync, signed webhooks and daily per-user inbox receipts.
Store new bank tokens using AES-256-GCM with household ID as associated data and a separate 32-byte key.

The inspected old DB contained only six demo rows and no live bank token. Archive its source and
consistent SQLite snapshot, retain the original DB, and seed a separate PG demo. No general data or
Fernet migration is included. No consumer frontend depended on the old HTML auth/admin endpoints.

Consequences: Node + Docker/Postgres are local prerequisites; production still uses web + one worker + PG.
Clients must adopt JSON auth/CSRF. Swagger is a development API interface, not the eventual household UI.
Notifications remain inbox-only; bank OAuth/client UI and live Railway deployment are later work.

Validation: real PG integration and concurrency tests, local two-user HTTP smoke, Linux production
container build/migrations/web/one-cycle worker. See docs/VERIFICATION.md for observed results.
