# First Railway deployment

Status: authorized by user, 2026-11-05.
Brainstorm Gate: complete. User requested a GitHub repository under Startust before Railway deployment;
first production username confirmed as yihui. Private repository and empty production ledger are the defaults.

## Acceptance and boundaries
- Publish this app only to Startust/household-ledger, private. Do not include local secrets, demo database,
  generated dependencies, screenshots or unrelated Playground files.
- Create a dedicated Railway project, PostgreSQL with persistent storage, Web/PWA and one worker.
- Use existing production Dockerfiles/config, fresh session/encryption keys, internal database references,
  HTTPS Web domain; no worker domain. Existing unrelated Railway services remain unchanged.
- Initialize one household/member with a generated password delivered through an ignored local file.
- Verify deployed revision, migrations/readiness, authentication/cookie protections, PWA files, CSV/PDF,
  and worker operation. No live bank authorization, Plaid credentials, demo seed or data migration.
- Preserve existing dependency versions; production container has already passed local verification.

## Review
Product: APPROVE, user-specified repository owner/deployment and first username.
Architecture: APPROVE, same-origin container plus PG/worker matches ADRs and SYSTEM_MAP.
Verification: APPROVE, exact service selectors and artifact inspection before upload; online checks after deployment.

## Execution
In progress. Railway plugin authentication is expired; existing authenticated CLI is the fallback.
Platform change discovered: new services reject Config as Code. Replaced legacy railway.json files
with .railway/railway.ts and pinned railway SDK 3.16.0. CLI 5.71.0 is used as an ignored local executable;
the app/runtime dependency set remains unchanged. Variables stay outside IaC. A read-only baseline plan
confirmed existing database/volume are preserved; service updates are reviewed before applying.
