# Interface design

Home Ledger uses [Hoshikuzu UI](https://github.com/Startust/hoshikuzu-ui): restrained typography, thin rules, compact corners, and a clear reading order. Product copy is English and kept short.

## Themes

|            | Night               | Archive    |
| ---------- | ------------------- | ---------- |
| Background | `#02040a`           | `#f7f8f3`  |
| Main text  | `#f8fafc`           | `#172033`  |
| Accent     | Amber and pale cyan | Muted teal |

The theme switch is available on login and in the app header. Preference persists locally, and the browser's theme color follows it. Tabular, sans-serif numerals keep amounts aligned and easy to compare.

## Interaction rules

- Home prioritizes monthly totals and transactions awaiting review.
- Mobile navigation and primary controls have touch targets of at least 44 pixels.
- Month navigation arrows have separate 44-pixel hit areas. Keep the transparent native month input clipped to the center label so it cannot overlap the arrows on iOS.
- Category deletion supports swipe and an accessible Actions menu. It requires an app-styled confirmation.
- Closing a changed transaction opens a themed discard confirmation. Keep editing is the safe default. Dialogs trap focus, restore focus on close, and support Escape.
- Saving is explicit. Stale edits report a conflict rather than overwriting another member's changes.
- Exports follow the current screen's filters. Income has no manual review control.
- Loading, empty, offline, and expired-session states should use the same layout and concise language.

The vendored provider and components live in `web/src/hoshikuzu/`. Ledger layout and adaptations live in `web/src/hoshikuzu.css`; shared structural styles live in `web/src/styles.css`. Keep changes compatible with both themes and reduced-motion preferences.

Screenshots under `docs/images/` contain local sample data only. See [development checks](DEVELOPMENT.md#ui-checks) before changing the interface.
