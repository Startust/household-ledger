# Verification — 2026-11-05

Environment: Windows Node.js 24.22.1; Linux production container; PostgreSQL 18.6.
NestJS 12.3.3 / TypeScript 6.0.3 / Prisma 7.10.1, exact versions and package-lock.
This record supersedes the archived Django verification.

| Check | Result |
|---|---|
| PostgreSQL integration suite | 45 passed, 0 failed, 0 skipped; dedicated ledger_nest_test database |
| TypeScript build / Prisma generation | Passed on Windows and Linux |
| Prettier formatting | Passed |
| Database migrations | Both checked-in migrations applied; no pending migrations |
| Docker build | Passed; Node 24.22.1 base pinned by digest, non-root runtime |
| npm install / production dependency audit | npm ci succeeded on Windows/Linux; container audit reported 0 vulnerabilities |
| Container migration / worker cycle | Passed against PostgreSQL using production configuration |
| HTTP demo smoke | Passed: two logins, edit visible to spouse, stale edit 409, anonymous 403 |
| Financial smoke result | $119.99 net spend = $126.58 + $12.40 - $18.99; pending $39.99 and transfer excluded |
| Container HTTP checks | Ready 200, HTTP->HTTPS 308, private API 403, Secure/HttpOnly/SameSite=Lax session cookie |
| Container login / Swagger | Argon2 login/logout and ledger read passed; Swagger CSS/JS and required DTO fields verified |
| Missing production secrets | Startup rejected as intended |
| Container contents | No .env, SQLite, .local, legacy Python source or test code; runtime UID is non-root |
| Local operations scripts | PowerShell syntax parsed; migrations, demo seed and worker once executed |

Tests include real PostgreSQL concurrent writer conflicts and digest/sync watermark serialization,
provider pagination restart/rollback, duplicate imports/webhooks, pending replacement,
manual-field preservation, removed entries, strict USD cents, cross-household access, CSRF, login limits,
max-two-member provisioning, encrypted token authentication/household binding, account type validation,
signed webhook body/age/algorithm, digest DST,
initial history suppression, missed-day catch-up and independent read receipts.

All bank API tests use deterministic fixtures. **This is not evidence that this user's real BOA
account has been connected or that the current Plaid Trial has been approved.** No bank credential
was requested, stored or transmitted in this task. No external email or mobile push was sent.

Legacy source and a consistent SQLite backup were archived under .local before runtime replacement.
The original SQLite file is retained; the PostgreSQL demo is separate. No general real-data migration
was needed or implemented. The prior Python server was stopped, and NestJS serves local port 8765.
Local HTTP smoke restored the original demo note after exercising edits; audit/version increments remain.
Temporary production-check container was removed; local Postgres and NestJS Web remain running.
The worker is not installed as a background service. A previous persistent background-worker launch
was rejected by automatic approval with only 'blocked by policy'; manually run npm run worker.
No attempt was made to bypass that rejection. One-cycle worker execution is verified.

Railway files and production container flow were validated locally; the Railway connector needs
reauthentication and no remote deployment was attempted. Bank OAuth UI is implemented but real authorization is unverified. External notification delivery remains follow-up.

## PWA verification — 2026-11-05

- Locked React 19.3.1, Vite 8.3.6, plugin-react 6.2.1, vite-plugin-pwa 2.0.0 and lucide-react 1.69.0 after registry verification; TypeScript remains compatible 6.0.3.
- Windows production build passed; Docker build includes web/dist and workspace manifest.
- Four added real-PG/HTTP tests: SPA/manifest/static and API cache boundaries; wrong-password/CSRF/validation; all-device password revocation with spouse session preserved; editing notes/review on archived categories.
- Browser checked in IAB: 1280×900 desktop, 390×844 mobile and actual 506×867 window. No horizontal document overflow observed.
- Login, logout, second-member login, review CTA/filter, pending review disabled, note save/reopen/restore, monthly navigation and installation guide passed.
- November net spending is $119.99; October/December are $0.00. Review count covers all posted transactions, regardless of selected month.
- PWA update prompt accepted and new assets activated. Simulated offline cold reload served the public shell and reconnect/login state; restoring network and reloading recovered the existing session. Network emulation and viewport overrides were restored.
- Workbox has only static precache entries, no runtime API caching; backend private API responses use no-store. Browser raw CacheStorage inspection was unavailable through CUA; no claim of direct cache enumeration.
- All visible product copy is English; browser-native month picker UI follows the OS/browser language, while displayed month uses English.
- Impeccable detector ran once: no findings. Original app icons carry source provenance; raster scan: 3 files, 0 missing.
- Production dependency audit: 0 vulnerabilities. Full development audit: 6 build-tool transitive findings (2 low, 4 moderate) in the PWA/Workbox chain. No force downgrade or unrelated dependency changes applied; these dependencies are pruned from runtime.
- Evidence: .impeccable/review/{desktop,mobile,user-506,editor-mobile,settings-mobile,login-mobile,updates-mobile,offline-mobile}.png.
- Actual iPhone installation, standalone Safari keyboard/safe-area behavior, real Plaid OAuth and Railway hosting remain unverified. No push subscription or delivery exists.

Final container checks passed against the local demo database: HTTPS redirect, Secure session cookies,
Argon2 login/logout, private API denial, Swagger, PWA shell/manifest/icons/OAuth route/service worker,
immutable hashed assets and API fallback exclusion. A one-cycle container worker completed (synced=0).
The temporary verification container and its generated env file were removed.

Independent impeccable review: initial disposition fix for placeholder contrast and redundant review-empty copy.
Both were changed in one batch and verified on actual desktop/mobile/506px empty-review captures.
Verdict disposition ship applies to those two fixes; both resolved. Verdict record: .impeccable/review/finish-review.md.
Browser review-checkbox edits were also restored; the six demo records, original notes and two unreviewed
transactions remain. Audit/version increments from QA are intentional.

## Export verification — 2026-11-05

- Six new PG/HTTP tests cover authentication/invalid queries, household isolation and removed rows, matching filters, all 55 rows across the 50-row list boundary, CSV formula/quote/newline escaping, exact cents, posted-only totals, Unicode/multipage PDF structure, empty results and both formats rejecting 5,001 rows. Full suite: 45 passed.
- Actual IAB desktop Overview CSV/PDF and 390px mobile Pending-filter CSV/PDF downloaded successfully. Month output has all six demo rows; pending output has only AMAZON. No ledger records were changed.
- CSV parsed with Python csv (UTF-8 BOM): outgoing $678.97/incoming $3,268.99 including transfers and pending. PDF month net $119.99 excludes those items as intended.
- PDFKit output independently parsed by pypdf: stress fixture has all 70 transactions and all 95 repeated note phrases, Chinese merchant/category/note text, nine sequential numbered pages. Empty output is one page. Large exact amount $90,071,992,547,409.91 fits without clipping.
- Poppler rendered month, stress and large-amount PDFs; every rendered page visually inspected, including repeated table headers and last-page footer. No missing glyphs, clipping or blank extra pages observed. Poppler's local display-font warnings did not affect the embedded font output.
- Linux production image `household-ledger:exports-local` built and ran authenticated month/pending/empty CSV and PDF downloads with embedded assets. Temporary container/env removed; local web/Postgres remain running. No remote deployment.
- `npm audit --omit=dev`: 0 vulnerabilities. Existing six development-only Workbox-chain findings remain; no unrelated upgrades.
- Evidence: `.impeccable/review/export-desktop.png`, `export-mobile.png`, `export-transactions-mobile.png`; QA fixtures under ignored `.local/exports`.
- Impeccable detector ran once. Advisory typography/palette drift in existing DESIGN metadata was reported; extension reuses existing sizes and colors. No unrequested design-system repair.
- iPhone Safari/standalone file handling has not been tested on a physical device; desktop browser mobile sizing is the verified scope.
- Independent export finish review: ship with no material fixes at the reviewed sizes. Documentation comparison found no new material drift; PRODUCT.md, DESIGN.md and `.impeccable/design.json` hashes unchanged. Records: `.impeccable/review/exports-finish-review.md` and `exports-documentation.md`.

## First production deployment — 2026-11-05

- Created private GitHub repository `Startust/household-ledger`, default branch main. Staged-source scan excluded local and production credentials, database snapshots, dependencies and screenshots. No unrelated Playground files published.
- Created dedicated Railway project `cb170b23-9d1b-4ecd-8629-16635c4b1909`, production environment `65edffcd-17f8-4890-9e90-81d808bb1db3`. Postgres, Web and worker all report SUCCESS.
- Application snapshot `dd50ede7f387d2f7fd8470e83fb9de788864b19e` was archived directly from the pushed Git commit and uploaded to both app services. Web deployment `c375baa7-48c9-48be-a67f-b12f0f28d133`; worker deployment `1b68a5a9-9800-47d4-9a98-3b80ac26aa0c`.
- Railway rejected legacy Config as Code for new services. Migrated to `.railway/railway.ts`, pinned stable SDK 3.16.0, used local CLI 5.71.0. Production dependency audit still reports zero vulnerabilities; CLI installer dependencies are not committed or part of the runtime. Final IaC plan: `No changes.` Existing platform defaults omitted from source after verifying ON_FAILURE/10 retries/no sleep in actual deployment manifests.
- Railway GitHub integration cannot access the private repository; CLI deployment succeeded instead. GitHub auto-deploy is not enabled. Repository access must be granted in Railway before enabling it.
- Verified public HTTPS `/health/ready`, PWA shell/manifest/icons/service worker/OAuth route, immutable hashed assets, anonymous transaction/export denial, Secure/HttpOnly/SameSite session cookies, initial account login/logout, empty ledger, seven categories, exact zero summary, CSV and single-page PDF attachments with no-store.
- Browser signed in as the requested `yihui`, showed the independent empty household, and downloaded production PDF. Screenshot: `.impeccable/review/railway-production.png`. Initial password stored only in ignored `.local/production-login.txt`; no local demo credentials or records were deployed.
- Worker is running one replica. Remote one-cycle verification returned `Worker cycle completed; synced=0`; no bank credentials are configured. Postgres has a persistent volume and no public TCP proxy; worker has no public domain.
- Daily volume backup schedule enabled and read back: 10:45 UTC, six-day retention. Restore has not been tested. Backup schedule is managed in Railway outside IaC.
- Temporary SSH key used for account initialization and worker check was revoked from Railway and removed from both local temporary paths. Local development services remain unchanged.
- Outstanding external configuration: Plaid credentials/real bank authorization and optional GitHub repository integration. No live bank sync, iPhone device installation, push delivery or restore exercise claimed.
