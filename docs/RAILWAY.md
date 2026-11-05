# Deploy on Railway

Use three services in one Railway project: **Postgres**, **web**, and **worker**. Web and worker build from the same repository and Dockerfile. Only web gets a public domain.

## 1. Create services

Fork this repository, create a Railway project, and add PostgreSQL. Create web and worker services from your fork. Select the repository root and Dockerfile builder for both.

| Setting            | Web                     | Worker                    |
| ------------------ | ----------------------- | ------------------------- |
| Dockerfile         | `Dockerfile`            | `Dockerfile`              |
| Pre-deploy command | `npm run db:migrate`    | `npm run db:migrate`      |
| Start command      | `node dist/src/main.js` | `node dist/src/worker.js` |
| Healthcheck        | `/health/ready`         | None                      |
| Replicas           | 1                       | 1                         |
| Public domain      | Yes                     | No                        |

Disable sleeping for the worker so scheduled sync and digests run. Use an on-failure restart policy. Keep the PostgreSQL service private.

## 2. Configure variables

Set these on web and worker:

```dotenv
NODE_ENV=production
HOST=0.0.0.0
PORT=8000
APP_ORIGIN=https://your-ledger.example.com
DATABASE_URL=${{Postgres.DATABASE_URL}}
SESSION_SECRET=<generated random signing secret>
BANK_TOKEN_KEY=<generated base64url 32-byte key>
PLAID_ENV=production
PLAID_CLIENT_ID=<your client ID>
PLAID_SECRET=<your production secret>
PLAID_WEBHOOK_URL=https://your-ledger.example.com/webhooks/plaid
PLAID_REDIRECT_URI=https://your-ledger.example.com/oauth
```

Use Railway variable references or shared variables so both application services receive the same values. The `Postgres` reference must match your database service's name. Do not copy the placeholders literally. See [configuration](CONFIGURATION.md) for key generation and Plaid setup. You may initially use Sandbox or omit Plaid credentials while provisioning the app.

Do not set `TEST_DATABASE_URL` or seed demo accounts in production. Keep encryption keys stable across redeploys.

## 3. Domain and deployment

Generate a Railway HTTPS domain or add your own custom domain to web, targeting port `8000`. For a custom domain, add the exact DNS records Railway provides at your DNS provider and wait for certificate issuance. Set `APP_ORIGIN` and Plaid callback URLs to that canonical origin.

Deploy worker first, verify migration completion and startup, then deploy web from the same commit. Check `/health/ready`. If using the Railway CLI instead of GitHub integration, run `railway up` against a clean checkout and explicitly select the intended project, environment, and service. Railway runs [pre-deploy commands](https://docs.railway.com/deployments/pre-deploy-command) inside the private network and stops deployment if they fail.

The repository does not contain an operator-specific Railway infrastructure snapshot. Existing deployments should retain their own service IDs, domains, volume configuration, and secret variables.

## 4. Provision the first login

Open a shell **inside the deployed web container**, through Railway's service shell or `railway ssh --service web`, and run:

```sh
npm run cli -- create-household your-username
```

Enter the password at the hidden prompt and retain the printed household ID. Add the second member with `npm run cli -- add-member HOUSEHOLD_ID another-username` when needed.

`railway run` executes locally with injected variables; it does not run inside the service network. A private PostgreSQL hostname is generally unreachable from your laptop. Prefer the deployed-container shell for administration. See the [Railway CLI reference](https://docs.railway.com/cli).

Sign in on your HTTPS domain, confirm Settings, and connect a bank through Plaid. On iPhone, open the site in Safari and choose **Share → Add to Home Screen**.

## Operations

- Monitor web health, worker restarts, connection state, and the last successful sync. A successful healthcheck alone does not verify banking operations.
- Enable database/volume backups with a retention period appropriate for your needs. Keep a separate secure backup of `BANK_TOKEN_KEY`. Verify restoration into an isolated environment before relying on backups.
- Before upgrades, take a database backup, review migrations, and deploy the same revision to both application services. Migrations are forward-only; rolling back an image does not reverse schema changes.
- Rotate session signing secrets to invalidate sessions when necessary. Encryption-key rotation requires re-encrypting existing bank tokens; simply replacing the value is not supported.
- Avoid logging runtime secrets or financial records. Downloaded exports and backups require the same care as the database.

GitHub CI builds and tests changes; it does not contain deployment credentials or automatically modify Railway. Configure repository deployments in your own Railway project if desired.

## Troubleshooting

| Symptom                      | Check                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| Login returns a CSRF error   | Exact `APP_ORIGIN`, HTTPS, cookies, and proxy headers                                |
| Healthcheck fails            | `DATABASE_URL`, completed migrations, target port, and startup logs                  |
| Ledger is empty              | Account selection, worker status, Plaid environment, connection state, and last sync |
| Plaid OAuth does not return  | Exact redirect URI allowlist and the deployed `/oauth` route                         |
| Bank tokens cannot decrypt   | Web/worker use the original matching `BANK_TOKEN_KEY`                                |
| Installed PWA looks outdated | Open while online and accept the in-app update prompt                                |
