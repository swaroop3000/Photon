# Photon engineering review — 2026-11-14

This is a **review checklist**, not a release approval. The Genome Compiler feature-comparison target remains open.

## 1. Sequence editing
- [x] Isolated DNA core; editor adapter uses zero-based, half-open coordinates.
- [x] Explicit atomic mixed indel/substitution batches; browser bridge creates one undo snapshot.
- [x] Prevent silent deletion of annotated features.
- [x] Guard undo history at branch/commit boundaries.
- [ ] Infer independent indels reliably from free-text sequence replacement (currently conservative).
- [ ] Resolve overlapping origin-spanning edits with manual, explicit feature reannotation.
- [ ] Test conflicting simultaneous edit provenance and large construct persistence.

## 2. Cloning
- [x] Deterministic tests for EcoRI/PstI cut offsets, restriction-ligation and Golden Gate overhang junctions.
- [ ] Verify curated enzyme definitions against a licensed/current reference and reverse-orientation tests.
- [ ] Test Gibson and Gateway against independently prepared sequence fixtures.
- [ ] Chemistry-dependent assumptions (methylation, star activity, efficiency and yield) require a separate scope: simulator does not model them.

## 3. File interoperability
- [x] Existing conservative single-record GenBank parser rejects unsupported grammar.
- [x] New `parseGenbankCollection` / `serializeGenbankCollection` support multiple **individually supported** records in the core API, atomically rejecting invalid records.
- [x] Integrate bounded (100-record maximum) GenBank collection import into browser UI, validating all records first and creating one local Photon repository per record. Browser regression tests cover success and atomic parse failure.
- [ ] Extend collection import beyond the supported subset, and provide a fuller per-record fidelity/size review and an explicit backup/export workflow.
- [ ] Complete INSDC: compound exon joins, fuzzy/remote locations, multiline and repeated qualifiers, translation tables, sequence ambiguity handling.
- [ ] Interoperability fixtures from independently validated real records and cross-checks with Biopython / INSDC tools.

## 4. Performance
- [x] Preview annotation coloring capped to visible bases.
- [x] 200 kb deterministic regression.
- [x] `node scripts/benchmark-core.mjs 1000000` measures time per operation and heap usage; no environmental assertion or performance guarantee.
- [ ] Multiple hardware/browser datasets, memory budgets, storage quotas and 10 Mb / whole-genome workflows.
- [ ] Virtualized editor and streaming file import for multi-megabase constructs.

## 5. Scientific validation and release
- [x] Node unit tests and browser smoke tests in CI.
- [x] Small independent standard-code and restriction-site vectors.
- [ ] External reproducibility assessment, peer technical review, formal risk assessment and reference accuracy thresholds.
- [ ] Threat model for user data / localStorage migration / repository sharing.
- [ ] Formal original Genome Compiler feature inventory with evidence and explicit parity test per capability.

## Developer commands
- `npm test` — core unit suite.
- `node scripts/benchmark-core.mjs 1000000` — observational timing and heap report.
- `python -m http.server 8765` — serve local UI through HTTP for ES module support.

**Release decision:** Keep draft PR open and do not merge solely because CI is green. No claim of laboratory-grade, clinical, or full Genome Compiler feature parity.
