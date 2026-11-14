# Photon engineering review — 2026-11-14

This is a **review checklist**, not a release approval. The Genome Compiler feature-comparison target remains open.

## 1. Sequence editing
- [x] Isolated DNA core; editor adapter uses zero-based, half-open coordinates.
- [x] Explicit atomic mixed indel/substitution batches; browser bridge creates one undo snapshot.
- [x] Prevent silent deletion of annotated features.
- [x] Guard undo history at branch/commit boundaries.
- [ ] Infer independent indels reliably from free-text sequence replacement (currently conservative).
- [ ] Resolve overlapping origin-spanning edits with manual, explicit feature reannotation.
- [x] Deep-copy nested feature qualifier metadata across adapter revisions, history snapshots and undo/redo; regression tested.
- [ ] Test conflicting simultaneous edit provenance and large construct persistence.

## 2. Cloning
- [x] Deterministic tests for EcoRI/PstI cut offsets, restriction-ligation and Golden Gate overhang junctions.
- [x] Add fixed additional BamHI, HindIII, EcoRV, SmaI and NotI recognition/cut/ligation reference regression vectors.
- [ ] Verify the full curated enzyme registry against an authoritative reference, including orientation and ambiguous bases.
- [x] Differential-check all seven core registry definitions, linear cut positions and overhang type/length against Biopython 1.86; check ordered prepared-fragment overlap assembly against a known synthetic target. This does not validate Gateway, enzyme chemistry, methylation or yields.
- [ ] Test Gibson and Gateway against independently prepared sequence fixtures.
- [ ] Chemistry-dependent assumptions (methylation, star activity, efficiency and yield) require a separate scope: simulator does not model them.

## 3. File interoperability
- [x] Existing conservative single-record GenBank parser rejects unsupported grammar.
- [x] New `parseGenbankCollection` / `serializeGenbankCollection` support multiple **individually supported** records in the core API, atomically rejecting invalid records.
- [x] Integrate bounded (100-record maximum) GenBank collection import into browser UI, validating all records first and creating one local Photon repository per record. Browser regression tests cover success and atomic parse failure.
- [x] Add conservative browser preflight size limits (100 records, 1 Mb total, 500 kb/record, 20k annotations), per-record size review and duplicate-name warning; these are not proof of localStorage quota sufficiency.
- [x] Add explicit full-browser-project JSON backup and guarded restore controls, plus import rollback on failed localStorage writes. Browser regression tests included.
- [x] Validate v1 backup project maps, working/historic DNA snapshots, annotation intervals, branch heads, parent references and acyclic history, tags, issues, reviews and wiki before replacement; preserve nested extension metadata. Unit regressions include a 12,000-commit DAG; Chromium covers corruption before confirmation, cancellation, quota failure, and reload persistence. No existing live-storage migration is performed.
- [x] Centralize main project persistence in `project-storage.mjs`: validate live data, throw on failed writes, restore the last successful in-memory checkpoint, and expose attempted data for download. Stage editor history only after a successful save. Fault tests cover failed Apply/Undo, Commit and single/collection imports, plus real Chromium quota exhaustion with a 1 Mb project.
- [x] Preserve corrupt/unreadable startup storage without seeding over it. Show a temporary demo with a persistent recovery notice, offer exact original-byte download when readable, and require an explicitly confirmed validated restore to replace it. Defer UI module startup until projects are initialized; missing modules fail closed.
- [x] Reject observed cross-tab changes before writing; test reload recovery and full browser-process restart persistence for working DNA, nested annotations and committed HEAD. This is compare-before-write protection, not atomic multi-tab transactions.
- [ ] IndexedDB migration and atomic simultaneous-writer coordination; persistent unsaved recovery across crashes; auxiliary part/backbone library migration; reconciliation of legacy records that fail current semantic validation.
- [x] Stage a versioned IndexedDB archive preserving exact main-project and known auxiliary-library source strings, with source-change detection, checksums and read-back verification. Active storage remains localStorage; multi-key restore/cutover is not implemented.
- [x] Persist failed-attempt recovery records with catalog/payload atomicity; verify restart/export, aborted transaction rollback, concurrent capacity enforcement, future-schema refusal, corrupt-payload rejection and unavailable IndexedDB behavior. Retention refuses new copies at capacity without deleting existing copies. Persistence is reported only after transaction completion; browser eviction/device loss remain possible.
- [ ] Extend collection import beyond the supported subset and provide complete provenance review and storage-quota migration.
- [ ] Complete INSDC: compound exon joins, fuzzy/remote locations, multiline and repeated qualifiers, translation tables, sequence ambiguity handling.
- [x] Support wrapped quoted prose/translation and doubled-quote escapes, reject unterminated/repeated qualifiers and duplicate label export, preserve quoted feature names. Fix LOCUS fixed-column fields so independent readers retain topology. General compound joins, repeated/valueless qualifiers and translation-table interpretation remain open.
- [x] Generate two synthetic GenBank records independently with Biopython 1.86 and cross-check round-trip locations, topology, qualifiers and extracted feature sequences (including reverse origin-spanning features); parser warnings fail the check. This does not satisfy the real-record dataset item below.
- [ ] Interoperability fixtures from independently validated real records and cross-checks with Biopython / INSDC tools.

## 4. Performance
- [x] Preview annotation coloring capped to visible bases.
- [x] 200 kb deterministic regression.
- [x] `node scripts/benchmark-core.mjs 1000000` measures time per operation and heap usage; no environmental assertion or performance guarantee.
- [x] Add a manual, isolated-process 100 kb / 1 Mb / 10 Mb profiling matrix (not a CI speed requirement).
- [x] Build non-wrapped explicit edit batches by concatenating unchanged segments once, avoiding full-sequence normalization/copy per edit. Preserve sequential annotation policy in 300 deterministic differential cases and a 10 Mb/1,000-edit metadata regression. Annotation mapping remains O(features × edits), wrapped edits retain the conservative path, and the browser editor is not virtualized.
- [ ] Multiple hardware/browser datasets, memory budgets, storage quotas and whole-genome workflows.
- [ ] Virtualized editor and streaming file import for multi-megabase constructs.

## 5. Scientific validation and release
- [x] Node unit tests and browser smoke tests in CI.
- [x] Small independent standard-code and restriction-site vectors.
- [x] Add pinned Biopython CI differential checks (68 assertions on deterministic synthetic inputs); keep version, seed, fixture digest and scope in the machine-readable report. Broad scientific certification remains open.
- [ ] External reproducibility assessment, peer technical review, formal risk assessment and reference accuracy thresholds.
- [x] Add minimal static release output, a Wrangler configuration for the 'photon' Worker, deployment guide and static-build CI.
- [ ] Confirm successful Cloudflare deployment in Cloudflare build logs (GitHub Actions CI is not a deployment check).
- [x] Diagnose build `81eb4a4c-fac4-454e-938c-d2e5c73cdff7` from user-supplied actual logs: upload ran without building, so `dist/` was absent. Add Wrangler custom build hook and verify clean asset generation with Wrangler 4.162.0 `deploy --dry-run` (no upload/deployment); CI repeats this check. Hosted success remains unverified.
- [ ] Threat model for user data / storage migration / repository sharing; localStorage is not encrypted or durable. Versioned backup validation and protected startup recovery are implemented; durable crash recovery and migration assessment remain open.
- [ ] Formal original Genome Compiler feature inventory with evidence and explicit parity test per capability.

## Developer commands
- `npm test` — core unit suite.
- `node scripts/benchmark-core.mjs 1000000` — observational timing and heap report.
- `node scripts/profile-genome-scale.mjs` — optional 100 kb, 1 Mb, 10 Mb separate-process performance profiles.
- `npm run build` — minimal browser static assets to `dist/` for deployment.
- `python -m http.server 8765` — serve local UI through HTTP for ES module support.

**Release decision:** Keep draft PR open and do not merge solely because CI is green. No claim of laboratory-grade, clinical, or full Genome Compiler feature parity.

## Takeover verification record

See `reports/2026-11-14/VALIDATION.md` and its adjacent JSON reports for local
results: 225 core and 35 browser tests passed; build, Wrangler clean dry run,
Primer3, pySBOL3 and 68 Biopython assertions passed. 100 kb/1 Mb/10 Mb diagnostic
profiles completed. Remote checks for the new head must be checked separately.
