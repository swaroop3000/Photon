# Modern product refresh — 2026-11-16

## Findings and change

Fresh actual production and previous-preview loads both showed the modern sidebar,
with no page errors. Production matched the earlier tutorial version rather than
the latest seven-workflow preview. A persistent legacy-style view was not reproduced
in that fresh browser; this report does not assert a proven cache failure.

Code inspection found a fragile startup dependency: modern-workspace was last in
the sequential module list, after optional draft storage initialization. The new
HTML applies photon-modern immediately, and navigation/decorations initialize
before project storage and optional modules. A blocked draft module no longer
leaves the legacy layout visible. Built CSS URLs use a content hash query so a
published entrypoint selects its matching stylesheet. Normal ZIP paths remain.

The normal product has a refreshed indigo palette, light/dark themes, DNA branding,
Projects shortcut in the sidebar, Design heading, larger project preview cards,
consistent surfaces and responsive editor/tool panels. No presentation mode,
new storage model or data replacement. The seven MVP improvements remain in use.

## Checks

Three new Chromium cases cover initial HTML styling with JavaScript disabled and
a never-resolving optional draft module; real Projects navigation with exact saved
project equality and phone bounds; and actual built CSS hash/manifest paths.
Existing contrast/reduced-motion/keyboard import, draft/save failure and data
preservation cases are retained. Local suites passed **283 core tests and 115
Chromium cases**, zero failures/skips; the full browser run took 209 seconds.
Build, complete-package/offline extraction and Wrangler 4.162.0 dry run passed.
The manifest retains 81 assets plus itself. git diff --check passed. Exact-head
CI/hosted results are recorded in draft PR #1. Static build and Wrangler dry run do not promote production.

Screenshots in modern-refresh/ are actual built-site synthetic-data captures:
editor-light.png, editor-dark.png, projects.png and projects-phone.png. They were
visually inspected. Primary control contrast checks pass in both themes; this is
not a comprehensive accessibility or all-device certification.

Main remains unchanged, PR #1 stays draft and production promotion is separate.
Never clear site data as a styling fix; use the verified version/preview instead.
