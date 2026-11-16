# Exact local compound GenBank locations — November 16, 2026

Continues feature head `dc576600eb7d94d1d3b1e802e832d3d78463a4bf`; retains the
existing UI and main branch. This is a bounded interoperability/editing milestone.

## Supported model and conservative boundaries

An optional authoritative `segments` array represents 2–1,000 ascending, disjoint,
exact local exon intervals, with one strand on the whole feature. Its `start/end`
fields are checked against the envelope. Adjacent and single-base parts are valid;
per-part flags/strands are refused. Canonical two-arm circular-origin features keep
their original representation. Mixed/nested strand grammar, fuzzy/remote/order and
non-monotonic or general origin-crossing exon joins remain unsupported.

Extraction concatenates exon intervals before whole-feature reverse complement.
Translation/QC use spliced CDS; map and bounded sequence displays draw/color the
actual exons. The inspector and explorer show joined coordinates. Direct envelope
coordinate changes and legacy compound codon optimization are disabled. Feature
name/type/whole-feature strand edits preserve segments. QC overlap/adjacency
statistics explicitly exclude compound/wrapped features; spliced CDS checks remain
available. These calculations do not infer actual biological splicing/function.

Explicit edits and free-text revisions flatten intervals for existing zero-based
edit mapping, then reconstruct/validate complete features and nested metadata.
Intronic changes can shift downstream exons without changing their extracted
sequence; exon edits are marked for review. Erased/overlapping resulting exons
reject the complete batch. Mixed compound-plus-wrapped annotation editing remains
refused. Backbone insertion stays outside the entire compound envelope and shifts
all segments. Unsupported low-level core/SBOL paths refuse instead of flattening.

## Persistence and downgrade compatibility

Compound data in working/history/backbone snapshots activates the monotonic active
record header `/2` in the same transaction; the IndexedDB object-store schema stays
at version 1. A pinned, unmodified historical v1 backend is loaded in Chromium,
with relative imports rebound to compatible dependencies. Its old header/write
logic must reject the real v2 record and preserve data. This is a backend-boundary
test, not validation of every historical app version. Original legacy source stays
retained and may be older than active projects.

Compound project backups, browser archives and backbone libraries export `/2`;
plain data stays `/1`. New code reads both. Exact compound archive restoration is
covered in Chromium. Legacy unversioned native exports and unsupported SBOL exports
are refused; GenBank/full backups/archives remain the supported paths. No automatic
reverse migration is introduced. These changes require release/cutover review.

## Independent evidence

`python scripts/validate-compound-genbank.py` with Biopython 1.86 passes **1,564
assertions** across **51 records** and original/edited phases. The unmodified public
V00499.1 beta-globin fixture has seven non-source features, a three-exon 444-base
CDS and its annotated 147-aa peptide. Source URL/digest are pinned separately.
Fifty seeded synthetic records cover both strands, circular/linear molecules,
adjacent and single-base exons and exon boundaries across reading frames. Expected
liftover tracks surviving base identities rather than copying Photon formulas.
Parser warnings fail the comparison. No online reference fetch is needed in CI.

Existing Biopython checks also pass: 3,669 synthetic, 475 pBR322/CDS and 12,358
curated-enzyme assertions. Public references are not user/clinical sample data.
Original GenBank headers/source features remain deliberately outside export scope.

## Local verification

Linux, Node 24.22.1, Chromium through Playwright 1.56.1:

- `npm test`: **277 passed**, zero failures/skips. Twelve new core cases cover
  grammar/projections, extraction, liftover/undo, refusals and versioned exports.
- `node --test browser/*.test.mjs`: **88 passed**, zero failures/skips;
  148.7 seconds on this host. Eight new cases cover real import/render/peptide/reload, direct edit safeguards,
  explicit edit/undo/backup, failed format upgrade, historical-backend refusal,
  saved-backbone fencing, v2 archive restore, 1 Mb single import and excessive
  annotation-part rejection before replacement.
- Static build and Wrangler 4.162.0 dry run passed with 69 assets; no upload/deploy.
- Built distribution on localhost 8766 passed three-exon import/render/CDS,
  intronic edit/undo and v2 archive restore with zero page errors. The final built distribution also passed a 1 Mb single-record GenBank import
  with zero page errors; final packaging passed again with 69 assets.
- 1 Mb diagnostic benchmark completed; adjacent JSON is observational, not a
  hardware/browser performance acceptance threshold.

Broader INSDC grammar, diverse datasets, full editor virtualization/streaming,
Gateway/chemistry validation, independent scientific/code/storage/release review
and authenticated Cloudflare build-log/branch-setting review remain open. Keep
PR #1 draft and main unchanged; no production promotion or full parity claim.
