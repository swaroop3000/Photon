# Normal product MVP validation — 2026-11-16

## Result and scope

The normal workspace is the product. Investor mode, presentation banners,
scripted-edit controls and their modules are removed. Old presentation URLs have
no special effect. Mock Actions/Remote/Labs/collaborator pages and the unvalidated
legacy Gateway controls are removed; existing modular tools remain available.

The broken Reset action is replaced with New project. Creating blank/pasted or
synthetic-example constructs uses the existing transactional save coordinator.
Existing projects, retained migration source and annotations remain protected.
The normal workflow uses real editing, full snapshot Undo/Redo, commits and export.

Download app now creates a complete ZIP rather than an unusable standalone HTML
file. The build generates a file-size/SHA-256 manifest and local HTTP launch
instructions. Download validates each file, creates a standard CRC ZIP, and
excludes all browser project data. Missing/changed assets fail visibly. Project
backups remain separate. The obsolete Copy code command is removed, including
from the command palette. Operation feedback is visible with an accessible status.

## Local checks

- `npm test`: **281 passed**, zero failed/skipped.
- `node --test browser/*.test.mjs`: **99 passed**, zero failed/skipped; Chromium,
  Playwright 1.56.1, final run 173 seconds. Build generated before the browser run.
- New/updated browser cases cover normal lifecycle/edit/undo/commit/GenBank export/
  reload, exact existing-project preservation, quota failure, cancellation, empty
  projects, removed mock routes, normal phone layout and keyboard import.
- Actual application download independently checked by Python `zipfile`: CRC,
  unique paths, required files, file hashes and extraction. The extracted app was
  served at a fresh local origin with all outside requests blocked; project
  creation/edit/Undo/reload passed with no page exceptions or external requests.
- Changed download asset rejects visibly with no ZIP and no project changes.
- `npm run build`: passed; manifest covers 74 application files, plus the manifest
  itself (75 distribution files). No reports/tests/Git/project data in the package.
- Wrangler 4.162.0 `deploy --dry-run`: passed through configured custom build;
  no upload or production promotion. Wrangler reported 78 asset reads; on-disk
  distribution and package manifest counts above were checked independently.
- Biopython 1.86 reference scripts passed: 3,669 baseline assertions, 475 real
  GenBank assertions, 12,358 curated-enzyme assertions, 568 compound-join assertions.
  These remain supported-subset computational checks, not laboratory validation.
- `git diff --check`: passed. Built normal light/dark/390px phone screenshots are
  in `product/`; no horizontal document overflow observed.

Earlier targeted/full attempts caught missing editor/tool augmentation during
cleanup; these hooks were restored before the successful full run above.

## Release boundary

Exact-head hosted CI and preview verification are recorded in draft PR #1 after
push. Main remains unchanged and production unpromoted. Authenticated Cloudflare
successful-build logs/settings review, independent accumulated-PR/storage/security
review and user approval remain separate release gates. Full Genome Compiler
parity, broad INSDC, chromosome-scale readiness, remote teamwork and laboratory
outcomes remain unverified or deferred; see ENGINEERING-REVIEW.md and MVP.md.
