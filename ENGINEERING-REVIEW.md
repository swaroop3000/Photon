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
- [ ] Test Gibson and Gateway against independently prepared sequence fixtures.
- [ ] Chemistry-dependent assumptions (methylation, star activity, efficiency and yield) require a separate scope: simulator does not model them.

## 3. File interoperability
- [x] Existing conservative single-record GenBank parser rejects unsupported grammar.
- [x] New `parseGenbankCollection` / `serializeGenbankCollection` support multiple **individually supported** records in the core API, atomically rejecting invalid records.
- [x] Integrate bounded (100-record maximum) GenBank collection import into browser UI, validating all records first and creating one local Photon repository per record. Browser regression tests cover success and atomic parse failure.
- [x] Add conservative browser preflight size limits (100 records, 1 Mb total, 500 kb/record, 20k annotations), per-record size review and duplicate-name warning; these are not proof of localStorage quota sufficiency.
- [x] Add explicit full-browser-project JSON backup and guarded restore controls, plus import rollback on failed localStorage writes. Browser regression tests included.
- [ ] Extend collection import beyond the supported subset and provide complete provenance review and storage-quota migration.
- [ ] Complete INSDC: compound exon joins, fuzzy/remote locations, multiline and repeated qualifiers, translation tables, sequence ambiguity handling.
- [ ] Interoperability fixtures from independently validated real records and cross-checks with Biopython / INSDC tools.

## 4. Performance
- [x] Preview annotation coloring capped to visible bases.
- [x] 200 kb deterministic regression.
- [x] `node scripts/benchmark-core.mjs 1000000` measures time per operation and heap usage; no environmental assertion or performance guarantee.
- [x] Add a manual, isolated-process 100 kb / 1 Mb / 10 Mb profiling matrix (not a CI speed requirement).
- [ ] Multiple hardware/browser datasets, memory budgets, storage quotas and whole-genome workflows.
- [ ] Virtualized editor and streaming file import for multi-megabase constructs.

## 5. Scientific validation and release
- [x] Node unit tests and browser smoke tests in CI.
- [x] Small independent standard-code and restriction-site vectors.
- [ ] External reproducibility assessment, peer technical review, formal risk assessment and reference accuracy thresholds.
- [x] Add minimal static release output, a Wrangler configuration for the 'photon' Worker, deployment guide and static-build CI.
- [ ] Confirm successful Cloudflare deployment in Cloudflare build logs (GitHub Actions CI is not a deployment check).
- [ ] Threat model for user data / localStorage migration / repository sharing; localStorage is not encrypted or durable. Restore validation needs a full versioned schema and corruption recovery assessment.
- [ ] Formal original Genome Compiler feature inventory with evidence and explicit parity test per capability.

## Developer commands
- `npm test` — core unit suite.
- `node scripts/benchmark-core.mjs 1000000` — observational timing and heap report.
- `node scripts/profile-genome-scale.mjs` — optional 100 kb, 1 Mb, 10 Mb separate-process performance profiles.
- `npm run build` — minimal browser static assets to `dist/` for deployment.
- `python -m http.server 8765` — serve local UI through HTTP for ES module support.

**Release decision:** Keep draft PR open and do not merge solely because CI is green. No claim of laboratory-grade, clinical, or full Genome Compiler feature parity.
