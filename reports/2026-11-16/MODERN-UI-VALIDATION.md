# Modern workspace UI/UX — November 16, 2026

Continues `452571b`, within the user-approved investor-MVP scope. It modernizes the
existing application rather than replacing the editor or expanding biology features.

## Changes

- Charcoal desktop sidebar, clear active navigation, compact toolbar utilities,
  restrained teal palette, consistent type/spacing/cards and readable map labels.
- Responsive two-column desktop workspace; stacked phone panels and horizontal
  navigation. Phone dropdowns stay inside the viewport and below the measured toolbar.
- Dark/light themes, visible keyboard focus, keyboard-operable file controls and
  reduced-motion behavior. Icon actions retain accessible labels and original handlers. The destructive
  Reset action keeps its visible text label instead of resembling Undo.
- Redesigned investor guide with explicit scope and a keyboard-operable collapse
  control. Existing sample/edit/undo/commit/export callbacks remain in place.
- Real status distinguishes saved-local baseline, unapplied text, uncommitted
  changes, saving and storage failures. It does not invent a remote connection,
  team members, biological results or saved-state success.

The new module reads existing project state and changes DOM presentation only;
original UI action handlers remain responsible for explicit user operations. It
adds no project writes or new persistence model. The stylesheet is local; no CDN
fonts/frameworks or external icon dependency was introduced.

## Local verification

Linux, Node 24.22.1, Chromium / Playwright 1.56.1:

- `npm test`: **280 passed**, zero failures/skips.
- `node --test browser/*.test.mjs`: **96 passed**, zero failures/skips; 162.6 s.
- Eight investor/UX cases passed again after the final labeled-Reset refinement.
  Keyboard-import automation waits for storage to settle and focuses the target
  atomically with its key press, without timing sleeps.
- Five new real-browser cases cover decorated navigation/data preservation,
  actual save/draft/failure status, phone fit and guide collapse without writes,
  primary-action contrast in both themes/reduced motion, and keyboard file import.
- Dark-mode primary-action contrast exposed a transition between background colors;
  primary background/text changes now happen together instead of briefly showing
  mismatched colors. The contrast checks pass at a minimum 4.5:1 in both themes.
- Visually inspected actual desktop light/dark and 390-pixel phone layouts; no
  document horizontal overflow or page errors in these captures. Screenshots in
  [`ui/`](ui/README.md) contain synthetic data only.
- Static build and Wrangler 4.162.0 dry run passed with **73 assets**, without
  uploading or promoting production.
- Built distribution on HTTP 8766 passed the modern shell, actual sample/edit/
  status/undo/reapply/commit/export/reload workflow with **zero page errors**.

This is scoped Chromium/desktop/phone-layout evidence, not a complete accessibility
certification or acceptance across every device/browser. Core scientific and storage
limits remain as documented. Keep PR #1 draft, main unchanged and production
promotion subject to separate approval.
