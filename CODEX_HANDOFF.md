# Photon — Codex handoff (November 14, 2026)

## Latest: normal product MVP — November 16, 2026

The user's current instruction removes the earlier investor/presentation mode.
Use the normal root URL and `MVP.md`; earlier presentation screenshots/reports
are historical and are superseded by the normal-workspace validation report.

- Removed presentation modules, controls and scripted edit flow. Kept the modern
  normal UI and real tools; removed mock Labs/Remote/Actions/settings additions
  and the unvalidated legacy Gateway path.
- Replaced the broken asynchronous Reset with New project, preserving existing
  projects and saving through transactional IndexedDB commands. Blank/pasted DNA
  and an optional annotated synthetic example are supported.
- Replaced incomplete HTML-only Save app/Copy code with a complete application
  ZIP, checked file sizes/SHA-256, standard CRC ZIP and extraction/start instructions.
  Project data is excluded and backed up separately. Visible accessible feedback
  replaces document-title-only errors. Command palette matches the current actions.
- New regressions cover normal lifecycle/edit/undo/commit/export/reload, quota
  failure, cancellation, blank projects, removed placeholders and independently
  extracted application behavior. See `reports/2026-11-16/PRODUCT-MVP-VALIDATION.md`.
- Local verification: 281 core tests and 99 Chromium cases passed, zero failures/skips;
  complete-package extraction/offline checks, static build, Wrangler dry run and
  four Biopython reference suites passed.
- Keep PR #1 draft, main unchanged and production unpromoted. Remaining broader
  scientific/storage/security review gates stay open; this is the scoped MVP.

## Latest: exact local compound exon milestone — November 16, 2026

- Continues `dc57660`. Exact ascending local `join` ranges retain authoritative
  segments and an envelope, with an optional outer complement. Extract/translate
  spliced sequence, display real exon geometry and bounded colors, preserve segment
  metadata through edits/history, and reject erased/overlapping exons atomically.
- Direct envelope editing and compound legacy codon optimization are disabled.
  Mixed compound/wrapped edits remain refused; backbone insertion stays outside
  the complete envelope. SBOL subsets and legacy native exports refuse new data.
- Compound working/history/backbone data activates a monotonic v2 active-record
  header; DB object-store schema remains v1. A pinned historical v1 backend is
  actually tested refusing it without overwriting. Compound backup/archive/backbone
  exports use v2 and new readers accept v1/v2; no reverse migration is implemented.
- Public V00499.1 beta-globin plus 50 synthetic records pass 1,564 independent
  Biopython assertions before/after edits, including a 444-base/147-aa spliced CDS.
  Existing synthetic/pBR322/28-enzyme reference checks also pass.
- Core suite: 277 passed; full Chromium suite: 88 passed, zero failures/skips.
  Built-site smoke and 69-asset Wrangler dry run passed. Evidence is in
  `reports/2026-11-16/COMPOUND-GENBANK-VALIDATION.md`; final remote checks belong to
  the exact new head. New annotation-part budgets preserve large single-record
  GenBank imports without applying collection-only sequence-size caps.
- Remaining: fuzzy/remote/mixed/non-monotonic or complex origin-crossing grammar,
  original headers/source retention, broader datasets and scientific review,
  genome-scale virtualization/streaming, Gateway and release/cutover/rollback
  acceptance. Keep PR #1 draft and main/production protected; no full parity claim.

## Latest: reviewed archive restore and final session verification — November 15, 2026

- Continues `1666c41`. Recovery accepts bounded browser archive files through a
  separate review/acknowledgement. It validates projects and both library grammars,
  preserves exact accepted library bytes and enumerates absent-key removals.
- Before replacement, a prior-state recovery archive commits and passes read-back.
  A full/unavailable vault prevents restore without deleting copies. Final writes
  use one project/library transaction and check reviewed revision + source hash.
  Same-client writes after review, source drift and transaction failures reject.
- `part-library-text.mjs` shares the existing Builder grammar with archive review.
  Project-only backup format/limits and preserved legacy source bytes stay unchanged.
- Combined verification: **265 Node tests, 80 Chromium cases**, zero failures/skips;
  build, 67-asset Wrangler dry run, actual Primer3 (five pairs), three independent
  pySBOL3 graph validations (zero errors/warnings), existing 3,669 synthetic
  Biopython checks plus 475 real-record/CDS and 12,358 curated-enzyme assertions.
  Built distribution imported pBR322, displayed its three table-11 CDS peptides,
  and restored an archive without page errors. See `reports/2026-11-15/ROADMAP-SESSION.md`.
- Still open: compound/fuzzy/remote INSDC locations and source/header preservation;
  full editor virtualization/streaming and broader browser/device budgets; Gateway
  and chemistry/dataset acceptance; automatic reverse migration and independent
  code/scientific/cutover/release review; authenticated successful Cloudflare-log
  and branch-setting review. PR #1 stays draft, main protected, no production
  promotion. No full Genome Compiler, laboratory or clinical parity claim.

## Latest: complete UI enzyme cut audit — November 15, 2026

- Continues `107b200`. `curated-digest.mjs` models all 28 UI enzymes with explicit
  both-strand cut offsets. Legacy Analyze/cloning digest and unique-cutter paths
  now use it; the seven-enzyme modular ligation model remains separate.
- Fixed actual Type IIS bugs: BsaI/BsmBI cut outside the recognition site, reverse
  top cuts use the bottom offset, and incomplete linear cuts cannot wrap around.
  Ambiguous DNA yields an explicit unavailable diagnostic instead of exact fragments.
- Biopython 1.86 verifies all definitions and 3,118 linear/circular/origin/orientation
  vectors, 12,358 assertions. Four core and two browser regression tests pass;
  all 262 Node tests and build pass. See the curated enzyme validation report.
- No methylation, star activity, yields or laboratory success prediction is added.

## Latest: navigable bounded genome display — November 15, 2026

- Continues `7954c01`. `sequence-window.mjs` projects at most 6,000 bases with
  clipped annotation spans, without normalizing/copying the full sequence.
- Existing sequence panel adds previous/next and absolute base jump controls;
  selecting a feature opens its coordinate window. Navigation is transient and
  never persists project state. Editor text and full snapshots remain unvirtualized.
- Three core and two browser regressions cover circular clipping, invalid ranges,
  a 1 Mb write-free navigation workflow and 10 Mb persistence/reload/tail selection.
  Targeted browser cases passed; all 258 Node tests and static build passed.
- This does not raise import limits or establish whole-genome browser budgets.

## Latest: GenBank qualifier and CDS semantics milestone — November 15, 2026

- Continues `782bfd4`. GenBank retains ordered repeated strings, known valueless
  flags and selected unquoted tokens. Duplicate labels/flags, unknown tokens and
  unsupported locations still fail closed. SBOL paths refuse new unrepresentable
  qualifier forms explicitly.
- Shared `cds-semantics.mjs` handles tables 1/11, codon_start, initiation and
  supplied-translation comparison. Biological exceptions/pseudogenes/unsupported
  codes suppress peptide inference in explorer, QC and legacy displays.
  Legacy selected-CDS codon optimization now uses committed full-construct undo.
- First pinned public accession fixture: pBR322 J01749.1 (48 non-source features,
  three CDS). Biopython 1.86 checks it and 270 independent CDS vectors offline:
  475 assertions. Original header/source preservation remains outside the subset.
- Validation: 255 Node tests, 70 Chromium tests, build, existing 3,669 synthetic
  Biopython assertions and the new 475 checks pass. See `reports/2026-11-15/GENBANK-CDS-VALIDATION.md`.
- Broader compound/fuzzy/remote locations, diverse genomes, biological exceptions,
  full scientific review and the remaining release gates stay open. Draft only.

## Latest: active IndexedDB cutover — November 15, 2026

- Continued from `1d42019`. `src/core/indexed-project-storage.mjs` is now the active
  project/library backend; `project-commands.mjs` coordinates asynchronous commits.
  Bootstrap awaits initialization. The earlier localStorage driver remains as a
  historical/tested module and error type, not an automatic fallback.
- Migration copies projects and both library namespaces atomically, retains exact
  legacy bytes, and reserves a small non-genomic migration marker before cutover.
  A missing active record with that marker never silently reopens stale source.
  Interrupted migration/missing data needs explicitly reviewed recovery.
- Project/library writes use a shared revision CAS inside a readwrite transaction.
  Both multiple clients and simultaneous direct calls from one client are tested.
  UI actions are locked while saving; success/render acknowledgement is deferred.
  Consecutive synchronous legacy snapshots coalesce. Restore rejects overlapping
  actions and stale queued candidates. DNA history changes only after commit.
- Part/backbone saves await the same coordinator, retain failed editor text and
  export attempted library bytes. Archives read committed active snapshots.
  Recovery can export immutable migration source/current retained source and
  explicitly review a retained source restore. Source changes after review reject.
- Full local verification: 248 core tests, 66 Chromium browser tests and static
  build passed. See `reports/2026-11-15/INDEXEDDB-VALIDATION.md` for exact scope.
- Remaining: independent code/cutover/rollback review, automatic reverse migration,
  general archive-file restore, larger backup import limits, whole-genome browser
  budgets, broader interoperability/scientific validation. Keep PR #1 draft;
  preserve main; no production promotion without approval.

The older sections below describe earlier checkpoints; use this section and
`STORAGE.md` for the active persistence architecture.

## Takeover milestones (latest session)

### Extended-session follow-up: recovery vault and migration staging

- Additional scientific regression: core `findMotif` previously missed `N` vs `R`
  and `R` vs `M`. It now uses possible-base-set intersection, preserving the
  existing intended possible-match behavior for ambiguous sequences. Biopython
  cross-check covers all 225 code pairs and 3,375 ambiguous codons. Its B/Z/J
  aliases are explicitly normalized to Photon's documented mixed-residue X policy
  for 15 codons; report records this scope. GenBank and legacy literal-search
  support are unchanged. See `reports/2026-11-14/AMBIGUITY-VALIDATION.md`.
  Combined checks now pass 242 core tests, 54 browser tests, build and 3,669
  Biopython assertions. Separate 100 kb/1 Mb/10 Mb diagnostics completed.

- Release review follow-up fixes imported strings rendered in four HTML sinks
  (feature legend, inspector, validation warnings and tag badges). Malicious
  feature/tag backup regressions failed before fixes; three import/display cases
  now cover all four sinks. Console remains explicitly privileged user JavaScript.
- `SECURITY-REVIEW.md`, `CAPABILITY-INVENTORY.md` and `RELEASE-GATES.md` record the
  scoped threat model, evidence by capability and explicit outstanding release gates.
  These are not independent security/scientific/parity signoffs.
- Combined local verification after release-review fixes: 241 core and 54 browser
  tests passed; static build, clean Wrangler 4.162.0 dry run (60 assets) and built
  distribution startup/edit/undo/archive smoke passed. See
  `reports/2026-11-14/EXTENDED-SESSION.md`. Keep PR draft; active backend cutover and
  independent release review remain unfinished.

- Started at `3439858`. Added `project-archive.mjs`, `recovery-vault.mjs` and
  `recovery-tools.mjs`. The Recovery control copies exact main-project and known
  part/backbone-library source strings into a version-1 IndexedDB archive with
  entry hashing and read-back verification. No source keys are deleted/replaced.
- Failed saves now attempt a persistent IndexedDB recovery copy; success is
  reported only after the catalog/payload transaction commits. Reopened sessions
  offer saved attempts for download, without silently applying them. Explicit
  validated project restore remains the application path.
- Real-browser tests cover restart, aborted writes, concurrent capacity limits,
  future schema and checksum failure, and denied IndexedDB. Older copies are never
  automatically deleted at capacity; explicit per-copy deletion is confirmed.
- This is migration staging, **not the active IndexedDB backend cutover**. The UI
  still expects synchronous project saves. An asynchronous command layer and an
  atomic library/project cutover remain necessary before changing the active backend.
- Local tests: 241 core tests and 51 browser tests; see the vault verification
  report. The separate release review continues; no production promotion or merge.

### Follow-up: storage reliability

- Continue from `723cbdb0`. Main project saves now go through `project-storage.mjs`:
  semantic validation, compare-before-write against observed stored bytes, throwing
  failures and rollback to the last successful in-memory database checkpoint.
  Legacy callbacks stop before success messages. Editor undo/redo stacks change
  only after persistence succeeds.
- Startup validation preserves corrupt/unreadable stored data and shows a temporary
  demo with saving blocked. Recovery notice offers exact original bytes, or a JSON
  backup of the attempted unsaved state after a failed action. Explicit validated
  restore can replace corrupt data after confirmation. Original legacy migrations
  run only in memory until a successful save.
- `src/ui/bootstrap.mjs` initializes storage before loading the existing UI modules.
  Do not restore eager `load()/render()` calls in the inline script: they bypass
  startup validation or access uninitialized project data.
- Tests cover actual Chromium quota exhaustion on a 1 Mb construct, failed edits,
  undo history, Commit, single/collection imports, denied reads, corrupt startup,
  observed cross-tab conflicts, reload and full browser restart.
- Recovery copies are in memory, not a durable crash journal. Download before
  closing/reloading or another successful save. localStorage compare-before-write
  cannot provide atomic simultaneous-writer isolation. Part/backbone libraries
  remain separate localStorage keys with separate export/save controls.
- Next storage work: versioned IndexedDB migration, crash-persistent recovery,
  auxiliary-key migration and conflict reconciliation. See `STORAGE.md`.

- Continued from verified remote HEAD `c5af07f0`; protected `main` and retained PR #1 as draft.
- Actual Cloudflare log supplied by user: `versions upload` ran without building,
  so `dist/` was missing. Added Wrangler custom build hook and clean-build dry-run CI.
  Local verification does not establish a successful hosted upload; no production deployment executed.
- Added strict v1 backup validation before persistence, including snapshots, annotation
  intervals, branch/parent/tag references and cycle checks. Chromium covers corruption,
  cancellation, quota failure and reload persistence. Existing live-storage loading and
  legacy ignored-save failures still need recovery/migration work.
- Added GenBank wrapped prose/translation and quote escaping; fixed LOCUS columns after
  Biopython exposed topology loss. New pinned Biopython workflow checks synthetic roundtrips,
  all seven core enzymes, standard translation, reverse complement and prepared overlaps.
- Optimized explicit non-wrapped genome batches to concatenate sequence once; preserves
  sequential mapping in 300 seeded cases and a 10 Mb/1,000-edit regression. Annotation
  mapping remains O(features × edits); no browser virtualization claim.
- Local verification: 225 core tests, 35 browser tests, build, clean Wrangler dry run,
  actual Primer3, three pySBOL3 fixtures and 68 Biopython assertions passed. 100 kb/1 Mb/10 Mb
  diagnostics completed. Details and machine-readable reports: `reports/2026-11-14/`.
- The historical sections below describe the pre-takeover state; use this section,
  `ENGINEERING-REVIEW.md`, and current branch CI for subsequent work.

## 0. Canonical location / status

- GitHub: https://github.com/swaroop3000/Photon
- Development branch: `feature/photon-1-core-engine`
- Base branch: `main` — leave unchanged.
- Existing draft PR: https://github.com/swaroop3000/Photon/pull/1 — **do not merge**.
- Last verified pre-handoff implementation commit: `24e568fb7b107ae525b96adcbafc02fb4a75c59c`. This handoff document and `AGENTS.md` were added afterwards. Always check current HEAD, not the commit recorded here.
- As of the verification of the above implementation commit, all five GitHub Actions workflows **passed**: `dna-core`, `browser-smoke`, `primer3-engine`, `sbol3-interop`, `static-build`. **Cloudflare Workers Builds: photon failed**. Obtain the failing build's actual Cloudflare logs; do not guess the cause or claim deployment is fixed.
- Development has proceeded via repeated commits on this branch and PR updates; inspect Git history and PR description for chronological details.

## 1. User's objective

Build Photon as a sophisticated, independent, integrated genome/DNA design software platform, broadly aiming at the capability range of Genome Compiler while preserving its own existing look and UI. The user wants Codex to take over implementation, not to start over. Priorities: functionality, scientific accuracy, reliable editing/annotation integrity, cloning, file compatibility, performance and deployment. Do not assume all original Genome Compiler capabilities are present or independently verified. Avoid using proprietary competitor code.

## 2. Technical map

- `index.html`: existing large single-file legacy UI, local repository/version-control model, imports and exports. Keep UX intact unless changes are necessary and tested.
- `src/core/dna.mjs`: DNA normalization, reverse complement, standard genetic code, motifs, edit engine.
- `src/core/photon-adapter.mjs`: zero-based core / one-based legacy adapter, explicit batch DNA edits and history.
- `src/ui/editor-bridge.mjs`: browser event bridge and full-construct undo/redo history.
- `src/core/feature-io.mjs`: deliberately conservative GenBank single-record subset, features and circular coordinates.
- `src/core/genbank-collection.mjs`: multiple-record strict collection parser and exporter.
- `src/core/import-preflight.mjs`: conservative local-browser collection import size checks.
- `src/ui/feature-io-tools.mjs`: exposes strict GenBank and SBOL codecs to UI.
- `src/core/restriction.mjs`, `cloning.mjs`, `golden-gate.mjs`, `assembly.mjs`, `junction-check.mjs`: cloning and cut/junction operations.
- Other modules implement plasmid mapping, circular backbone, primers/Primer3 interchange, SBOL3, translation and construct QC.
- `scripts/benchmark-core.mjs`: one-size diagnostic performance timing.
- `scripts/profile-genome-scale.mjs`: separate processes at 100 kb / 1 Mb / 10 Mb, no production speed guarantees.
- `scripts/build-static.mjs`, `wrangler.jsonc`, `DEPLOYMENT.md`: asset-only Cloudflare static build configuration; deployment still not verified.
- `tests/`: Node core tests; `browser/`: Playwright browser regressions.
- `ENGINEERING-REVIEW.md`: living checklist; `FORMAT-SUPPORT.md`: file-compatibility claims; `README-ENGINE.md`: engine-specific detail.

## 3. Delivered milestones

1. A modular DNA sequence core connected to existing editor on HTTP(S), full construct snapshots for undo/redo, history isolated at repository/branch/committed-HEAD boundaries.
2. Annotation-preserving edits and explicit atomic nonoverlapping edit batches, with conservative behavior for circular origin-spanning features and complex indels. Nested annotation metadata deep-cloned to prevent aliasing.
3. Sequence analysis and scientific prototyping: reverse complement, translation, restriction maps, plasmid/feature views, cloning operations and small deterministic reference vectors. Primer3 is implemented via a local result-exchange workflow with CI testing against actual primer3-py.
4. GenBank and SBOL format support within documented limited subsets. Strict multi-record GenBank import creates separate *browser-local* Photon repositories following review and validation, not remote GitHub repositories. Browser preflight: max 100 records, 1 Mb total, 500 kb per record, 20k features. Duplicate names flagged. Unsupported grammar rejects rather than silently dropping annotations.
5. Local project safety: `Backup projects` downloads a versioned JSON snapshot of the local project database; `Restore backup` accepts a JSON file up to 20 MB with limited structural validation and explicit replacement confirmation. This is NOT a formal complete schema validator, encrypted backup, or reliable cloud storage. Multi-record import now checks localStorage writes and rolls back in-memory changes after a failed save. Other legacy save call sites may still suppress or inadequately report a failed save.
6. Deployment workflow: `npm run build` creates a minimal `dist` consisting of the HTML and browser modules. GitHub static-build CI passes. Cloudflare Workers build remains failed; examine Cloudflare actual build log/configuration, rather than assuming Wrangler config is sufficient.
7. Tests: unit suites for DNA, cloning, annotation metadata, import limits, GenBank, SBOL etc., plus browser suites for editor, import, backup/restore. All five GitHub Actions workflows passed at the last pre-handoff implementation commit, but check current head and run verification again after editing.

## 4. What remains and suggested Codex sequence

### Immediate: unblock deployment and protect browser-local data
- Read the exact Cloudflare Workers build log; determine whether the root directory, command, credentials, branch setting or Wrangler/asset config is wrong. Keep production branch stable; use preview deployment for feature work.
- Fully validate JSON backup structure and semantic invariants, avoid destructive or unverified restore, offer recoverable rollback and storage quota warnings; consider IndexedDB for larger constructs with versioned migrations. Preserve current users' data and backups.
- Strengthen import transaction and recovery behavior, including failure around localStorage quota, close/reopen persistence, and duplicate imports.

### Editing / performance
- Improve explicit multi-indel provenance instead of guessing complex alignment from free-text replacement.
- Resolve ambiguous circular origin-spanning edits only with an explicit reannotation policy.
- Virtualize large sequence editor and visual feature map, profile memory under 10 Mb/whole-genome loads, add streaming import.
- Stress-test annotation ranges, nested qualifiers and commits under large edit batches.

### Interoperability
- Broaden real INSDC/GenBank supported grammar: multi-exon joins, complement(join), fuzzy/remote locations, repeated/multiline qualifiers and translation tables. The existing feature model cannot represent all these losslessly; design an appropriate normalized AST or reject unsupported syntax explicitly.
- Validate against independently sourced records and tools such as Biopython; document exactly which variants are supported. Ensure external scientific data is legally reusable.

### Cloning / validation
- Compare curated enzyme definitions against authoritative references and test double-stranded cut/end orientation.
- Expand Gibson and Gateway support using independent fixtures; define boundaries of sequence-only simulation versus experimental chemistry.
- Establish versioned scientific reproducibility datasets, quantitative accuracy acceptance thresholds, independent review and a risk assessment. Do not make clinical or lab-grade claims before evidence.

### Product parity / release
- Create a clear independent feature inventory for the Genome Compiler capability categories and a test for each claimed parity item; keep independent implementation.
- Threat model for genomic data, backups, local browser origin storage, sharing, and deployments.
- Avoid any premature full-parity, clinical-grade or production-readiness claims.

## 5. Validation / workflow commands

```bash
npm test
npm run build
node scripts/benchmark-core.mjs 1000000
node scripts/profile-genome-scale.mjs
# Browser smoke: serve repo on localhost:8765 and install Playwright per .github/workflows/browser-smoke.yml
python3 -m http.server 8765
# In another terminal (after installing Playwright):
node --test browser/*.test.mjs
```

## 6. Branch and project safety

- Keep `main` unchanged, PR #1 draft and unmerged.
- On Codex Cloud, start from `feature/photon-1-core-engine` and branch from that HEAD if a separate task branch is required. Codex task workspace should not silently reset to `main`.
- Do not use synthetic tests alone to claim scientific validity; maintain clear "prototype" and "unvalidated" labels where appropriate.
- Do not overwrite local data or deploy production without an explicit reviewable action.
- Verify commit HEAD, CI conclusions and deployment status freshly each task. Update this document and engineering review as facts change.
