# Development

Complete the [local setup](../README.md#try-it-locally) first. The built app is served by NestJS at `http://127.0.0.1:8765`.

## Frontend development

Set `APP_ORIGIN=http://127.0.0.1:5173` in the root `.env`, then run these in separate terminals:

```sh
npm run start:dev
npm run dev:client
```

Open `http://127.0.0.1:5173`. Vite proxies `/api` and `/health` to port `8765`. Keep the browser hostname consistent: `localhost` and `127.0.0.1` are different origins. Restart the server after changing `.env`.

For different ports, put `DEV_PORT` and `DEV_API_TARGET` in `web/.env.local`, for example:

```dotenv
DEV_PORT=5180
DEV_API_TARGET=http://127.0.0.1:8766
```

Set server `PORT=8766` and `APP_ORIGIN=http://127.0.0.1:5180` to match. These dev-server settings are not production configuration.

For backend changes, also run `npm run build:watch`. Generate the Prisma client with `npm run db:generate` after schema changes. Apply committed migrations with `npm run db:migrate`; create new migrations during development with `npx prisma migrate dev --name descriptive_name`.

## Tests

```sh
docker compose up -d --wait postgres
npm test
npm run format:check
```

`init-local.mjs` configures a separate `ledger_nest_test` database. The test runner refuses production mode, requires the database name to end in `_test`, creates that database when absent, applies migrations, and truncates its data. The local database role therefore needs permission to create the test database; CI precreates it.

The suite uses real PostgreSQL and HTTP requests. It covers sessions, CSRF, household isolation, concurrent edits, money totals, category labels and deletion, exports, sync rollback/pending replacement, retries, and digest locking. Plaid responses are fixtures; tests do not contact a real bank.

Run `npm audit` when changing dependencies. At the initial open-source release, `npm audit --omit=dev` reports no production dependency vulnerabilities. The PWA build toolchain has six low/moderate advisories through Workbox, glob, minimatch, and deepmerge. The suggested forced fix downgrades `vite-plugin-pwa`; it has not been applied. These tools process trusted project files at build time, not financial API requests. Reassess compatible upstream fixes before upgrading.

`npm run smoke` exercises two local demo logins and a shared edit, restoring the original note. It requires a running, unchanged demo ledger with six sample transactions and refuses non-local URLs. Set `SMOKE_URL` if the server uses another local port.

## UI checks

Check both themes at mobile and desktop widths. Exercise login, filtered transactions, dirty-edit confirmation, category deletion, CSV/PDF download, and session expiry. Use only sample data in screenshots. For PWA install/update behavior, use a production build on localhost or HTTPS; the development server does not register the production service worker.

## Containers

```sh
docker build -t home-ledger:local .
```

The image contains the web server, worker, migrations, CLI, built PWA, and PDF font. It runs as a non-root user. Supply runtime configuration and a database address reachable from the container. `127.0.0.1` inside the container is not the host database; use a Docker network or your platform's host gateway.

Run migrations once before starting the web and worker processes. See the [Railway guide](RAILWAY.md) for the deployment topology and commands.

## Repository layout

| Path            | Contents                                        |
| --------------- | ----------------------------------------------- |
| `src/`          | NestJS server, worker, CLI, and business logic  |
| `web/src/`      | React application and Hoshikuzu UI source       |
| `prisma/`       | Schema and forward migrations                   |
| `test/`         | PostgreSQL/HTTP integration suite               |
| `assets/fonts/` | Licensed font for PDF exports                   |
| `scripts/`      | Local setup, smoke check, and icon generation   |
| `docs/`         | Public development and deployment documentation |

Generated clients, builds, local credentials, and operator notes are ignored by Git. The `private` package flag prevents accidental npm publication; the source repository is open source.
