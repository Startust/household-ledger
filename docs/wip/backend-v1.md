# Backend v1 — implementation verified

Historical Django delivery. Superseded by [NestJS migration](nestjs-migration.md).
Current runtime, commands and verification are in README.md and docs/VERIFICATION.md.

## Goal and scope
Build a runnable local server for two household members sharing one BOA USD checking/debit
account. Prepare Railway deployment, without deploying or connecting real bank data this turn.
The server owns accounts, categories, review state, statistics, Plaid sync and daily digest inbox.
Dedicated consumer web/desktop/iPhone UI and external push/email delivery are follow-up work.

## Decisions
- Django 6.1.3 + DRF 3.18.3, Python 3.14.10 (latest patch of a mature supported runtime).
  Versions checked against PyPI and official Django/DRF docs on 2026-11-05; lock transitives.
- PostgreSQL in production; SQLite for zero-service local startup; verify both engines.
- Two provisioned users per household; no public signup; Django sessions + CSRF.
- One selected USD checking account per household; backend validates Plaid account metadata.
- Integer USD cents; positive provider amount is outflow. Expense/income/transfer/refund
  are separate classifications. Monthly spend includes settled expenses minus refunds only.
- Provider suggestions and manual category/review/note are separate. Imported history is
  reviewable but not flooded into the new-activity digest.
- No bank login/password storage. Plaid tokens encrypted; webhooks signature/hash/age checked.
- Web/API service plus one polling worker, same source/image. Durable database work requests,
  retry/backoff and periodic catch-up; no Redis/Celery required at this scale.
- Daily digest defaults to 21:00 America/New_York. It describes newly synchronized settled
  records, not all spending on that calendar day. Inbox only in this phase, no external sends.

## Affected files
Only household-ledger/: config/, ledger/, tests/, templates/ (framework login only),
docs/, manage.py, pyproject.toml/uv.lock, environment examples, Docker/Compose/Railway config.
Parent workspace has unrelated untracked files; no overlap, staging, commits or branch changes.

## Acceptance
1. Bootstrap a two-member household; session login/logout and CSRF behave correctly.
2. Both users see the same transactions/categories; unrelated members cannot access them.
3. Category changes and review actions reject stale versions, preserve edits during sync,
   reject categories from another household, and record editor/audit history.
4. Plaid initial and update Link tokens, validated exchange, encrypted storage, incremental
   cursor pagination, pending replacement, modified/removed entries and retries work.
5. Invalid webhooks rejected; valid duplicate deliveries only request idempotent sync.
6. Initial history does not trigger a huge digest. Settled-only statistics, transfer exclusion,
   refunds, time zone/DST, digest deduplication and per-member read state are verified.
7. Production configuration fails closed; health endpoint, migration, static assets,
   container and Railway web/worker commands are supplied and exercised where available.

## Self-review convergence (same agent)
1. Product: clarified debit-only still includes deposits/transfers/refunds; daily digest uses
   sync arrival rather than transaction date. Dedicated UI and outbound channels deferred.
2. Architecture: added single-account validation, encrypted tokens, household scoping,
   transactional cursor and optimistic edits; row locks in PostgreSQL, one local worker.
3. Verification: added signed webhook fixtures, real PostgreSQL integration, initial history
   suppression, duplicate job tests and deployment startup checks. No new blocking findings.
Status: APPROVE. User authorized local implementation; no separate approval gate applies.

## Execution summary
Implemented the scoped backend, authenticated browsable API, read-only operator admin, encrypted
Plaid adapter, transactional sync, manual edit history, monthly statistics and scheduled digest inbox.
Added CLI provisioning/demo tools, pinned environment/lockfile, Docker image and Railway web/worker configs.

Verification on 2026-11-05:
- 33 tests passed on real PostgreSQL 18.6, including two concurrent writers and correct stale-edit rejection.
- Offline fixtures verify Plaid API handling; no real bank/network authorization was performed.
- Ruff lint and format checks, Django system checks and migration consistency passed.
- Production Docker build, migration, worker cycle and `check --deploy --fail-level WARNING` passed.
- Real HTTP smoke: two demo logins, cross-user editing, 409 stale write, 403 anonymous read and $119.99
  net demo spending after excluding pending/transfer and applying refund all passed.
- Production container: health, static files, HTTPS redirect, Secure cookie, private API and fail-closed
  missing-secret startup passed. Image confirmed free of local .env, demo DB and local logs.
- No Railway mutations; connector requires reauthentication. No production account or message sends.
- Local Web started at 127.0.0.1:8765. Persistent background worker launch was rejected by automatic
  approval review with only "blocked by policy"; no alternate launch method was attempted. A manual
  runworker command is documented. Single-cycle worker execution already passed locally and in Docker.
- Disposable PostgreSQL/Web verification containers and their network were stopped/removed.

Review correction during execution: synchronized digest cutoff with bank import using consistent
household -> bank row-lock order; otherwise a commit around the cutoff could omit a new record.
Fixed test-thread DB connection cleanup and smoke client context usage based on verification failures.

Verification And Memory Gate: passed. Architecture, commands, constraints and follow-up boundary
promoted to SYSTEM_MAP and ADR 0001. Secondary inbox reviewed; no additional speculative memory needed.
Remaining external acceptance: real Plaid/BOA authorization, OAuth client page, public webhook delivery,
dedicated UI, external notifications and actual Railway deployment are explicitly subsequent phases.
