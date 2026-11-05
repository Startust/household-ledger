# Home Ledger

<!-- impeccable:product-schema 1 -->

## Platform
web

## Users
Two household members, each with a pre-provisioned account, sharing one USD debit/checking ledger.
Daily phone use on iPhone and occasional desktop browser use.

## Product Purpose
Understand this month's spending and quickly classify and confirm imported transactions together.
User confirmed the landing screen should prioritize monthly income/spending with outstanding review prominent.

## Stack
Existing NestJS + Prisma + PostgreSQL. Frontend stack delegated in the conversation: React/TypeScript/Vite PWA.
Local development and same-origin Railway hosting. Private GitHub repository: Startust/household-ledger.

## Operating Context
Independent member login; shared categories/notes/review; separate inbox read receipts.
Bank sync and scheduled daily summaries run on the server. Imported bank facts cannot be edited by clients.

## Capabilities and Constraints
One USD Checking account; no credit cards/public registration. Integer cents and optimistic edit versions.
Local sample starts with six clearly labeled demo transactions; the initial production deployment used an independent empty ledger. Current production data was not reverified for the category-label extension.
Transactions can have multiple category labels without splitting amounts. Overall totals count each transaction once; each assigned category receives its full expense/refund amount, so category subtotals can overlap.
Deleting a category requires confirmation and removes only that label; transactions and other labels remain. Swipe left or use Actions to reveal Delete.
Income is automatically reviewed and has no manual review control or review badge; bank Pending status remains visible. Review queues and counts exclude income.
CSV/PDF exports keep one row per transaction and include all category labels together.
Plaid Production credentials and the custom-domain OAuth callback are configured. Production Link token creation is verified; real Plaid/BOA authorization remains unverified and must be completed by the account holder.
Notifications currently mean the in-app digest inbox. External Web Push remains a separately configured channel.
Offline shell is allowed, sensitive account responses are not persisted in service-worker caches.

## Brand Commitments

Main/production commitment: the user requested warm, simple, easy to use, with kami and impeccable.
Main retains kami's parchment/ink-blue/editorial vocabulary; impeccable governs interaction and responsiveness.
English UI and USD amounts. Product name: Home Ledger. No supplied logo or licensed web fonts.
No slogans, decorative prose, redundant descriptions or cute empty-state copy. Keep copy task-oriented.
Use clear sans-serif tabular numerals for all amounts; main uses a restrained serif for headings.
Latest request: preview the existing hoshikuzu-ui visual world locally on isolated branch `yihui/hoshikuzu-preview`. This branch uses the library's night/archive semantic palette, light sans headings, hairlines, and small corners while preserving product behavior. Its DESIGN.md describes that preview only; no production adoption or deployment is implied.

## Product Principles
Make pending review easy to find. Distinguish pending/removed/transfer/refund accurately.
Show freshness and bank connection state. Prefer successful explicit saves to optimistic silent conflicts.
Keep personal sessions separate while sharing the household's data.
