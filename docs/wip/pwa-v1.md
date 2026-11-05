# PWA v1 — implementation approved

Mode: spec-driven-workflow. Workflow strictness: strict.
Brainstorm Gate: complete. User chose monthly overview + prominent review queue and code-first implementation.
Scope: mobile-first English household ledger PWA over existing NestJS API; desktop adaptation; local deployment.
Explicit kami/impeccable visual direction. Minimal functional copy; readable sans-serif tabular amounts. Same-agent build; skill-prescribed independent finish review/documenter only.

## Acceptance
- Real account login/logout and expiry recovery; secure cookie/CSRF; no public signup.
- Home monthly net spend/income/refunds/category breakdown and clear outstanding review CTA.
- Transactions: server search/filter/pagination, category/flow/note/review editing, 409 recovery without silent overwrite, audit display.
- Daily summaries with independent read receipts; household/timezone/hour settings and category management.
- Bank freshness/status, manual sync, Link onboarding/reauth client flow; no actual bank authorization by the agent.
- Password change requires old password, revokes sessions; existing credentials remain unchanged during UI QA.
- PWA manifest, local app icons, standalone display, safe-area/touch layout, offline shell, app-update prompt and iOS install guidance.
- Do not persist financial responses, passwords or sessions in localStorage/Cache Storage. No offline mutation queue.
- Same-origin Nest static hosting at /; Swagger remains /api/docs; API/health/webhook routes excluded from SPA fallback/cache.
- Docker/Railway build includes frontend. Local port 8765 remains canonical.

## Boundaries
No remote deploy, real bank OAuth, emails, push deliveries, public registration, credit cards or new banking data.
Inbox is implemented; Web Push subscriptions/delivery remain future work, visibly distinct in UI and docs.
Browser preview can verify web behavior, not actual iPhone installation/OS notifications; record limitation.

## Files
web/**, package*.json workspace/build, Dockerfile, src/bootstrap.ts/static.ts/auth.ts/dto.ts/ledger.ts,
test/backend.test.ts, scripts/smoke.mjs, PRODUCT/DESIGN/.impeccable, docs/API/SYSTEM_MAP/VERIFICATION/ADR.

## Reviews
Product: APPROVE. Labels explain sign, settlement, sample account and inbox-only summaries.
Architecture: APPROVE. Reuse PG sessions/CSRF; network-only APIs; no cross-account disk cache; preserve version guards.
Validation: APPROVE. Backend regression + password/static-route tests; production build; desktop/mobile browser flows,
SW manifest/cache checks; container build/HTTP. No unrelated test expansion.
UI: APPROVE. Warm restrained theme, 44px targets, native dialog focus, form labels, contrast/error/loading/empty/offline states.

## Execution
Implemented: English PWA, minimal functional copy, readable sans-serif tabular amounts; real API login/logout/password,
monthly overview/review/filter/edit/audit, summaries/settings/categories/bank Link client, static hosting and PWA.
39 integration tests passed; production frontend and Docker builds passed; browser flows and offline cold-start verified.
Independent finish review and design documentation are recorded under .impeccable/review and DESIGN.md.
Review disposition: ship after both requested fixes were scored resolved (placeholder contrast and empty-review copy).
Production container HTTP/PWA checks and one worker cycle passed; temporary verification resources were removed.
Durable architecture promoted to SYSTEM_MAP and ADR 0003. No deployment or real bank authorization performed.
