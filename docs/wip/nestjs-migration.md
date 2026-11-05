# NestJS migration — verified

User explicitly requested replacing Django with NestJS. Same functional scope: two users, one
USD debit/checking account, shared classification/review, Plaid sync, daily inbox and Railway readiness.
Mode: spec-driven-workflow / strict. Brainstorm gate: no questions needed; defaults below.

## Plan and scope
All changes stay within household-ledger/. Archive the previous implementation and consistent SQLite
snapshot under ignored .local/ before replacing Python runtime/source. Current database was inspected:
one demo connection, six transactions, no real bank connection or Plaid credentials. Preserve this
archive and original SQLite; initialize a separate PostgreSQL demo. No external deploy/authorization.

Use Nest 12.3.3, Node 24.22.1 LTS, Prisma 7.10.1 (avoid registry's 8 RC), TypeScript 6.0.3
(Swagger 12.1.0 peer range excludes TS 7). All versions checked on 2026-11-05; package-lock required.
PostgreSQL locally and in production. Sessions stored in PG; Argon2 passwords; CSRF synchronizer tokens.
AES-256-GCM for new bank tokens, independent BANK_TOKEN_KEY. No real Fernet tokens need migration.

## API changes
Business routes keep /api/ snake_case JSON, cents, versions and household scoping.
Django HTML login/admin are replaced by JSON /api/auth/{csrf,login,logout,me} and Swagger /api/docs.
No existing dedicated frontend exists. Document new session/CSRF protocol and operations CLI.
Preserve monthly summary, editable fields, pending handling and per-user digest receipts.

## Reviewed invariants
1. Product: debit-only still needs transfers/deposits/refunds; initial history excluded from alerts.
2. Architecture: max two users under household lock; one bank; all sync pages/cursor atomic; consistent
   home -> bank -> transaction locking; optimistic updates; failed sync backoff; signed webhooks only.
3. Validation: real PostgreSQL integration, concurrent edits and digest/sync interleaving, authorization,
   CSRF/session rotation/logout, token encryption, webhook cryptography, cents, paging, retry and DST.
Result: APPROVE. Current user request authorizes local migration, runtime replacement and verification.

## Completion gate
Build/typecheck, format, integration tests, Docker build/migrate/web/one-cycle worker; actual HTTP
demo smoke; no active Django start commands; updated README/API/SYSTEM_MAP/ADR/verification.
No persistent background worker workaround after previous automatic approval denial; manual command
remains acceptable. No Railway deployment or real BOA access in this change.

## Execution summary
Replaced the runtime and active source with NestJS/TypeScript/Prisma. Archived legacy source/consistent
SQLite and preserved the original database. Separate PostgreSQL demo initialized; no real data/token
migration was required. New JSON auth/CSRF + Swagger, PG sessions, Argon2, AES-GCM, household-scoped
ledger, Plaid sync/webhook, CLI and worker implemented. Python startup/config files are archived.

Validation: 35 PostgreSQL integration tests passed (none skipped), including concurrent edits and
sync/digest interleaving. Typecheck, Prisma generation, formatting, Linux Docker build, migrations,
production HTTP/session/Swagger checks, one-cycle worker and local two-user HTTP demo smoke passed.
Financial demo net spending remains $119.99. No BOA access or remote Railway deployment performed.

Local Web runtime switched to NestJS; worker remains a manual command as documented. Automatic review
also rejected one PowerShell bulk file-write operation with 'blocked by policy'; ordinary reviewable
apply_patch edits completed those file changes. No approval question or unresolved file-write remains.

Final review: same-agent product, architecture and validation passes APPROVE within the requested scope.
Memory handling: promoted stack/compatibility/archival decisions to ADR 0002 and current modules,
commands and concurrency constraints to SYSTEM_MAP.md; evidence and limitations to VERIFICATION.md.
