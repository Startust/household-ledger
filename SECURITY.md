# Security

## Reporting a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/Startust/household-ledger/security/advisories/new). Include the affected revision, reproduction steps with synthetic data, and the expected impact. Do not publish credentials, bank tokens, or real financial records in issues.

Only the current `main` branch is maintained. This project has not undergone an independent security audit.

## Deployment boundaries

- Serve the app over HTTPS and configure `APP_ORIGIN` to the exact public origin. Production trusts one reverse-proxy hop; keep the Node server private behind that proxy.
- Provision accounts through the server CLI. There is no public registration or email password recovery.
- Keep PostgreSQL private and store credentials in your deployment's secret manager. Never use local demo accounts in production.
- `SESSION_SECRET` signs session cookies. Rotating it invalidates existing sessions.
- `BANK_TOKEN_KEY` encrypts bank access tokens. Back it up securely alongside database recovery material. Replacing it without re-encrypting stored tokens makes those tokens unreadable.
- Restrict operator access to the database, runtime environment, backups, and exported files. CSV and PDF exports contain financial data.

## Implemented controls

Passwords use Argon2id. Sessions are stored in PostgreSQL with HttpOnly, SameSite cookies and Secure cookies in production. Mutations require CSRF validation. Authorization resolves the current household on each request. Login limits are database-backed; password changes revoke the user's sessions.

Plaid access tokens are encrypted with AES-256-GCM. Webhooks verify the signature and raw request body before scheduling sync. API responses and exports use `no-store`; the service worker caches only public application assets.

These controls do not replace deployment review, dependency maintenance, monitoring, or tested backup restoration. Read [operations](docs/RAILWAY.md#operations) before relying on a deployment.
