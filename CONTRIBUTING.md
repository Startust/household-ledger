# Contributing

Small, focused pull requests are welcome. For a new product feature or a change to financial calculations, open an issue describing the expected behavior first.

## Setup

Follow the [local setup](README.md#try-it-locally) and [development guide](docs/DEVELOPMENT.md). Use sample data and Plaid Sandbox for development. Never include real statements, transaction records, account identifiers, passwords, or tokens in issues, screenshots, fixtures, or commits.

## Before opening a pull request

```sh
npm run format:check
npm test
```

Include the problem, the behavior after the change, and the checks you ran. For interface changes, include desktop and mobile screenshots with sample data. Keep product text in English and concise, preserve keyboard access, and check Night and Archive themes.

Changes to sync, money, authorization, category deletion, or concurrency need meaningful integration coverage. Test against a dedicated database ending in `_test`. Add forward migrations for schema changes; do not edit migrations that may already have been applied.

Keep dependency versions pinned and avoid unrelated upgrades. New configuration or behavior should be reflected in the relevant documentation.

## Security reports

Follow [SECURITY.md](SECURITY.md) rather than opening a public issue with sensitive details.

Contributions are distributed under the project's [MIT license](LICENSE).
