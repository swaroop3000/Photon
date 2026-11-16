# Roadmap continuation — November 15, 2026

Continues feature head `782bfd4`, retaining the existing UI and main branch.

## Reviewable milestones

1. `7954c01`: GenBank repeated strings, known flags and selected unquoted tokens;
   shared codon_start/table-1/11 CDS interpretation across new and legacy displays.
   Public pBR322 fixture and independent reference checks; codon optimization undo.
2. `107b200`: navigable bounded sequence display with absolute coordinates,
   clipped annotation coloring and transient navigation; 1 Mb/10 Mb browser cases.
3. `1666c41`: repair incorrect legacy BsaI/BsmBI offsets/reverse cuts/linear wrapping;
   independently verify all 28 UI enzyme definitions and 3,118 digest vectors.
4. Reviewed atomic browser-archive restore: semantic checks, explicit replacement
   review, exact library bytes, absent-key removal, prior-state recovery/read-back,
   captured active revision/source checks and all-or-nothing project/library writes.

Each milestone has a dedicated validation report alongside this document.

## Final local verification

Linux, Node 24.22.1, Chromium via Playwright 1.56.1, Biopython 1.86:

| Check | Result |
| --- | --- |
| `npm test` | 265 passed, zero failed/skipped |
| `node --test browser/*.test.mjs` | 80 passed, zero failed/skipped; 137.8 s |
| `npm run build` | Passed |
| Wrangler 4.162.0 `deploy --dry-run` | Custom build passed, 67 assets; no upload/deploy |
| Existing Biopython differential | 3,669 assertions passed |
| Public GenBank/CDS differential | 475 assertions passed; 48 features, three annotated CDS, 270 vectors |
| Curated enzyme differential | 12,358 assertions passed; 28 enzymes, 3,118 vectors |
| Actual primer3-py 2.4.0 | Five candidate pairs produced and cross-validated |
| Independent pySBOL3 | Three graphs passed with zero errors/warnings |
| Built distribution on local HTTP 8766 | Real pBR322 import, three table-11 CDS displays and atomic archive restore; zero page errors |
| 1 Mb diagnostic benchmark | Completed; `window-core-benchmark.json`, observational only |

The exact bytes of the public accession fixture intentionally retain its original
trailing spaces and final blank line; its manifest digest is independently checked.
No test depends on retrieving it online.

## Remaining acceptance work

- Broader INSDC locations, full source/header preservation and diverse genomes.
- Full editor virtualization, streaming import, incremental diffs/history and
  browser/device memory/latency/quota budgets. A navigable 6,000-base display and
  one 10 Mb workflow do not establish chromosome-scale editing acceptance.
- Gateway/other prototype cloning fixtures, chemistry exclusions, independent
  scientific accuracy criteria/review and wider real-record datasets.
- Automatic reverse migration, corrupt-record reconciliation, independent storage
  cutover/rollback and full code/security/release review.
- Authenticated Cloudflare successful build-log and branch-setting review.
  Earlier actual failure was diagnosed from the user-supplied missing-dist log;
  packaging and provider-check success alone do not replace dashboard review.

Keep PR #1 draft and unmerged. Main/production remain unchanged by these actions.
Photon remains an alpha; complete Genome Compiler parity is not established.
