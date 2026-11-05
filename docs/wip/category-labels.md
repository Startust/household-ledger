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

## Pending rollout and limits

Railway IaC now gives the worker the same migration pre-deploy command as web. The pinned infrastructure plan was applied with only that worker pre-deploy update (zero additions/deletions, one update); application code deployment is still pending. Deploy **worker first**, verify the migration and worker startup, then deploy **web**. This makes background processing label-aware before the new picker is exposed. No deployment was performed by this documentation pass.

The initial production ledger was empty; current production contents were not verified. Authenticated production API smoke was not rerun: the initial-password helper returned HTTP 403, and Railway SSH was unavailable because no key was registered. No credential reset, retry loop or SSH-key addition was performed. Deployment/migration logs and public health/build identity can verify rollout separately; they do not establish authenticated API behavior or production data correctness.
