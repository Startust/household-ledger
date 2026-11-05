# Hoshikuzu UI preview

Local style experiment on `yihui/hoshikuzu-preview`, based on Home Ledger `dababec`.
Production and the original checkout remain unchanged.

Open http://127.0.0.1:5180/ and use the sun/moon control in the topbar to compare
Night atlas and Archive sheet. The preference is stored in this browser.
The local app uses the existing demo ledger, not production bank data.

## Source

The theme, AtlasMode, Measurement and StarPanel source come from
Startust/hoshikuzu-ui `d6447fe136485d2cac389041bcdeae595187f723`.
Provenance and the one provider adaptation are recorded in
`web/src/hoshikuzu/README.md`. Existing ledger controls use the same semantic
palette through `web/src/hoshikuzu.css`. Tailwind 4.3.4 and cn 0.5.2 are pinned;
existing framework versions are unchanged.

## Run locally

The frontend runs with `npm run dev:client` on port 5180 and proxies the API to
127.0.0.1:8766. Start the existing configured local Nest server with `PORT=8766`
and `APP_ORIGIN=http://127.0.0.1:5180`. Keep local credentials in the server's
ignored `.env`; do not put them in the frontend.

## Validation

- TypeScript + Vite production client build, including PWA generation: passed.
- Repository Prettier check and `git diff --check`: passed.
- Night/archive overview at desktop 1440, phone 390 and user width 1280.
- Browser: theme switch persists after reload; category multi-selection toggles
  and restores clean state; category Actions exposes Delete; CSV/PDF menu opens.
- The only browser-native prompt was replaced with a themed unsaved-edit
  confirmation. Keep editing and Escape retain edits; Discard closes both dialogs,
  restores focus and unlocks page scrolling. No alert/confirm/prompt calls remain
  in the application source.
- Screenshots include overview, transaction editor, export menu and settings.
- No server code, migrations or production data changed. Backend regression
  suite was not rerun for this visual-only preview.

The design detector ran once; its findings are advisory comparisons against the
old Kami design metadata, not runtime failures. Review artifacts are local under
`.impeccable/review/`.
