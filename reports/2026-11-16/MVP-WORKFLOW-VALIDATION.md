# Seven MVP workflow additions — 2026-11-16

The normal product now includes Projects/recent search, separate unapplied-text
recovery, reviewed drag/drop import, shareable design reports, explicit annotation
review, named revisions and searchable tool help. No presentation/investor mode,
remote service or scientific capability expansion was introduced.

## Evidence

Eleven new Chromium regressions cover dashboard ordering/search/project integrity;
draft reload and complete browser restart without changing saved DNA; competing
writers and stale revision refusal; quota failure with downloadable exact text;
corrupt draft retention; reviewed dropped files; report HTML/JSON content; named
version persistence, duplicate refusal and save rollback; tagged-amend protection;
stale annotation review; and contextual help with unchanged project snapshots.

Two new core tests verify report hashing/deep-copy/omissions and malicious text
escaping, including exact compound locations. HTML has a restrictive CSP and
rebuilds maps from numeric coordinates. Reports contain no executable scripts,
external resources, full sequence, project history or unapplied drafts.

Local final checks: **283 core tests and 112 Chromium tests passed**, zero
failures/skips. The full browser run took 212 seconds. Static build and Wrangler
4.162.0 dry run passed without upload; the manifest covers 81 files plus itself.
The complete-package/offline-extraction regressions passed in the full suite.
git diff --check passed. Exact-head CI and hosted checks are recorded in draft PR #1. Screenshots in mvp-workflows show the built dashboard, standalone HTML report
and 390px phone help, using only synthetic constructs. The 1 Mb core benchmark
completed (see MVP-WORKFLOW-BENCHMARK.json); it is diagnostic, not browser draft
latency or chromosome-scale certification.

## Limits and release boundary

Draft saves are debounced 350 ms. Normal unload warns on pending or failed writes;
crashes/browser eviction can lose text. Project backups exclude drafts; download
or apply them separately. Failed writes retain in-tab recovery but are not durable.
Stale drafts cannot restore to a different construct/HEAD. No cloud synchronization.

Named versions are existing commit tags. This UI prevents editing tagged HEAD via
Amend; trusted console scripts can still mutate browser data. Annotation review
removes a warning after explicit acknowledgement; it is not a laboratory result.
The report map shows the first 300 annotations; its table retains all annotations.
Scientific and independent release-review gates remain in ENGINEERING-REVIEW.md.
Main remains unchanged, PR #1 stays draft and no production promotion is performed.
