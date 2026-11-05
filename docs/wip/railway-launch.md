# First Railway deployment

Status: complete, 2026-11-05.
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
Railway plugin authentication is expired; existing authenticated CLI was used as the fallback.
Platform change discovered: new services reject Config as Code. Replaced legacy railway.json files
with .railway/railway.ts and pinned railway SDK 3.16.0. CLI 5.71.0 is used as an ignored local executable;
the app/runtime dependency set remains unchanged. Variables stay outside IaC. A read-only baseline plan
confirmed existing database/volume are preserved; service updates are reviewed before applying.
Railway GitHub source connection returned “User does not have access to the repo”. The user has
GitHub org admin access and the private repository is already pushed; deploy the exact committed
snapshot via authenticated Railway CLI. No GitHub App permission expansion is performed.

Completed: private repo pushed; all three production services SUCCESS; exact pushed Git application
snapshot dd50ede deployed; first user yihui initialized in an empty household. Browser login/PDF and
HTTP security/PWA/CSV/PDF checks passed. Worker cycle verified, private networking retained, daily
backups enabled. Temporary SSH access revoked. Final IaC plan clean, production audit zero.
Durable details promoted to README, PRODUCT, SYSTEM_MAP, RAILWAY and VERIFICATION.
Remaining external setup: Plaid credentials/real bank authorization and optional GitHub integration.
