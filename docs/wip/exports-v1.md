# CSV / PDF exports

Status: complete, 2026-11-05.
Brainstorm Gate: complete from existing context; formats, ledger scope, English UI and visual style are explicit.

## Acceptance
- Overview exports the selected month; Transactions exports current search/status filters, across all pages.
- CSV is UTF-8 with BOM, standard escaping, exact decimal USD amounts and safe spreadsheet text fields.
- PDF has a concise summary and complete transaction details, clear pending/posted/review states, notes, page numbers.
- Summary totals use only matching posted transactions and exclude transfers; pending rows remain identified in details.
- Session-protected same-origin downloads, no-store, no static financial files or service-worker cache.
- Removed and foreign-household rows never export. Validate query parameters; reject over 5,000 rows without truncation.
- English labels and minimal copy; preserve current UI tokens. CJK notes render through an embedded licensed font.
- Production container includes PDF font and runtime library.

## Implementation and checks
Scope: export query/controller/service/renderer; shared transaction filter; web export action; Docker assets; docs/tests.
Reviews: product APPROVE; architecture APPROVE (bounded authenticated in-memory output); verification APPROVE.
Check filters/all pages/CSV escaping and formula protection/amounts/auth/isolation/empty output; multi-page PDF rendering;
actual CSV/PDF download through desktop/mobile UI, build and production container.
No bank data mutations, deployment, automatic exports or email/sharing.

## Execution
- Implemented authenticated CSV/PDF endpoint, shared month/search/status filter, in-memory rendering and 5,000-row explicit limit.
- Added compact Export menus to Overview and Transactions; retained incumbent English visual system.
- Added pinned PDFKit runtime and OFL-licensed Noto font asset to production image.
- 45 integration tests passed; desktop/mobile browser downloads, independent CSV/PDF parsing and all nine stress PDF pages verified.
- Production Docker export checks passed; no bank-data edits or remote deployment.
- Durable behavior promoted to README, docs/API.md and docs/SYSTEM_MAP.md; evidence in docs/VERIFICATION.md.
- Independent UI finish review: ship, no material fixes. Extension documentation comparison complete; PRODUCT.md, DESIGN.md and design.json preserved unchanged.
