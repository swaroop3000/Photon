# Bounded genome sequence display

Continues `7954c01`; preserves the original editor and adds small navigation controls.
The pure display projection allocates at most 6,000 visible bases and intersects
annotation spans with the chosen window. Work remains O(annotation count + visible
colored bases), not full-genome per-base coloring. Absolute coordinates are shown.
Selecting an annotation opens its window; invalid base jumps leave it unchanged.
Navigation neither changes DNA nor writes IndexedDB revisions.

Local validation (Linux, Node 24.22.1, Chromium/Playwright 1.56.1):

- `npm test`: **258 passed**, zero failures/skips.
- New `browser/sequence-window.test.mjs`: **2 passed** (17.35 seconds combined).
  Uses real IndexedDB, 1 Mb write-free navigation and a 10 Mb construct with tail
  feature selection, save and page reload. It is one host/browser diagnostic.
- `npm run build`: passed.
- `node scripts/benchmark-core.mjs 1000000`: completed; JSON alongside this report.

The earlier combined suite passed 70 browser cases before adding these two cases.
A combined final suite follows later milestones. Full-text textarea, diffs, undo
snapshots and storage serialization are still whole-construct operations. The
existing import/backup read limits are unchanged. This is bounded navigable display,
not completed streaming import, full editor virtualization or performance acceptance
across hardware/browsers. No production promotion or merge.
