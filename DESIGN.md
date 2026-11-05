---
name: Home Ledger
description: Parchment surfaces, ink-blue controls, and tabular amounts for a shared ledger.
colors:
  paper: "#f5f4ed"
  ivory: "#faf9f5"
  sand: "#e8e6dc"
  ink: "#242620"
  muted: "#6b6a64"
  secondary: "#504e49"
  blue: "#1b365d"
  line: "#deddd3"
  green: "#52634f"
  blue-hover: "#2d4b71"
  field-border: "#c9c8bd"
  sidebar: "#eeede5"
  nav-active: "#e0e4e5"
  review-surface: "#eceee5"
typography:
  headline:
    fontFamily: "Charter, Georgia, 'Palatino Linotype', serif"
    fontSize: 30px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: -0.015em
  title:
    fontFamily: "Charter, Georgia, 'Palatino Linotype', serif"
    fontSize: 21px
    fontWeight: 500
    lineHeight: 1.4
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.55
  amount-primary:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: 48px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: -0.025em
  amount-row:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: -0.01em
rounded:
  badge: 4px
  filter: 6px
  field: 7px
  control: 8px
  card: 12px
  dialog: 16px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  section: 24px
  panel: 30px
components:
  button-primary:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.ivory}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: 12px 20px
  button-primary-hover:
    backgroundColor: "{colors.blue-hover}"
  button-secondary:
    backgroundColor: "{colors.sand}"
    textColor: "{colors.secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: 12px 20px
  button-text:
    backgroundColor: transparent
    textColor: "{colors.blue}"
    padding: 8px 0
  button-icon:
    backgroundColor: transparent
    textColor: "{colors.secondary}"
    rounded: "{rounded.control}"
    padding: 10px
  field:
    backgroundColor: "{colors.ivory}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: 11px 13px
  navigation-active:
    backgroundColor: "{colors.nav-active}"
    textColor: "{colors.blue}"
    rounded: "{rounded.field}"
    padding: 12px 17px
  filter-active:
    backgroundColor: "{colors.sand}"
    textColor: "{colors.blue}"
    rounded: "{rounded.filter}"
    padding: 11px 14px
  monthly-folio:
    backgroundColor: "{colors.ivory}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: 27px 30px 24px
  review-note:
    backgroundColor: "{colors.review-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: 26px
---

# Design System: Home Ledger

## Overview

**Creative North Star: "The Shared Monthly Folio"**

Warm parchment and ivory surfaces support ink-blue actions. Charter-led headings establish sections; system sans-serif labels and tabular amounts keep the ledger easy to scan. Fine rules and restrained surfaces give this working interface its character.

Copy stays short, English, and task-oriented. The folio metaphor guides materials and hierarchy without adding slogans, decorative prose, photography, or illustrations.

**Key Characteristics:**

- Warm neutral surfaces with ink-blue actions.
- Serif headings and sans-serif tabular amounts.
- Ruled transaction rows with explicit status.
- Comfortable mobile controls and compact desktop navigation.

Extracted from the finished styles and React components, checked against desktop and mobile review captures. Frontmatter owns reusable primitive values; the sidecar owns extensions. Responsive rules override base values. Unused legacy styles are not design authority.

## Colors

### Primary

**Ink Blue** (`blue`) identifies primary actions, selected navigation, focus, the wordmark, and the primary monthly amount. **Hover Blue** (`blue-hover`) is its button hover state.

### Neutral

**Parchment** (`paper`) is the canvas; **Ivory** (`ivory`) holds fields, folios, digests, dialogs, and mobile navigation. **Sand** (`sand`) supports secondary actions, filters, badges, and help surfaces. **Ledger Ink**, **Secondary Ink**, and **Muted Ink** (`ink`, `secondary`, `muted`) separate primary content from supporting context. Placeholders use muted ink at full opacity.

**Paper Rule** (`line`) separates sections and rows; **Field Stroke** (`field-border`) defines inputs. **Spine Paper** (`sidebar`), **Selected Paper** (`nav-active`), and **Review Paper** (`review-surface`) provide quiet contextual surfaces.

Credit green (`green`) accompanies positive amounts. Review states, notices, and category bars retain their existing muted semantic colors and visible labels; they are not additional decorative accents.

**The Ink Rule.** Use ink-blue for actions, selection, and the primary monthly figure while keeping neutral surfaces dominant.

## Typography

Headings use Charter with Georgia and Palatino fallbacks. Body text and controls use the platform sans-serif stack. All amounts use the dedicated sans-serif number stack with `tabular-nums lining-nums`. No external font download is required.

The frontmatter records normal desktop roles. Page headings become (27px) in the tablet band, (26px) on mobile, and (23px) on narrow screens. Section headings vary between (20px) and (21px); dialog headings use (23px). Metadata uses (11–13px), with compact transaction status and mobile navigation labels at (10px).

The leading amount becomes (49px) in the tablet band, (66px) on wide desktop, (42px) on mobile, and (38px) on narrow screens. Secondary monthly amounts are (21px), then (19px) on mobile and (17px) on narrow screens. Row amounts remain (16px), reducing to (15px) on narrow screens. Review counts use the same number treatment at (40px) desktop and (29px) mobile.

**The Numeric Rule.** All amounts use sans-serif tabular lining numerals; serif type is reserved for headings and the wordmark.

## Layout

Desktop uses a fixed navigation rail (218px), a centered content area capped at (1280px), and horizontal gutters (48px). The tablet band (761–1100px) uses a narrower rail (185px) and gutters (28px). At (760px) and below, the rail becomes four bottom navigation items and content gutters become (22px). At (370px) and below, gutters reduce to (17px). The minimum body width is (320px).

The overview pairs a flexible monthly folio with a review panel (252px), aligning recent transactions and categories below. Its side column becomes (210px) in the tablet band and (285px) from (1450px). On mobile these sections stack, the review action sits beside its count, and category bars use two columns. This is the overview's composition, not a mandatory template for every route.

Spacing is generous between sections and compact within rows. The frontmatter names reused direct CSS lengths; the source does not expose spacing variables. Settings switch from two columns to one on mobile. Main content reserves bottom clearance (100px plus the safe-area inset). Mobile top bars, navigation, and dialogs respect device safe areas.

## Elevation & Depth

Ordinary folios, review panels, digests, and transaction rows are flat. Tone and thin rules establish hierarchy. Only transient toasts and dialogs use soft shadows; exact values are in the sidecar. Dialogs also dim the background without blur.

**The Flat Surface Rule.** Routine ledger content stays flat; shadows distinguish temporary overlays.

Button backgrounds and press feedback transition over (180ms, ease-out); an enabled button moves down (1px) while pressed. Refresh icons rotate over (1.2s, linear). Reduced-motion preferences disable animation and transitions.

## Shapes

Controls and containers use restrained rounded rectangles with role-specific radii in the frontmatter. Rows remain square with fine horizontal dividers. Merchant icons use rounded tiles; member avatars are circular. The brand uses the existing asymmetric book outline.

Mobile dialogs have rounded top corners and square bottom corners (16px 16px 0 0). Category bars are thin (5px) with near-square ends (1px). Borders generally use one CSS pixel.

## Components

### Buttons

Primary and secondary buttons use the frontmatter colors, padding, and control radius, with a usual minimum height (46px). Secondary hover uses the existing darker sand. Text buttons are blue, unboxed, and underlined on hover. Icon buttons have a transparent background and sand hover state. Text and normal icon actions use a minimum target (44px). The compact help control is a specific exception, not a general target-size rule.

Keyboard controls preserve the shared blue focus outline (2px with a 4px offset). Disabled buttons reduce opacity (0.48) and do not animate on press.

### Inputs / Fields

Fields use ivory, a visible field stroke, and the field radius, with explicit labels and a minimum height (46px). Mobile text increases to (16px). Placeholders use fully opaque muted ink. Search combines a leading icon and a borderless input inside a visible field boundary. The native month input overlays its formatted English label and retains an explicit label and focus-within outline.

### Navigation and filters

Desktop navigation combines SVG icons and English labels; selected links use `aria-current="page"`, a tinted surface, blue text, and stronger weight. Mobile preserves the same four destinations with labels below icons, an ivory background, a fine top rule, and safe-area padding.

Transaction filters use `aria-pressed`, gently rounded rectangles, and a minimum height (44px). Selected filters use sand with semibold blue text. Mobile filters share the row width. The demo badge identifies sample data without promotional language.

### Cards / Containers

Monthly folios and digests use ivory, a fine rule, the card radius, and no shadow. Review panels use review paper without a border. Secondary monthly figures sit below a rule in three columns. Routine transactions remain plain rows.

### Transaction rows

Each full-width button contains a merchant icon, a single-line merchant name, wrapping metadata, a right-aligned tabular amount, and explicit status. Long names truncate while amounts remain visible. Credits include a plus sign and green text. Reviewed status includes a check icon. Hover changes the background. Mobile hides optional note hints and trailing chevrons.

### Dialogs and feedback

Native modal dialogs have a heading, close control, escape handling, and scroll containment. They are centered on desktop and become bottom sheets on mobile. Error and information notices retain alert/status semantics. Toasts sit above mobile navigation.

Empty states name the missing item or next task directly. The review list says **No transactions to review**, without a repeated explanatory sentence. Keep recovery instructions only where they support an action.

## Do's and Don'ts

### Do:

- Do keep interface copy in English and state the task directly.
- Do use the existing parchment, ivory, and ink-blue palette.
- Do use sans-serif tabular lining numerals for amounts.
- Do preserve keyboard focus, explicit state labels, and safe-area clearance.

### Don't:

- Don't add slogans, cute empty states, or redundant descriptions.
- Don't use serif type for financial amounts.
- Don't communicate financial or review states through color alone.
- Don't add routine card shadows or decorative imagery.
