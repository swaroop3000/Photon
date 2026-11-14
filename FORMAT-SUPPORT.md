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
