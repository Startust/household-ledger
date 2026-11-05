# Category labels and income review

Status: implemented and locally verified; frontend finish review **ship**. Production rollout is pending.

## Scope and behavior

- Swipe left on a category or use Actions to reveal Delete, then confirm. Delete removes only the category and its transaction associations; transactions and other labels remain. Removing the last label leaves the transaction Uncategorized.
- Choose multiple category labels on one transaction without splitting its amount. Overall counts and totals include the transaction once. Each assigned category receives the full signed expense/refund amount, so category totals can overlap; income and transfers do not enter category spending.
- Income is automatically reviewed, excluded from outstanding-review queues/counts, and has no manual review control or badge. Bank Pending status still appears. Changing Income to another type restores the review workflow.
- CSV/PDF exports keep a single transaction row with all labels together. The interface remains English with short task-oriented copy and the existing design system.

## Implementation facts

`TransactionCategory` is the association table. Migration `202611050003_category_labels` backfills existing `category_id` values and marks existing unreviewed income reviewed with an optimistic-version increment. The original `category_id` and single-category API fields remain for compatibility; new edits update both the association set and its primary category. Reads handle legacy single-category writes during rollout.

Category changes/deletion, transaction edits and bank sync serialize on the household lock. Deletion increments affected transaction versions and records the removed label in edit history, so a stale editor conflicts instead of restoring a deleted association. Pending-to-posted replacement preserves all effective labels, notes and compatible manual flow. Income remains automatically reviewed across import, edit and replacement paths.

## Verification

- Supplied final implementation run: **52/52 real PostgreSQL/HTTP integration tests pass**, with build, formatting and diff checks passing. Coverage includes label edits/deletion, review behavior, sync preservation, compatibility and concurrency.
- Local browser checks and captures cover touch reveal, keyboard Actions, confirmation/cancel/focus, multiple label save/reopen, desktop/phone/506px layout and income review suppression. Independent reviewer disposition: `.impeccable/review/category-finish-review.md` says **ship**.
- Local CSV/PDF downloads were parsed and verified to contain one $100 transaction with both Groceries and Weekend trips once. `.impeccable/review/category-export.png` shows the rendered PDF with both labels on the same row and no clipping.
- Local API deletion QA removed the disposable Weekend trips category while retaining its $100 transaction and Groceries label. QA did not mutate production ledger data.
- Documentation comparison is in `.impeccable/review/category-documentation.md`. Both design files remain unchanged. The detector's 143 advisory metadata findings (115 type size, 23 color, 5 radius; no non-advisories) are recorded without repair.

## Rollout and limits

Released Git commit `e940933` from a clean Git archive after pushing to `Startust/household-ledger` main. Railway IaC gives the worker the same migration pre-deploy command as web. The pinned infrastructure plan changed only that worker command (zero additions/deletions, one update).

Worker deployment `3f926f01-d6dc-4b37-a488-6263fec47156` reached SUCCESS first; its logs confirm migration `202611050003_category_labels` applied successfully and the container started. Web deployment `ec0500ae-66e2-4b9d-8ec4-c3f5b2afb205` then reached SUCCESS. Both use the same release archive. Worker error-log query returned no entries, and the final IaC plan has no changes.

Public checks at https://home-ledger.hoshikuzu.io passed: HTTPS and readiness, exact frontend JS/CSS hashes, category DELETE and categories-array OpenAPI definitions, protected unauthenticated category API, manifest and service worker. Temporary local QA category/transaction were removed; the original six demo transactions were retained.

The initial production ledger was empty; current production contents were not verified. Authenticated production API smoke was not rerun: the initial-password helper returned HTTP 403, and Railway SSH was unavailable because no key was registered. No credential reset, retry loop or SSH-key addition was performed. The verified deployment/migration logs and public health/build identity do not establish authenticated API behavior or production data correctness.
