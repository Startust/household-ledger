# Configuration

The server reads environment variables and, locally, a root `.env` file. `node scripts/init-local.mjs` generates local keys and database credentials without overwriting existing values. `.env.example` lists the supported settings; never commit a populated `.env`.

| Variable             | Purpose                                                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`           | `development` locally; `production` enables HTTPS redirects and Secure session cookies.                                          |
| `HOST`               | Bind address. Defaults to `127.0.0.1` locally and `0.0.0.0` in production.                                                       |
| `PORT`               | HTTP port; defaults to `8765`. The container defaults to `8000`.                                                                 |
| `APP_ORIGIN`         | Exact browser origin, without a trailing slash. Required HTTPS origin in production; default is `http://127.0.0.1:PORT` locally. |
| `DATABASE_URL`       | PostgreSQL URL for the application.                                                                                              |
| `TEST_DATABASE_URL`  | Separate PostgreSQL database ending in `_test`; integration tests erase its contents.                                            |
| `POSTGRES_PASSWORD`  | Local Compose database password; not an application setting.                                                                     |
| `SESSION_SECRET`     | Random session-signing value of at least 48 characters.                                                                          |
| `BANK_TOKEN_KEY`     | Base64url-encoded 32-byte encryption key. Preserve it across deployments.                                                        |
| `PLAID_ENV`          | `sandbox` (default) or `production`.                                                                                             |
| `PLAID_CLIENT_ID`    | Your Plaid client ID. Required for bank connection.                                                                              |
| `PLAID_SECRET`       | Secret for the selected Plaid environment.                                                                                       |
| `PLAID_WEBHOOK_URL`  | Public HTTPS URL ending in `/webhooks/plaid`.                                                                                    |
| `PLAID_REDIRECT_URI` | Public HTTPS URL ending in `/oauth`, allowlisted in the Plaid dashboard.                                                         |

Generate production keys on a trusted machine and store the output directly in your secret manager:

```sh
node --input-type=module -e "import { randomBytes } from 'node:crypto'; console.log(randomBytes(48).toString('base64url'))"
node --input-type=module -e "import { randomBytes } from 'node:crypto'; console.log(randomBytes(32).toString('base64url'))"
```

The first value is `SESSION_SECRET`; the second is `BANK_TOKEN_KEY`. Web and worker must use the same database, encryption key, and Plaid environment/credentials. Never prefix server credentials with `VITE_`: such variables can be exposed in browser bundles.

## Accounts

Run the CLI in the application environment with access to its database and secrets:

```sh
npm run cli -- create-household your-username
npm run cli -- add-member HOUSEHOLD_ID another-username
npm run cli -- change-password your-username
```

The create command prints the new household ID. Passwords are entered interactively and must be 12–256 characters; all-numeric passwords and passwords containing the username are rejected. There is a maximum of two members per household. Users can change their own password in Settings; operators can reset it with the CLI. Password changes revoke that user's existing sessions.

## Plaid

Use Sandbox for development. Set the client ID and matching secret, then open **Settings → Connect bank**. Choose one supported USD checking account. Real bank connections require production access from Plaid and authorization by the account holder.

For production, configure the redirect URI and webhook URL before linking a bank. Both must use your deployment's HTTPS domain. The `/oauth` route returns users to the PWA. Keep the worker running for scheduled sync, webhook-triggered work, retries, and daily inbox updates.

Bank state and last-sync information are visible in Settings. A healthy HTTP server does not establish that bank sync has succeeded.

## Household settings

The household name, IANA timezone, digest hour, and digest enabled state are editable in Settings. Daily inbox updates use the household's local date and hour; read status belongs to each member. Updates are in-app only.
