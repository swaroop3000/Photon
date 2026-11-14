# Photon independent capability inventory

This inventory describes Photon source and regression evidence. It is not an
exhaustive historical Genome Compiler specification, competitive parity audit or
laboratory validation. No original Genome Compiler specification was retrieved
for this session; equivalence remains unassessed for every row below.

| Capability | Current status / evidence | Missing acceptance work |
| --- | --- | --- |
| DNA edits and annotation liftover | Supported conservative subset; `tests/photon-adapter.test.mjs`, `tests/editor-batch.test.mjs`, browser smoke | Explicit reannotation for overlapping circular arms; reliable complex free-text indel inference |
| Commit/branch/undo workflows | Browser-local implementation; commit-boundary and complete-snapshot browser regressions | Independent review of legacy merge/rebase/stash semantics; persistent undo/stash scope |
| Circular plasmid maps | Core maps, wrapped feature rendering; map/feature/circular tests | Dense-feature virtualization, accessibility and whole-genome interaction budgets |
| Large explicit DNA batches | 10 Mb/1,000-edit regression and 300 seeded mapping comparisons | Virtualized browser editor, streaming import and realistic performance/memory acceptance thresholds |
| Sequence analysis | Standard table-1 translation, reverse complement, core IUPAC possible-hit motifs and advisory QC; DNA/translation/QC tests and synthetic Biopython checks including all 225 code pairs / 3,375 ambiguous codons | Legacy literal-search widget is separate; additional translation tables, real reference datasets and independent accuracy review remain open |
| Restriction cloning | Seven curated palindromic Type II enzymes; cloning/restriction tests and synthetic Biopython cut comparisons | Authoritative registry audit, ambiguous/oriented/chemistry-dependent cases and laboratory scope |
| Golden Gate | Ordered sequence-only overhang assembly; `tests/golden-gate.test.mjs` | Broader independent prepared-fragment fixtures and chemistry assumptions |
| Gibson/overlap assembly | Ordered prepared-sequence overlap simulation; assembly tests and synthetic target comparison | Independent experimental/reference fixtures and biological reaction modeling limits |
| Gateway | Legacy simplified prototype | Independent sequence fixtures, biologically valid att-site recombination model and review; do not claim verified Gateway support |
| Primers | Heuristics plus explicit local real-Primer3 file exchange; pinned Primer3 CI | One-click engine integration, genome-wide specificity and experimental validation |
| GenBank | Documented conservative subset, collections, wrapped quoted qualifiers and synthetic Biopython round trips | Compound/fuzzy/remote locations, repeated/valueless qualifiers, complete source/header preservation and real records |
| SBOL | Defined N-Triples graph subsets, pySBOL3 validation and browser review flows | General RDF encodings/graphs, broad external interchange and metadata preservation |
| Reusable parts/circuits/backbones | Part hierarchy, interactive placement and reviewed construct application; library/circuit/backbone tests | General circuit canvas, richer ontology inference and independent biological functionality validation |
| Project storage | Validated localStorage checkpoints, recovery notices, real-quota/restart tests | Active asynchronous IndexedDB command/backend migration and atomic multi-writer coordination |
| Recovery and migration staging | Versioned IndexedDB vault; exact-byte archives including known library keys; atomicity/restart/retention tests | Active backend cutover, coordinated multi-key archive restore, broader browser/device failure validation |
| Remote collaboration | UI mock; no remote repository synchronization service | Authenticated backend, access control, conflict resolution and sharing threat model |
| Labs previews | CRISPR PAM scanning and small local demonstrations coexist with explicitly marked mocks | Validated off-target analysis; NGS/Sanger/phylogenetic pipelines; ordering/cloud-sync integrations |
| Scientific/release assurance | Regression suites, small independent software comparisons, scoped security review | External reference datasets, independent review, quantitative thresholds, formal sensitive-data scope and release approval |

The legacy UI may show controls for prototype/mock capabilities. Presence of a
control or a green software test is not a biological accuracy or parity claim.
`FORMAT-SUPPORT.md`, `STORAGE.md`, `SECURITY-REVIEW.md` and `ENGINEERING-REVIEW.md`
define the current support boundaries. A future parity claim needs a sourced
historical requirement, a defined acceptance test, evidence and reviewer signoff
for each claimed capability.
