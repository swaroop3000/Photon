# Product tutorial validation — 2026-11-16

The toolbar now displays Tutorial as text instead of hiding its label behind a
question-mark icon. Six lessons cover creating/importing projects, map/features,
Apply/Undo, local commits/branches, analysis/design tools and export/backups.
Numbered topic shortcuts, Back/Next, Finish, Close, Escape and the existing ?
shortcut are supported. The modal contains keyboard focus and returns focus to
its opener when closed.

The guide is read-only. Unlike the removed legacy tour, it never navigates or
rerenders the underlying workspace, writes storage or executes DNA commands.
Unapplied sequence text, current tools, projects and history remain in place.
Supported-format, local-history and scientific-method limits are explained where
relevant. No investor mode, presentation banner or scripted edit was added.

Two new browser regressions cover traversal of all six lessons, topic/Back
navigation, draft/storage/tool preservation, reopening, phone bounds, keyboard
focus containment and closing. Actual built-site desktop/390px screenshots are
in product/tutorial-desktop.png and product/tutorial-phone.png.

Local verification: npm test passed 281 tests; the full Chromium suite passed
101 tests (zero failures/skips), including both tutorial cases. Static build
and Wrangler 4.162.0 deploy --dry-run passed without upload; the package manifest
covers 75 files, plus the manifest itself. git diff --check passed. Exact-head
CI/hosted verification is recorded in draft PR #1. The tutorial is previewed separately; the user's prior promotion of MVP
version ccc7aca5 does not authorize automatic publication of future changes.
Main stays unchanged. Production promotion remains an explicit action.
