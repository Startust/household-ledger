# Hoshikuzu UI source

Vendored from https://github.com/Startust/hoshikuzu-ui at
`d6447fe136485d2cac389041bcdeae595187f723` (package license: MIT).
This is the library's registry distribution model: source lives in the consuming app.

- `theme.css`: `src/styles/hoshikuzu.css`, unchanged except formatting.
- `atlas-mode.tsx`, `measurement.tsx`, `star-panel.tsx`: `src/components/atlas/`.
- Local adaptation: AtlasModeProvider also updates the browser theme-color metadata.
- Touch targets and ledger layout are adapted in `../hoshikuzu.css`.

The application's Night and Archive themes use this source directly. No full UI-kit installation is required. See [third-party notices](../../../THIRD_PARTY_NOTICES.md) for licensing.
