# ADR 0001: Server-first private debit ledger

Accepted 2026-11-05.

Framework/runtime choice superseded by [ADR 0002](0002-nestjs.md) on 2026-11-05 at the user's request.
The following text is historical; product scope and data invariants still apply.

Use a Django/DRF monolith with PostgreSQL and a database-backed single worker. The user explicitly
removed credit cards from the first phase, delegated stack choice, and chose Railway as the eventual host.
Django's maintained authentication, migration and admin facilities keep the implementation small.
Python 3.14's latest patch is chosen over the newly released 3.15 for runtime maturity, with current
stable Django/DRF patches and a complete uv lock. Revisit runtime/framework versions on authorized upgrades.

Expose one API for future browser, desktop and phone clients. Start with sessions + CSRF and provisioned
users. Do not add desktop packaging or mobile push until a client is selected. Notifications are durable
inbox records at this stage; no outbound messages are sent.

Persist only one selected USD checking account per household. Two members share its data. Bank token
exchange persists encrypted credentials before account validation so selecting the wrong account does
not consume another Trial Item. Account selection is immutable after the first valid selection.

Money is integer cents. Deposit and transfer classification remain necessary even without credit cards.
Bank categories are suggestions; manual category and review flags survive imports. No AI categorizer.
Statistics include settled expenses less refunds, excluding transfers and pending/removed entries.

The worker uses incrementing request/completion counters rather than transient in-process tasks. PostgreSQL
row locks and unique constraints protect concurrency; all transaction pages share one cursor commit.
This is appropriate for a private small household and can be replaced by a dedicated queue if scale demands it.

Consequences: operation requires web + worker + PostgreSQL; no Redis. A missing worker prevents fresh
sync/digests. First historical import is deliberately excluded from new-activity reminders. Client must
show freshness and handle stale-edit 409s. Public multi-tenant distribution needs a separate design review.
