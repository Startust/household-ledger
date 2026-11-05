# System map · NestJS

## Scope
One private household, two provisioned members, one USD checking/debit account.
English React PWA and NestJS backend share one origin. Client Link/OAuth flow is implemented; real bank authorization,
actual iPhone installation and external push remain unverified/follow-up. Railway category-label deployment, migrations, public health and release assets are verified; authenticated production flows were not rerun for this release.
Multiple Household rows enforce/test isolation, not public signup.

## Modules
- `src/bootstrap.ts`: Nest/Express, PG sessions, CSRF, HTTPS proxy handling, validation, safe errors, Swagger.
- `src/static.ts`: serves web/dist, extensionless SPA/OAuth fallback excludes API/health/webhooks; static-only cache policy.
- `web/src/App.tsx`: session lifecycle, responsive navigation, online state, app-update prompt.
- `web/src/api.ts`: same-origin cookies, in-memory CSRF, timeout/errors and expiry recovery.
- `web/src/ExportMenu.tsx`: month/filter-scoped CSV/PDF downloads; aborts on scope changes/unmount; no persistent file cache.
- `web/src/Overview.tsx`, `Transactions.tsx`, `TransactionEditor.tsx`: monthly stats, filters, explicit versioned edits.
- `web/src/Settings.tsx`, `CategoryList.tsx`, `BankPanel.tsx`, `Inbox.tsx`: household/category/password settings, swipe/Actions deletion with confirmation, Plaid Link, per-user updates.
- `web/vite.config.ts`: PWA manifest/precache; only public build assets cached, API network-only.
- `src/config.ts`: required DB/key configuration; `src/database.ts`: Prisma PG adapter and row-lock helpers.
- `src/auth.ts`: global household auth guard, Argon2, durable login limits, member provisioning, session rotation, old-password validation and revocation of all own sessions.
- `src/dto.ts`: explicit validated DTOs/OpenAPI metadata; `src/controllers.ts`: HTTP routes.
- `src/ledger.ts`: multiple category labels, category deletion, automatic income review, optimistic edits/audit, monthly totals, digest generation/read receipts.
- `src/exports.ts`, `src/export-renderer.ts`: authenticated snapshot exports using shared ledger filters, 5,000-row fail-closed limit, BigInt CSV values, PDFKit pagination and embedded CJK font from `assets/fonts`.
- `src/bank.ts`: Plaid link/exchange, account selection and reconnect; response allowlist excludes secrets.
- `src/plaid.ts`: HTTP adapter, AES-256-GCM token vault, ES256/raw-body webhook verifier.
- `src/sync.ts`: durable request/completion counters, atomic pagination, pending replacement and backoff.
- `src/worker.ts`: 30-second sync/digest loop; `src/cli.ts`: household/member/password/demo operations.
- `prisma/schema.prisma`, `prisma/migrations/`: Postgres schema, constraints and session table.
- `test/backend.test.ts`: real PG/HTTP integration, provider fixtures, concurrent writes and digest/sync locking.

## Invariants
Money uses integer cents/BigInt. JSON totals are checked before conversion; pending/removed/transfer excluded from net spending.
Auth derives household from the database every request. A household has one bank and at most two provisioned members.
Provider identity (bank_id, provider_id) is unique. Sync locks household, bank, then transaction rows.
Digests lock household, compute their current instant after locking, and therefore cannot skip in-flight imported activity.
Category updates/deletion, transaction edits and sync serialize on the household lock. Edits then scope-check, lock the transaction and compare version. Manual fields survive provider updates.
TransactionCategory stores category associations; category_id remains the compatibility primary category. New edits update both; reads account for legacy single-category writes during rollout.
Category deletion removes only the chosen label, retains transactions/other labels, updates the compatibility primary category, increments affected transaction versions and records category edit history. No labels means Uncategorized.
Overall totals count a transaction once. Expense/refund category subtotals include its full signed amount in each assigned label and may overlap; income/transfers are excluded from category spending.
Pending replacement preserves all labels/note/compatible manual flow. Amount/name/flow changes clear non-income review; income remains automatically reviewed and is excluded from outstanding-review filters/counts and manual review UI.
CSV/PDF exports retain one transaction row with all category names together. Income has no reviewer attribution; CSV marks review as Not required and PDF retains bank status only.
All pages, transaction changes and cursor commit atomically. Provider failures roll back to a savepoint and commit backoff.
Initial history has no notify_at; only subsequent settled arrivals enter new-activity digests.
Digest uniqueness is (household, local_date); receipts are unique per (digest, user).
Category names/usernames have case-insensitive unique indexes. DB checks enforce USD, supported amounts and counters.

## Runtime
Node 24.22.1 LTS / Nest 12.3.3 / TS 6.0.3 / Prisma 7.10.1 / PG 18.6.
Web + one worker + Postgres locally and on Railway; no Redis, SQLite or Python runtime.
Worker scans every 30s, retries capped at 6h, catch-up sync every 6h. One worker replica.
GET /health/ready checks DB only. Client must show bank state/last sync; worker presence needs operational monitoring.
Sessions/CSRF are same-origin. Production trusts one Railway proxy hop and redirects HTTP to configured HTTPS origin.
Secrets are runtime env vars. Migrations run in both web and worker pre-deploy.
Deploy worker first, verify migration/startup, then deploy web so both processes preserve labels before the new picker is exposed.
Migration 202611050003_category_labels adds/backfills TransactionCategory from existing category_id values and marks existing unreviewed income reviewed with a version increment. The compatibility column is retained.
Production: https://home-ledger.hoshikuzu.io, Railway project household-ledger.
Cloudflare provides DNS only; Railway terminates HTTPS. Both the custom domain and original Railway hostname are retained in IaC.
Infrastructure is .railway/railway.ts with railway SDK 3.16.0; legacy railway.json is removed.
Web/worker deploy committed Git snapshots via CLI until Railway's GitHub integration is granted repository access.
Postgres and worker are private; only Web has a public domain. Daily volume snapshots retain six days;
restore and live bank sync remain untested. Initial production household has one member, yihui.

## Verification and memory
`npm test`, `npm run format:check`, `npm run smoke`, Docker production migration/web/one-cycle worker.
Test DB is explicitly TEST_DATABASE_URL ending in _test; tests truncate only that configured test DB.
See VERIFICATION.md for evidence and limitations. See ADR 0002 for stack migration/compatibility decisions and ADR 0003 for PWA/session/cache boundaries.
Django source/SQLite snapshots remain in ignored .local; original db.sqlite3 retained. No real data/token migration was needed.
Production HTTPS/login/CSV/PDF and worker one-cycle execution verified; no live BOA authorization.
Plaid Production credentials are configured in Railway; Worker references Web's credentials. Custom-domain OAuth redirect is allowlisted and Production Link token creation is verified. At initial deployment no bank connection or real transaction sync had been completed; current production data was not reverified for the category-label extension.
Category-label local verification: 52 PG/HTTP integration tests, build and formatting pass; frontend finish review says ship. Local downloaded CSV/PDF retain one $100 transaction with both labels. Authenticated production API smoke was not rerun; see docs/wip/category-labels.md for rollout status and verification limits.
