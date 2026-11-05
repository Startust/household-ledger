# Hoshikuzu preview direction

User explicitly chose the existing Startust/hoshikuzu-ui visual world and previously chose direct implementation. This isolated branch previews its night/archive modes without publishing or altering production.

Mode: Operate. Keep English copy, existing navigation, month overview/review emphasis, readable sans tabular currency, multiple category labels, deletion confirmation, exports and income auto-review. Use the real library theme and AtlasMode, Measurement and StarPanel components from d6447fe. Use 2px corners, hairlines, light headings, tracked compact labels, amber primary and cyan selection at night; pale paper and teal in archive mode. No invented copy or decorative starfield behind financial content. Keep 44px touch targets and existing native dialogs.

First viewport: overview heading + month/export actions, ruled monthly reading + three library measurement cells, outlined review action, recent transactions and category breakdown. Mobile stacks the review row above recent activity, with bottom navigation. Theme toggle is in the topbar and login page; preference persists locally. Existing API and data are unchanged. Runtime uses local demo data only.

Reference: published Hoshikuzu UI Home Atlas story and local library DESIGN.md/component-guidelines.md. No generated comp; code-first pinned-library adoption. Verify both modes on desktop 1440, mobile 390 and actual user viewport. Production design in main stays unchanged; this branch's documentation must clearly identify the preview scope.
