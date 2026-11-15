# GenBank qualifiers and CDS interpretation

Continues feature head `782bfd4`; preserves the existing interface and main branch.

## Implemented scope

- Ordered repeated string qualifiers, selected unquoted tokens and known valueless
  flags survive supported GenBank import/export; source/header omissions remain
  explicit. Unsupported forms and duplicate labels/flags fail closed. SBOL
  subset exports reject qualifier arrays/flags without conversion or loss.
- Shared annotated-CDS interpretation handles tables 1/11, biological strand order,
  codon_start, alternative initiation and supplied-peptide comparisons. Other
  codes, translation exceptions, RNA editing, slippage, trans-splicing, pseudo-
  genes and general partial annotations produce a diagnostic without a computed
  peptide. Six-frame candidate discovery remains a separate standard-code scan.
- The explorer, QC, legacy inspector, selected-feature translation and protein
  stats share these checks. Codon optimization is restricted to the documented
  complete-frame forward CDS path and now awaits a full-construct undo/save entry.

## Local verification

Linux, Node 24.22.1, Chromium via Playwright 1.56.1, Biopython 1.86:

- `npm test`: **255 passed**, zero failures/skips.
- `PLAYWRIGHT_BROWSERS_PATH=/workspace/work/pw-browsers node --test browser/*.test.mjs`:
  **70 passed**, zero failures/skips (111.5 seconds on this host).
- `npm run build`: passed.
- `python scripts/validate-biopython.py`: existing **3,669 assertions** passed.
- `python scripts/validate-real-genbank.py`: **475 assertions** passed; machine
  report in `real-genbank-validation.json`. Checks exact pinned fixture digest,
  sequence, topology, all 48 non-source feature locations/qualifiers/extractions,
  three annotated CDS peptides and 270 generated CDS vectors. Parser warnings fail.
- Four new browser cases cover real import/reload, table-aware displayed results,
  biological-exception refusal in both new and legacy displays, and codon-
  optimization qualifier preservation/complete undo. Seven new Node tests cover
  lexical refusals, repeated forms, reverse codon offsets and shared QC semantics.

One public plasmid is initial real-record evidence, not broad INSDC acceptance,
independent scientific signoff, Genome Compiler parity or laboratory validation.
No production deployment, merge or user data upload was performed.
