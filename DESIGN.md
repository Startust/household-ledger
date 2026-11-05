---
name: Home Ledger — Hoshikuzu preview
description: Local night-atlas and archive-sheet style preview; main and production retain Kami.
colors:
  night-background: '#02040a'
  night-foreground: '#f8fafc'
  night-card: '#05070d'
  night-primary: '#f5f0dc'
  night-primary-hover: '#fff8de'
  night-secondary: '#101827'
  night-muted: '#aeb8c7'
  night-faint: '#6f7b8d'
  night-signal: '#aad7dc'
  night-accent: 'rgba(170, 215, 220, 0.1)'
  night-border: 'rgba(255, 255, 255, 0.14)'
  night-border-faint: 'rgba(255, 255, 255, 0.08)'
  night-border-strong: 'rgba(255, 255, 255, 0.26)'
  night-input: 'rgba(255, 255, 255, 0.16)'
  night-success: '#7bd7ad'
  night-warning: '#f5d28a'
  night-destructive: '#f08a8a'
  archive-background: '#f7f8f3'
  archive-foreground: '#172033'
  archive-card: '#fffffc'
  archive-primary: '#172033'
  archive-primary-hover: '#263247'
  archive-secondary: '#edf0ea'
  archive-muted: '#5e6a77'
  archive-faint: '#6b7683'
  archive-signal: '#477c86'
  archive-accent: 'rgba(71, 124, 134, 0.1)'
  archive-border: 'rgba(36, 48, 64, 0.18)'
  archive-border-faint: 'rgba(36, 48, 64, 0.08)'
  archive-border-strong: 'rgba(36, 48, 64, 0.32)'
  archive-input: 'rgba(36, 48, 64, 0.22)'
  archive-success: '#1e7652'
  archive-warning: '#87571f'
  archive-destructive: '#a33d3d'
typography:
  headline:
    fontFamily: "'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic UI', 'Segoe UI', system-ui, sans-serif"
    fontSize: 32px
    fontWeight: 300
    lineHeight: 1.4
    letterSpacing: normal
  title:
    fontFamily: "'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic UI', 'Segoe UI', system-ui, sans-serif"
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.4
  body:
    fontFamily: "'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic UI', 'Segoe UI', system-ui, sans-serif"
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.55
  control:
    fontFamily: "'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic UI', 'Segoe UI', system-ui, sans-serif"
    fontSize: 11px
    fontWeight: 600
    letterSpacing: 0.12em
  measurement-label:
    fontFamily: "'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic UI', 'Segoe UI', system-ui, sans-serif"
    fontSize: 10px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.16em
  amount-primary:
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: 54px
    fontWeight: 300
    lineHeight: 1.2
    letterSpacing: -0.025em
  amount-measurement:
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: 24px
    fontWeight: 400
    lineHeight: 1
    letterSpacing: -0.02em
  amount-row:
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: -0.01em
rounded:
  square: 0px
  instrument: 2px
  sheet-top: 4px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  section: 24px
components:
  button-primary:
    backgroundColor: '{colors.night-primary}'
    textColor: '{colors.night-background}'
    typography: '{typography.control}'
    rounded: '{rounded.instrument}'
    padding: 12px 20px
  button-primary-archive:
    backgroundColor: '{colors.archive-primary}'
    textColor: '{colors.archive-background}'
  button-outline:
    backgroundColor: transparent
    textColor: '{colors.night-muted}'
    typography: '{typography.control}'
    rounded: '{rounded.instrument}'
    padding: 12px 20px
  button-danger:
    backgroundColor: '{colors.night-destructive}'
    textColor: '{colors.night-background}'
    rounded: '{rounded.instrument}'
    padding: 12px 20px
  button-text:
    backgroundColor: transparent
    textColor: '{colors.night-signal}'
    padding: 8px 0
  button-icon:
    backgroundColor: transparent
    textColor: '{colors.night-muted}'
    rounded: '{rounded.instrument}'
    padding: 10px
  field:
    backgroundColor: '{colors.night-card}'
    textColor: '{colors.night-foreground}'
    typography: '{typography.body}'
    rounded: '{rounded.instrument}'
    padding: 11px 13px
  navigation-active:
    backgroundColor: transparent
    textColor: '{colors.night-foreground}'
    rounded: '{rounded.instrument}'
    padding: 12px 17px
  category-selected:
    backgroundColor: '{colors.night-accent}'
    textColor: '{colors.night-foreground}'
    rounded: '{rounded.instrument}'
    padding: 9px 11px
  review-panel:
    backgroundColor: '{colors.night-card}'
    textColor: '{colors.night-foreground}'
    rounded: '{rounded.instrument}'
    padding: 24px
  measurement:
    backgroundColor: transparent
    textColor: '{colors.night-foreground}'
    typography: '{typography.amount-measurement}'
    rounded: '{rounded.square}'
    padding: 21px 18px
---

# Design System: Home Ledger — Hoshikuzu preview

## Overview

**Creative North Star: "The Private Star Atlas"**

This isolated local preview applies the existing Hoshikuzu world to Home Ledger: precise hairlines, light headings, restrained signal colors, and compact instrument labels. Night atlas uses deep-space surfaces; archive sheet uses pale paper. The ledger remains an English, task-oriented shared financial workspace.

This file describes branch yihui/hoshikuzu-preview, not an approved production redesign. Main and production retain their Kami commitment. The implementation uses the library's source/registry model at d6447fe136485d2cac389041bcdeae595187f723: vendored theme, AtlasMode, Measurement, and StarPanel, with a ledger-specific CSS bridge. No Base UI runtime is used. The direction is inherited from the requested library, not a new brand workshop.

**Key Characteristics:**

- Two modes share semantic colors and the same content hierarchy.
- Light sans headings, readable tabular currency, short tracked labels.
- Hairline sections and nearly square controls with flat resting surfaces.
- Existing ledger navigation, native dialogs, and category checkboxes remain.

Frontmatter records reused values from web/src/hoshikuzu.css, web/src/hoshikuzu/theme.css, and inherited web/src/styles.css. Mode-prefixed colors describe the two values of each runtime semantic token; component examples default to night. The sidecar adds state styling, motion, and responsive context. Source remains authoritative for details outside this bounded preview.

## Colors

### Primary

**Amber Lamp** (night-primary) identifies decisive actions. **Archive Ink** (archive-primary) performs the same role on paper. Their corresponding hover tokens brighten the action without changing its meaning.

### Secondary

**Cyan Signal** and **Archive Teal** (night-signal, archive-signal) identify focus, selected categories, text actions, and category bars. Their translucent accent washes support hover and selection. Success, warning, and destructive colors retain operational meaning; notices use matching surface/border tokens from the vendored theme.

### Neutral

**Deep Space / Archive Paper** are the canvases; **Observatory Panel / Archive Card** hold framed content and overlays. Foreground, muted, and faint values separate content from supporting metadata. Border, faint-border, strong-border, and input values establish frames, row rules, interactive emphasis, and fields.

**The Semantic Mode Rule.** Use the runtime semantic CSS variables so night and archive change together; color never replaces a visible financial or review-state label.

## Typography

The ledger's sans stack starts with Noto Sans JP, then Hiragino Sans, Yu Gothic UI, Segoe UI, and system sans. The vendored theme retains its longer Japanese fallback stack. No web-font download is added. Headings are light sans in this preview; the serif heading rule belongs to the Kami main branch.

The frontmatter captures desktop roles. Page headings become (28px) on mobile. Leading currency becomes (46px), then (42px) at the narrow breakpoint; measurement values become (20px), then (18px). Row amounts stay (17px). Review counts use (44px) desktop and (28px) mobile. Compact controls use uppercase labels; prose and transaction names retain normal case.

**The Ledger Number Rule.** Currency uses the dedicated Segoe UI/system sans stack with tabular lining numerals, adapting the library's numeric readout style for financial scanning.

## Layout

The existing shell remains: desktop rail (218px), content cap (1280px), and gutters (48px). The tablet band (761–1100px) reduces the rail to (185px) and gutters to (28px). At (760px) and below, four bottom navigation destinations replace the rail and gutters become (22px); at (370px) and below they become (17px). Minimum body width is (320px). Safe-area padding and bottom navigation clearance remain.

The overview pairs a ruled monthly reading with the review panel, followed by activity and categories. Three Measurement cells stay in one row, separated by faint vertical rules. On mobile the review row moves above activity and category bars use two columns. This composition belongs to the overview, not every future screen. Common actions and the mode toggle retain targets of at least (44px); ordinary form buttons and fields are (46px) minimum.

## Elevation & Depth

Tonal surfaces and hairlines carry hierarchy. The review StarPanel explicitly removes its library shadow; routine rows and monthly readings remain flat. Dialogs, export menus, help popovers, and toasts use the short mode-aware overlay shadow recorded in the sidecar. Native dialogs use a flat scrim without blur. No starfield, decorative glow, or graticule is placed behind financial content.

**The Flat Ledger Rule.** Reserve elevation for temporary overlays; the library's optional sky effects are not part of this ledger preview.

Existing button feedback uses a short background/press transition. AtlasMode uses (150ms) ease-out-quint color/border changes and a slight press scale. Reduced-motion preferences suppress motion. Unused library animation utilities are not a requirement for ledger screens.

## Shapes

Controls, merchant tiles, navigation items, notices, and review panels use precise (2px) corners. Monthly readings and category bars remain square; bars are (2px) tall. Mobile native dialogs use (4px) top corners and square bottom corners. Existing circular member avatars and native checkbox affordances remain deliberate adaptations. Borders generally use one CSS pixel.

## Components

### Buttons and mode control

Primary actions use the mode's lamp/ink fill; secondary actions are transparent with a hairline and muted label. Hover adds the signal wash and stronger border. Destructive ledger actions retain their explicit destructive fill, an adaptation of the library's quieter destructive treatment. Text actions use signal color, and icon actions preserve accessible labels. Disabled controls retain the incumbent opacity and keyboard controls retain visible signal-colored focus.

AtlasMode appears in the topbar and login view. Its accessible name describes the destination mode; the preference persists in local storage and updates browser theme color. The preview enlarges the library toggle to the ledger's touch target.

### Inputs, categories, and filters

Fields use card surfaces, input strokes, and stronger hover borders. Month selection remains a native input beneath its formatted English label. Search keeps its visible boundary. Selected category choices use a signal border and wash with native checked inputs; multiple labels remain independently selectable. Filter keys use a neutral strong frame and foreground text for their pressed state. These are existing ledger behaviors styled through the semantic bridge.

### Navigation and tags

The desktop rail retains the ledger's outlined current item, with a signal-colored icon and aria-current="page". Mobile navigation retains labeled icons and signal-colored current state. This is an intentional adaptation rather than the library's literal one-pixel active marker. The small demo badge remains explicit sample-data disclosure, not promotional copy.

### Monthly readings and review panel

Measurement supplies three light numeric readings over compact tracked labels, with the ledger's number stack and responsive sizes. StarPanel supplies the framed review surface without a connector, translucency, or shadow; its heading remains readable sentence case. Review prominence and the monthly hierarchy remain unchanged.

### Rows, overlays, and feedback

Transaction rows retain right-aligned tabular amounts, explicit states, merchant names, and wrapping metadata; credit amounts include a plus sign. Styled HTML dialogs preserve focus and escape behavior and become mobile bottom sheets. Browser alert/confirm/prompt dialogs are excluded: unsaved edits use the themed alertdialog with Keep editing and Discard actions. Export choices, notices, and toasts use the shared overlay/status palette. Deletion confirmation, category multi-selection, and income auto-review remain product behavior, not visual experiments.

## Do's and Don'ts

### Do:

- Do verify night and archive together when changing semantic colors.
- Do keep English copy task-oriented and preserve explicit state labels.
- Do keep currency in readable sans-serif tabular lining numerals.
- Do preserve keyboard focus, touch targets, and mobile safe-area clearance.

### Don't:

- Don't treat this local preview as approval to change main or production.
- Don't place decorative starfields, glow, or gradients behind financial content.
- Don't uppercase sentences or apply label tracking to body copy.
- Don't replace working native ledger interactions solely to imitate library demos.
