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
Local implementation first, eventually same-origin hosting on Railway. No remote deployment this task.

## Operating Context
Independent member login; shared categories/notes/review; separate inbox read receipts.
Bank sync and scheduled daily summaries run on the server. Imported bank facts cannot be edited by clients.

## Capabilities and Constraints
One USD Checking account; no credit cards/public registration. Integer cents and optimistic edit versions.
Current sample contains six clearly labeled demo transactions. Real Plaid/BOA authorization remains unverified.
Notifications currently mean the in-app digest inbox. External Web Push remains a separately configured channel.
Offline shell is allowed, sensitive account responses are not persisted in service-worker caches.

## Brand Commitments
User explicitly requested warm, simple, easy to use, with kami and impeccable.
Use kami's parchment/ink-blue/editorial vocabulary for this dynamic UI; impeccable governs interaction and responsiveness.
English UI and USD amounts. Product name: Home Ledger. No supplied logo or licensed web fonts.
No slogans, decorative prose, redundant descriptions or cute empty-state copy. Keep copy task-oriented.
Use clear sans-serif tabular numerals for all amounts and a restrained serif for headings.

## Product Principles
Make pending review easy to find. Distinguish pending/removed/transfer/refund accurately.
Show freshness and bank connection state. Prefer successful explicit saves to optimistic silent conflicts.
Keep personal sessions separate while sharing the household's data.
