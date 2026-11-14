# Photon 2.4 — format interoperability contract

Photon is **not** currently a general-purpose standards converter.

## GenBank flat files (.gb / .gbk)

Photon's strict GenBank import supports:
- A single record with `LOCUS` length, `FEATURES`, and `ORIGIN`.
- Linear and circular DNA, A/C/G/T sequence.
- 1-based, inclusive single-base and continuous interval features.
- A reverse strand via `complement(...)`.
- Circular-origin features via exactly two intervals `join(start..length,1..end)` (optionally wrapped in `complement`).
- Single-line quoted qualifiers such as `gene`, `product`, `note`, `label`, `locus_tag`, and other simple, uniquely named string qualifiers.
- The `source` feature is read for source structure and deliberately omitted from the construct annotation list.

Photon rejects ambiguous or unrepresentable cases rather than silently changing meaning:
- Fuzzy positions (`<`/`>`), remote features, `order(...)`, non-origin `join(...)`, and other compound/multi-exon structures.
- Repeated, valueless, or multi-line qualifiers; extra complex qualifier syntax.
- Invalid sequence, incorrect declared length, and malformed annotations.
- Multiple records in one file have not yet been supported or validated.

Export writes the supported location/qualifier subset. It is not guaranteed to preserve all original GenBank headers, source metadata, quoted multiline formatting or remote feature relationships. Import is *atomic* in the file picker: rejected records leave the current construct unchanged. Imported GenBank annotations are not silently supplemented with auto-generated features.

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
