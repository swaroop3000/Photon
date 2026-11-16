# Photon 2.4 — format interoperability contract

Photon is **not** currently a general-purpose standards converter.

## GenBank flat files (.gb / .gbk)

Photon's strict GenBank import supports:
- A single record with `LOCUS` length, `FEATURES`, and `ORIGIN`.
- Linear and circular DNA, A/C/G/T sequence.
- 1-based, inclusive single-base and continuous interval features.
- A reverse strand via an outer `complement(...)`.
- Exact local exon joins with 2–1,000 ascending, disjoint intervals: `join(a..b,c..d,...)`, optionally inside an outer complement. Single-base and adjacent exon parts are supported. The authoritative `segments` array stores 1-based inclusive ranges; `start/end` are its validated genomic envelope. Negative-strand extraction reverse-complements the complete concatenation, preserving biological exon order.
- Circular-origin features via exactly two intervals `join(start..length,1..end)` (optionally wrapped in `complement`).
- Quoted qualifiers such as `gene`, `product`, `note`, `label`, `locus_tag`, and other string qualifiers. Repeated values retain their per-key order as arrays of at least two strings; singleton values remain strings. Duplicate `/label` values are rejected because Photon has one display name. Wrapped prose joins with spaces; wrapped `translation` values join without whitespace. Literal quotes use INSDC doubled quotes (`""`).
- Selected unquoted forms: `codon_start` (1–3), positive numeric `transl_table`, numeric exon/intron `number`, bracketed numeric `citation`, `rpt_type` (tandem/inverted/flanking/terminal/direct/dispersed/other), and `direction` (left/right/both). Numeric values are stored as strings.
- Valueless flags: `pseudo`, `partial`, `ribosomal_slippage`, `trans_splicing`, `environmental_sample`, `metagenome_source`, `focus`, `germline`, `rearranged`, `transgenic`, `proviral`, `virion`, stored as `true`. Repeated flags are rejected.
- The `source` feature is read for source structure and deliberately omitted from the construct annotation list.

Photon rejects ambiguous or unrepresentable cases rather than silently changing meaning:
- Fuzzy positions (`<`/`>`), remote features, `order(...)`, nested/per-part complements, mixed strands, out-of-order/non-monotonic joins, overlapping exon parts and complex origin-crossing exon joins. The existing canonical two-arm origin-spanning model remains separate.
- Unknown unquoted forms or valueless flags, duplicate labels/flags, extra complex qualifier syntax and unterminated quoted values. Unsupported SBOL exports explicitly reject arrays/flags instead of stringifying them.
- Invalid sequence, incorrect declared length, and malformed annotations.
- The single-record API rejects multiple LOCUS records. The collection API and reviewed browser import support multiple individually supported records (100 records, 1 Mb total, 500 kb per record, 20,000 features and 20,000 annotation intervals in the browser). Single-record GenBank import enforces the same annotation/interval budget without imposing the collection-only sequence-size cap; unbounded-size or whole-genome acceptance is not implied.

Export writes the supported location/qualifier subset. It is not guaranteed to preserve all original GenBank headers, source metadata, quoted multiline formatting or remote feature relationships. Import is *atomic* in the file picker: rejected records leave the current construct unchanged. Imported GenBank annotations are not silently supplemented with auto-generated features.

Export now writes fixed-column LOCUS length/topology fields. Its division and date
are explicit placeholders (`UNK 01-JAN-1980`), not recovered source metadata. Feature
names and qualifier quotes are preserved rather than truncated/replaced; newline
values and duplicate `label` storage are rejected. Literal newline formatting is
not represented in the normalized feature model.

`python scripts/validate-biopython.py` with Biopython 1.86 independently generates
and reads synthetic linear/circular records, checking reverse/wrapped locations,
qualifiers, feature extraction and round trips. Parser warnings fail this check.
These two synthetic records are regression evidence for the supported subset.
`python scripts/validate-real-genbank.py` adds the pinned public pBR322 J01749.1
record: 48 non-source annotations, its three CDS peptides and 270 CDS vectors
cross-checked with Biopython 1.86 (475 assertions). See the fixture manifest for
provenance. Diverse real genomes, full INSDC support and header/source preservation
remain outstanding.

`python scripts/validate-compound-genbank.py` adds the pinned public V00499.1
beta-globin record (seven non-source features, three CDS exons, 444 coding bases,
147 amino acids) and 50 synthetic linear/circular records. Biopython 1.86 checks
locations, qualifiers, extraction and base-identity liftover before/after edits:
1,564 assertions. This is sequence/annotation evidence, not clinical validation.

### Compound editing and display policy

Maps and bounded sequence windows render exon intervals, leaving unannotated
introns uncolored. The inspector and CDS explorer extract joined sequence before
translation; reports retain segment coordinates. Direct envelope coordinate edits
and legacy codon optimization are disabled for compound features. Name, type and
whole-feature strand may still be edited. Explicit DNA edits/free-text revisions
use segment liftover; every exon follows the existing interbase interval policy.
Intronic edits do not mark an exon affected solely because they lie inside its
envelope. Exon edits are flagged for manual review. Zero-length or overlapping
resulting exons reject the whole batch. No splicing/function prediction is implied.
Mixed compound-plus-origin-spanning annotation edits remain refused; no-op text
revisions preserve them. Circular backbone insertion remains outside the complete
feature envelope and shifts all exon ranges together.

Current SBOL subsets and unversioned native bundles cannot represent the new model
safely and explicitly refuse compound export. Use GenBank for its supported subset,
or project backups/browser archives for full project metadata. Compound project
backups, browser archives and backbone libraries declare format version 2; ordinary
exports stay version 1. Both versions are read by this build, with unchanged size
limits. The active store uses a monotonic version-2 **record header** after compound
data/history/backbones are saved; IndexedDB object-store schema remains version 1.
The historical v1 backend at dc57660 rejects that header without overwriting data.
No automatic downgrade/reverse migration is provided. See STORAGE.md.

## SBOL / Photon XML

The existing `Photon-2.3` XML is **Photon-specific interchange**, using SBOL-like element names and a Photon namespace. It is **not conformant SBOL 2 or SBOL 3**. Import rejects documents not carrying this format marker.

SBOL 3 is based on the RDF data model and common encodings include RDF/XML, JSON-LD, Turtle, and N-Triples. Standards-compliant SBOL interchange requires a separate standards parser/serializer and independent validator, not merely the use of `sbol:` XML element names.

## Validation

- `npm test` runs DNA/annotation unit tests and reference-style GenBank fixtures.
- The GitHub browser smoke workflow launches Chromium and tests actual file import, non-mutating error rejection, and prior DNA editor functions.
- These automated checks do not establish broad GenBank/SBOL interoperability. Additional external roundtrips with validated reference software remain necessary.


## SBOL 3 RDF / N-Triples — Photon 2.5

Photon now provides a **separate SBOL 3 N-Triples (.nt)** import and export path. This uses standard SBOL 3 RDF classes and properties for a minimal DNA design graph:
- `sbol:Component` with DNA `sbol:type`, linear/circular Sequence Ontology role, and `sbol:hasSequence`.
- `sbol:Sequence` with IUPAC DNA encoding and `sbol:elements`.
- `sbol:SequenceFeature` annotations with linked `sbol:Range` locations.
- Ordered ranges for supported circular origin-spanning annotations, with explicit strand orientation and sequence references.
- `sbol:hasNamespace` and consistent `sbol:displayId` for top-level objects.
- Photon names, feature types, and string qualifiers may also use Photon-specific extension predicates (`https://photon.app/ns/1#`).

**Independent validation:** GitHub Actions generates an example N-Triples file, reads it using pySBOL3, and runs `Document.validate()`. Node unit tests and Chromium browser tests check internal round-trip preservation and the real import review workflow.

**Scope limitations:** Photon is not a general RDF parser. The import path supports its defined single-component DNA graph subset in N-Triples, not arbitrary SBOL 3 constructs, multiple components, externally defined hierarchies, associations, combinatorial designs, arbitrary RDF encodings (Turtle, JSON-LD, RDF/XML), or unsupported feature-location relationships. Non-Photon extension metadata and external RDF graphs may not round-trip. Full SBOL 3 compatibility remains a separate goal.

The older **Photon XML (SBOL-like)** format remains available and is intentionally labeled as *not SBOL 2*. It should not be confused with the new SBOL 3 N-Triples option.


## Photon 2.6 — Ordered multi-component SBOL 3 designs

The Builder tab includes an additive, non-destructive **SBOL 3 multi-component assembly preview**. The user supplies an ordered list of DNA parts, each with a unique ID, sequence and strand orientation. Photon creates a concatenated linear sequence and positions each part in 1-based coordinates; reverse-strand parts are reverse-complemented in the parent sequence.

The export represents each part as an SBOL 3 `Component` with its own `Sequence`, and the parent as an SBOL 3 `Component` that owns `SubComponent` features. Each `SubComponent` references its child using `instanceOf` and has a `Range` location on the parent sequence. This follows the SBOL 3 structural composition data model.

The pure core module also supports a strict multi-component N-Triples reader for the defined Photon assembly graph. An independent GitHub Actions test loads the exported graph in pySBOL3 and runs document validation, checking three child components and their locations.

**Limitations:** This is a deterministic *sequence concatenation*, not Gibson/Golden Gate chemistry or a predicted laboratory result. The Builder preview does not mutate the current Photon construct. The strict reader is not wired as a general multi-component file importer. Multi-level hierarchies, mixed molecule types, complex location relationships, external RDF syntaxes, and general multi-component interoperability remain out of scope.


## Photon 2.7 — Reusable DNA parts and nested SBOL 3 hierarchies

The **Builder** tab now includes a reusable part library. Each `part` has a stable identifier and DNA sequence. Each `assembly` references an ordered list of existing parts or other assemblies, with explicit `+` and `-` strand orientations. References may be reused in several placements, including more than once in one parent.

A reverse-oriented nested assembly is expanded with its child placement order reversed and each child orientation inverted, preserving reverse-complement sequence semantics. The resolver rejects missing references, cycles, invalid IDs, excessive nesting depth or sequence lengths, and ambiguous/unsupported sequence data.

Libraries can be saved in browser local storage scoped to the active Photon repository and branch, exported as **Photon part-library JSON**, or imported from that JSON. This is not a hosted shared library or a collaborative database; clearing browser storage can remove locally saved definitions. The Builder preview shows a colored component track, 1-based ranges, and nested reference paths without modifying the working construct.

The hierarchy exporter emits SBOL 3 N-Triples with reusable `Component` objects, linked `Sequence` objects, and `SubComponent` relationships for each direct placement. One component can be referenced by multiple instances. GitHub CI loads the hierarchy with **pySBOL3**, checks the nested references, and runs `Document.validate()`.

**Scope:** Linear, double-stranded DNA sequence concatenation; no assembly reaction chemistry, no circular assembly, no plasmid commit/snapshot integration, and no general-purpose hierarchical RDF importer yet. The available graphical track is a simple non-destructive preview rather than a drag-and-drop circuit editor.


## Photon 2.8 — Interactive visual circuit designer

The **Builder** tab now includes an interactive, non-destructive circuit designer that operates on the existing reusable Photon part library. The interface displays the direct placements of a selected assembly as cards with 1-based sequence coordinates, orientations, and lengths. Users can drag placements to reorder them, use accessible left/right buttons, reverse orientations, insert an existing part or assembly, and remove an occurrence. After each accepted operation, the plain-text library definition and visual preview are synchronized.

Edits use immutable operations that validate the entire library graph after each change. Invalid positions, missing references, circular dependency chains, and attempts to leave an empty assembly are rejected. Because references point to reusable library definitions, moving or reversing a placement does not mutate the underlying part's sequence or other instances.

**Persistence and scope:** Visual changes update the in-browser library editor only. They are persisted only after the user selects **Save part library**, and they never automatically replace the working DNA, commit to the repository, or change the existing plasmid editor. The existing JSON library and hierarchical SBOL 3 N-Triples export options remain available. This visual designer is a component-placement editor, not a biochemical assembly simulator, and it does not yet offer arbitrary canvas geometry or cloud collaboration.


## Photon 2.9 — Circuit-to-plasmid application

The Builder now offers an explicit **Review plasmid replacement** and **Apply reviewed circuit** workflow. The operation resolves a validated hierarchy into a **linear DNA construct** with a sequence, a construct name, and one 1-based inclusive `misc_feature` annotation per resolved leaf placement. Each annotation records its strand and a string note documenting its reusable-library source path.

The review compares original and replacement construct lengths and annotation counts. Applying requires a checked acknowledgment and refuses stale reviews if the library text, selected root assembly, working construct or repository/branch identity has changed since review. The in-memory DNA editor stores the full prior construct snapshot (name, topology, sequence and features), allowing the existing **Undo** and **Redo** controls to recover the original plasmid without losing its annotations or topology.

This is a **working construct replacement**, *not* a Git commit. Users must explicitly select the existing **Commit** command to create a versioned repository snapshot; the operation never automatically commits or merges.

**Important limitations:** Converted assemblies are linear; no plasmid backbone is automatically added, no circularization is inferred, and no laboratory assembly or restriction-site success is predicted. Existing features are replaced with component-placement annotations rather than automatically transferred. Although feature names, orientations, and source paths are retained, specialized feature ontology classes are not inferred from part names.


## Photon 3.0 — Circular backbone insertion with annotation preservation

The Builder includes a second, **explicitly reviewed** application mode for circular plasmids. It uses the **current circular working construct** as the backbone and inserts the selected validated linear circuit at a user-supplied **0-based interbase boundary** (0 through backbone length). The resulting working construct stays circular.

The coordinate-liftover engine preserves existing backbone features, including their names, types, strand orientations, and qualifiers. Features entirely downstream of the insertion shift by the inserted sequence length; annotated origin-spanning features retain their wrapped relationship if insertion lies in their unannotated gap. Each inserted circuit leaf becomes a 1-based inclusive strand-aware `misc_feature` annotation with source-path provenance. Insertion boundaries that split *any* backbone annotation are rejected, including circular origin junctions inside wrapped annotations. Insertion cannot exceed a 1,000,000 bp combined sequence length.

**Safety:** This path is separate from the prior linear circuit replacement. Review compares backbone, inserted circuit, annotation counts, insertion boundary and resultant length. Users must check an acknowledgement before applying. If the source circuit, insertion boundary, repository/branch or working construct changes, the reviewed operation must be reviewed again. Application participates in the full-construct Undo/Redo history; it does **not** automatically create a repository commit.

**Scientific scope:** This is an **in-silico concatenation only**. No enzymatic cut sites, ligation junction chemistry, backbone linearization reaction, overlaps, origin compatibility, selectable-marker function, reading frame, expression, sequencing verification or laboratory success are established. The initial backbone source is the current circular working plasmid; choosing a different backbone requires importing or switching the working construct first. The separate GenBank subset can round-trip the resulting construct for supported features; broader standards compatibility is not implied.


## Photon 3.1 — Saved circular backbones and junction diagnostics

The Builder's circular assembly workflow now offers a **backbone selector**. It can use the current working circular plasmid or a saved, independently validated backbone snapshot. Users can save the current circular construct by a unique backbone ID, import compatible circular GenBank flat files using Photon's conservative subset, import/export versioned Photon backbone-library JSON, and remove saved entries. Library storage is local to the browser and scoped to the Photon repository/branch; it does not create remote shared backbones or modify the working construct. GenBank files with unsupported features or qualifiers are rejected rather than silently adjusted.

The reviewed insertion displays both **top-strand insertion junctions** as left/right flanking sequences; the default flanks are 12 bases. It compares counts for Photon's curated palindromic Type II restriction recognition sites before and after insertion and lists recognition sites that span either inserted junction. All detection is **sequence motif matching**, not prediction of enzyme digestion outcomes. In particular, detecting or not detecting an enzyme motif does not demonstrate successful cloning, ligation, protein expression, biological viability, functional origins, proper reading frame, or clinical suitability.

Saved backbones are snapshots: editing the current plasmid does not change a saved backbone, and selecting a saved backbone does not replace working DNA until the user approves the reviewed operation. The confirmation guard rejects an outdated review if the selected backbone, backbone library, circuit definitions, insertion position, working construct, or active repository/branch changes. An accepted operation supports the existing full-construct Undo/Redo and does not create a repository commit.

**Restrictions:** This release supports only validated circular A/C/G/T backbone sequences and Photon's feature-coordinate subset, up to 1,000,000 bp. Insertion boundaries that split any existing annotation remain forbidden. The review currently displays curated recognition-site counts and junction motif warnings rather than a comprehensive genomic-construct QC or thermodynamic assembly analysis.


## Photon 3.2 — Construct quality control

The Builder contains a **Run construct QC** panel that analyzes the current working DNA without changing sequence, annotations, or version-control state. It displays GC fraction and A/C/G/T counts, annotated-feature problems, adjacent annotation-junction context, homopolymer runs, tandem-repeat candidates, and complete putative ATG-to-stop ORFs on the six linear reading frames. It supports a **Download QC JSON** action using the versioned `photon/construct-qc/1` schema.

Feature checks validate 1-based inclusive positions and the circular-origin `start>end` model. Annotated `CDS` regions use the declared `codon_start` and supported translation table (1 or 11) for frame, terminal stop, internal stop and supplied-peptide comparisons; non-ATG starts retain an advisory heuristic flag. Valid complete initiation codons are translated as methionine, using the declared table; a non-default codon_start is reported as partial and does not recode initiation. Reverse-strand and annotated origin-spanning CDS regions are read in their biological orientation. Other genetic codes, splice models, biological exceptions and gene function are not inferred. `/transl_except`, `/exception`, `/ribosomal_slippage`, `/trans_splicing`, `/pseudo`, `/pseudogene` and `/partial` explicitly suppress annotated-peptide inference and add an unsupported-semantics diagnostic.

Adjacent feature junctions are listed with local sequence context when contiguous annotated features touch; there is **no reference design or sequencing trace** with which to verify the actual junction. Repeats and ORFs are threshold-based candidates, not functional annotations. The six-frame ORF scan operates on the displayed linearized orientation; novel unannotated origin-crossing circular ORFs are not inferred. The report is bounded to 1,000,000 bases and 2,000 annotations, with caps on repeat and ORF findings.

**Safety:** JSON exports capture the analyzed snapshot. If the working construct or active repository/branch has changed since analysis, export is refused until QC is rerun. No cloud transfer, sequence editing, repository commit, biological fitness prediction, validation of laboratory outcomes, or clinical interpretation is performed. A report with zero warnings simply indicates no detected issues under the declared heuristics and thresholds; it is not a scientific quality certificate.


## Photon 3.3 — Six-frame translation and annotated CDS explorer

The Builder includes a **Six-frame translation explorer** with an adjustable minimum complete-ORF length. It calculates amino-acid translations for forward `+1/+2/+3` and reverse-complement `-1/-2/-3` frames, maps each displayed codon back to **1-based inclusive coordinates on the original reference sequence**, and identifies candidate ORFs from **ATG** through the first in-frame **TAA/TAG/TGA** stop codon. Frame protein previews and codon lists are bounded to 500 translated codons; the UI lists the first 100 codons per frame. Candidate ORF reporting is capped at 250 entries, with a truncation indicator. The six-frame preview uses the **standard genetic code**, and candidate ORF discovery uses a linearized sequence even for circular constructs (it does *not* discover new unannotated ORFs crossing the origin).

Annotated **CDS** features are analyzed separately in their declared strand orientation, including exact compound exon joins and circular-origin annotations supported by Photon's coordinate model. The report records translated protein, feature coordinates, start codon, peptide length, terminal stop, internal stop count, and heuristic flags for non-ATG starts, missing terminal stops, internal stops, or length not divisible by three. Invalid CDS coordinates and unsupported biological instructions are reported explicitly without a computed peptide. Reports include table, codon_start, annotated/coding lengths, supplied-peptide match and partial/mismatch flags. Legacy inspector, Analyze peptide/protein stats and codon optimization use the same checks; optimization is available only for forward, non-wrapped, complete-frame ATG CDS without a supplied-peptide mismatch, and uses full-construct undo/save acknowledgement.

**Report and safety:** The versioned **`photon/translation/1`** JSON report can be downloaded after analysis, but export is refused when the working construct or repository/branch has changed. Results do not mutate DNA, annotations, or version history. The analysis does not establish real transcription, translational efficiency, splicing, unsupported genetic codes, actual translation initiation, regulatory activity, or protein function. An absence of heuristic flags does not establish a functional gene product.


## Photon 3.4 — Real Primer3 engine (local workflow)

Photon now supports **actual Primer3 pair design** using the maintained **primer3-py 2.4.0** bindings, with a strict local JSON interchange. This integration is **not** an in-browser port of Primer3: Photon is a static browser app and does not execute Python. No DNA is sent to a remote API, server, or GitHub Action from the UI.

1. Open the **Primers** tab, configure a product length interval and select **Export Primer3 request**. This downloads `primer3-request.json` containing the **full DNA sequence** and constraints.
2. On a local computer with Python 3.9+ and the Photon repository checked out, install `python -m pip install primer3-py==2.4.0`. Consider an isolated virtual environment.
3. Run `python scripts/primer3_runner.py primer3-request.json primer3-results.json`. This executes the **real Primer3 design engine**, returning forward and reverse primer sequences, their actual Primer3 melting temperatures, product lengths, pair penalty scores, and the engine version.
4. Return to the same linear working template in Photon and select **Import Primer3 results JSON**. The UI validates the template identity, coordinates, primer matches, product size, data shape, and engine metadata before showing the candidate list and optional map markers.

The engine has a separate **Real Primer3 engine integration** GitHub Actions workflow. It installs the pinned Python dependency, runs Primer3 against a **synthetic fixture** (not user DNA), and validates the returned primer pairs with Photon. The previous **heuristic** candidate selector remains available and is explicitly distinguished from Primer3.

**Limitations:** This release requires local Python and an explicit file exchange rather than one-click browser execution; there is no unattended server request, WASM engine, global specificity analysis, reference-genome search, or guarantee of laboratory primer performance. Only linear A/C/G/T templates (40–1,000,000 bases) are supported in this handoff. Actual thermodynamic output depends on the specified Primer3 configuration and does not substitute experimental PCR validation. Imported JSON metadata is not cryptographically signed; Photon validates its internal consistency and template matches but cannot prove its origin from Primer3. Do not upload private sample sequences to third-party services without appropriate permissions.

## Curated legacy digest panel — November 15 audit

The 28-enzyme legacy Analyze/cloning digest panels now use a separate exact-ACGT
curated mapper, verified against Biopython 1.86. It records both-strand offsets
for Type II and BsaI/BsmBI Type IIS sites. Reverse Type IIS recognition uses the
bottom-strand offset to locate the forward top-strand cut. Linear sites need
both cuts strictly inside the molecule; incomplete/terminal cuts are omitted.
Circular coordinates wrap modulo length. Fragment sizes are top-strand lengths,
not duplex reaction products. Ambiguous DNA is explicitly unavailable. Unique
cutters count actual supported cuts in both orientations.

The seven-enzyme modular restriction-ligation API and map overlay retain their
existing scope. This audit does not broaden ligation chemistry or model enzyme
activity, methylation, star effects or yield. See `curated-enzyme-validation.json`
for 3,118 vectors/12,358 assertions and the validation report for regressions.
