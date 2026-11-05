# API

The app and API share one origin. Interactive OpenAPI documentation is available at `/api/docs`, with the schema at `/api/docs-json`. Request DTOs in `src/dto.ts` are the source of truth for validation.

## Authentication

1. `GET /api/auth/csrf` with cookies enabled; retain the returned `csrfToken`.
2. `POST /api/auth/login` with `{ "username": "…", "password": "…" }` and `X-CSRFToken`.
3. Retain the session cookie and fetch a fresh CSRF token after login rotates the session.
4. Send cookies on every request and `X-CSRFToken` on mutations.

`GET /api/auth/me` returns the current user; `POST /api/auth/logout` ends the session. `POST /api/auth/password` accepts `current_password` and `new_password`, changes the password, and revokes the user's sessions.

Household access comes from the session. Clients cannot choose a household ID to override it. Unauthenticated application requests return 403. Public endpoints include CSRF/login, health, documentation, and the signed Plaid webhook.

## Ledger routes

| Method               | Path                            | Purpose                                              |
| -------------------- | ------------------------------- | ---------------------------------------------------- |
| GET / PATCH          | `/api/household`                | Read or update name, timezone, digest hour/enabled   |
| GET / POST           | `/api/categories`               | List or create a category                            |
| GET / PATCH / DELETE | `/api/categories/:id`           | Read, rename, activate/archive, or delete a category |
| GET                  | `/api/transactions`             | Paginated filtered transactions                      |
| GET / PATCH          | `/api/transactions/:id`         | Read or edit a transaction                           |
| GET                  | `/api/transactions/:id/history` | Edit history                                         |
| GET                  | `/api/summary?month=YYYY-MM`    | Monthly totals and category spending                 |
| GET                  | `/api/digests`                  | Paginated inbox updates                              |
| GET                  | `/api/digests/:id`              | Read an update                                       |
| POST                 | `/api/digests/:id/read`         | Mark it read for the current user                    |

Transaction lists accept `month`, `search`, `pending`, `reviewed`, `uncategorized`, and `page`. Boolean query values are the strings `true` or `false`. Search covers name, merchant, and note. Lists return `count` and `results`, with 50 rows per page. `reviewed=false` excludes income.

### Transaction edits

```json
{
  "version": 3,
  "categories": [1, 4],
  "flow": "expense",
  "reviewed": true,
  "note": "Weekly groceries"
}
```

`version` is required. Omit unchanged fields. `categories: []` removes all labels. The legacy `category` field accepts one ID or `null`; do not send both `category` and `categories`. Flow is `expense`, `income`, `transfer`, or `refund`. Amount, date, merchant, and provider identifiers are not editable.

Stale versions return 409. Income is always reviewed automatically. Deleting a category returns 204, retains all transactions and other labels, and increments affected transaction versions. Removing the final label makes a transaction Uncategorized.

Amounts and totals are integer USD cents. Outflows are positive and inflows negative. Overall summaries count each transaction once; per-category amounts can overlap when labels overlap. See [data rules](ARCHITECTURE.md#data-rules).

## Exports

`GET /api/exports/transactions?format=csv` or `format=pdf` downloads the current filtered data. It accepts the transaction list filters except `page`; it exports all matching rows, not only the visible page.

Exports require authentication, return attachment filenames, and use `Cache-Control: no-store`. More than 5,000 matching rows returns 422. Narrow the month or filters and retry. Multiple category labels stay on one transaction row.

## Bank routes

| Method | Path                        | Purpose                                                 |
| ------ | --------------------------- | ------------------------------------------------------- |
| GET    | `/api/bank`                 | Connection state and last sync                          |
| POST   | `/api/bank/link-token`      | Create a Plaid Link token                               |
| POST   | `/api/bank/exchange`        | Exchange `public_token`, optionally select `account_id` |
| GET    | `/api/bank/accounts`        | List supported accounts for selection                   |
| POST   | `/api/bank/select-account`  | Select the single `account_id`                          |
| POST   | `/api/bank/sync`            | Schedule sync; returns 202                              |
| POST   | `/api/bank/reauth-complete` | Schedule sync after reconnect; returns 202              |

Plaid access tokens and secrets are never returned to the browser. `POST /webhooks/plaid` validates the Plaid signature and raw body before scheduling work; it is exempt from cookie CSRF validation.

## Errors and health

Validation rejects unknown fields. Common statuses are 400 for invalid input, 403 for authentication/CSRF failures, 404 for missing or inaccessible resources, 409 for conflicts, 422 for export limits, 429 for login throttling, and 503 for bank/database unavailability. Clients should render `detail` or the validation `message` without assuming every error has the same shape.

`GET /health/live` checks the web process. `GET /health/ready` also checks database connectivity. Neither checks bank sync or worker freshness.
