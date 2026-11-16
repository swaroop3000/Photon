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
- [x] Verify all 28 legacy UI enzyme definitions and 3,118 exact-ACGT digest vectors against Biopython 1.86, both Type IIS orientations, terminal-cut refusal and circular-origin rotations (12,358 assertions). Repair legacy BsaI/BsmBI offsets and prevent linear cut wrapping.
- [ ] Broader ambiguous-recognition/sequence policies and chemistry validation; the curated exact-ACGT path refuses ambiguous DNA explicitly. The separate seven-enzyme ligation model is unchanged.
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
- [x] Active IndexedDB project/library cutover with asynchronous command acknowledgements, atomic migration/write rollback and revision CAS, including same-client races. Original legacy strings are retained; missing active data cannot silently reopen older source. Explicit reviewed source retry checks for changes after review. See the November 15 validation record.
- [x] Validated browser archive-file restore with project/library semantic checks, reviewed revision/source hashes, exact library bytes, absent-key removals, committed/read-back prior-state recovery and atomic replacement. Regression tests cover cancellation, invalid libraries, stale reviews, write failures, reload and a full vault.
- [ ] Independent cutover/rollback review; automatic reverse migration, reconciliation of records that fail semantic validation and broader browser/device failure acceptance.
- [x] Stage a versioned archive preserving exact project/library source strings, with checksums and read-back verification. Archives now read committed active IndexedDB snapshots; validated archive-file restore now has a separate explicit review/acknowledgement and atomic project/library replacement path.
- [x] Persist failed-attempt recovery records with catalog/payload atomicity; verify restart/export, aborted transaction rollback, concurrent capacity enforcement, future-schema refusal, corrupt-payload rejection and unavailable IndexedDB behavior. Retention refuses new copies at capacity without deleting existing copies. Persistence is reported only after transaction completion; browser eviction/device loss remain possible.
- [ ] Extend collection import beyond the supported subset and provide complete provenance review and storage-quota migration.
- [x] Exact ascending disjoint local exon joins on either strand: authoritative segment model, spliced extraction/CDS, exon map/window rendering and conservative segment liftover. Reject erased/overlapping exons atomically; preserve nested metadata/undo. Numeric /number qualifiers support the pinned beta-globin record.
- [x] Compound active-record/file format fences, historical-v1-backend refusal, version-2 archive restore and failed-upgrade rollback. Unsupported SBOL/native exports refuse instead of flattening.
- [ ] Complete INSDC: fuzzy/remote/mixed-strand/non-monotonic or complex origin-crossing locations, broader translation tables, sequence ambiguity handling and original header/source preservation.
- [x] Support wrapped quoted prose/translation and doubled-quote escapes, reject unterminated qualifiers and duplicate label export, preserve quoted feature names. Fix LOCUS fixed-column fields so independent readers retain topology. General compound location grammar beyond exact ascending local joins and broader INSDC semantics remain open.
- [x] Generate two synthetic GenBank records independently with Biopython 1.86 and cross-check round-trip locations, topology, qualifiers and extracted feature sequences (including reverse origin-spanning features); parser warnings fail the check. This does not satisfy the real-record dataset item below.
- [x] First pinned public real-record fixture: pBR322 J01749.1; independently compare all 48 non-source annotations, qualifiers and extracted sequences, three CDS peptides and 270 table-1/11 vectors with Biopython 1.86 (475 assertions). This is one plasmid, not broad dataset acceptance.
- [x] Preserve repeated string qualifiers in order, selected unquoted tokens and known valueless flags; explicit refusal on unrepresentable SBOL export. Interpret CDS codon_start/tables 1 and 11 consistently across explorer, QC and legacy displays, with no computed peptide for unsupported biological instructions.
- [x] Add pinned public V00499.1 beta-globin and 50 seeded synthetic compound records; Biopython 1.86 checks import/export, per-feature extraction and base-identity liftover before/after edits (1,564 assertions). Public CDS splices 444 bases into the annotated 147-aa peptide.
- [ ] Diverse real-record/genome dataset, independent scientific review, broader translation tables and complete source/header preservation.

## 4. Performance
- [x] Preview annotation coloring capped to visible bases.
- [x] 200 kb deterministic regression.
- [x] `node scripts/benchmark-core.mjs 1000000` measures time per operation and heap usage; no environmental assertion or performance guarantee.
- [x] Add a manual, isolated-process 100 kb / 1 Mb / 10 Mb profiling matrix (not a CI speed requirement).
- [x] Build non-wrapped explicit edit batches by concatenating unchanged segments once, avoiding full-sequence normalization/copy per edit. Preserve sequential annotation policy in 300 deterministic differential cases and a 10 Mb/1,000-edit metadata regression. Annotation mapping remains O(features × edits), wrapped edits retain the conservative path, and the browser editor is not virtualized.
- [ ] Multiple hardware/browser datasets, memory budgets, storage quotas and whole-genome workflows.
- [x] Navigable bounded sequence display (6,000 bases/window), absolute-coordinate jump and feature selection; no project writes on navigation. Chromium exercises 1 Mb navigation and 10 Mb save/reload/final annotation.
- [ ] Full editor virtualization, incremental snapshots/diffs and streaming file import for multi-megabase constructs; bounded display alone does not complete this gate.

## 5. Scientific validation and release
- [x] Node unit tests and browser smoke tests in CI.
- [x] Small independent standard-code and restriction-site vectors.
- [x] Fix modular IUPAC motif matching when both sequence and pattern are ambiguous; match by possible-base intersection. Differential-check all 225 supported code pairs and 3,375 ambiguous codons against Biopython, with explicit B/Z/J → Photon X mixed-residue policy (15 codons). No enzyme-binding, full INSDC or legacy search-widget claim is added.
- [x] Add pinned Biopython CI differential checks (68 assertions on deterministic synthetic inputs); keep version, seed, fixture digest and scope in the machine-readable report. Broad scientific certification remains open.
- [ ] External reproducibility assessment, peer technical review, formal risk assessment and reference accuracy thresholds.
- [x] Add minimal static release output, a Wrangler configuration for the 'photon' Worker, deployment guide and static-build CI.
- [ ] Confirm successful Cloudflare deployment in Cloudflare build logs (GitHub Actions CI is not a deployment check).
- [x] Diagnose build `81eb4a4c-fac4-454e-938c-d2e5c73cdff7` from user-supplied actual logs: upload ran without building, so `dist/` was absent. Add Wrangler custom build hook and verify clean asset generation with Wrangler 4.162.0 `deploy --dry-run` (no upload/deployment); CI repeats this check. Hosted success remains unverified.
- [ ] Threat model for user data / storage migration / repository sharing; localStorage is not encrypted or durable. Versioned backup validation and protected startup recovery are implemented; durable crash recovery and migration assessment remain open.
- [x] Initial origin/storage/import/console/export threat assessment in `SECURITY-REVIEW.md`; reproduce imported feature-type markup execution in an isolated profile and escape four identified display sinks (legend, inspector, annotation warning, tag badge). Real backup-import regressions preserve strings as literal text. Independent full rendering audit and response-policy design remain open.
- [ ] Formal original Genome Compiler feature inventory with evidence and explicit parity test per capability.
- [x] Add independent Photon capability inventory with per-category software evidence and open acceptance work. Historical Genome Compiler equivalence is explicitly unassessed; sourced original requirements and per-claim parity acceptance remain open. `RELEASE-GATES.md` separates candidate review, main merge and production approval.

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

Extended-session follow-up: 241 core and 54 browser tests passed, including real
IndexedDB atomicity/restart/retention and imported-markup safety cases. Static build,
60-asset clean Wrangler dry run and built-distribution edit/undo/archive smoke passed.
See `reports/2026-11-14/EXTENDED-SESSION.md`; these are bounded software checks.

IUPAC follow-up: 242 core / 54 browser tests, build and 3,669 Biopython assertions
passed, including 225 code pairs and 3,375 codon patterns with the documented
mixed-residue alphabet policy. Updated diagnostic matrix is recorded alongside
`AMBIGUITY-VALIDATION.md`. Real-record and laboratory acceptance remain open.

November 15 active-storage milestone: 248 core / 66 Chromium browser tests and
static build passed. New checks cover atomic cutover, source-byte retention,
same-/multi-client revision races, failed combined writes, migration interruption,
missing active data, reviewed recovery, library retry and acknowledgement timing.
See `reports/2026-11-15/INDEXEDDB-VALIDATION.md`. This does not approve main merge.
