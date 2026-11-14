# Photon 1.0 — modular DNA sequence engine (additive patch)

The core is integrated with the existing `index.html` interface through
`src/ui/editor-bridge.mjs` on HTTP(S). Apply/Undo/Redo use full construct snapshots;
the original UI remains in place. See `CODEX_HANDOFF.md` and
`ENGINEERING-REVIEW.md` for current verified scope and outstanding work.

## Add to repository

Run `npm test` and `npm run build` with Node.js 20+. Serve over HTTP, for example
`python3 -m http.server 8765`; module-based editing is unavailable on `file://`.

## Module API

`src/core/dna.mjs` provides `normalizeDNA`, `reverseComplement`, `gcContent`, `translate`, `findMotif`, `editSequence`, `parseFASTA`, and `toFASTA`. Imports:

```js
import { translate, reverseComplement } from './src/core/dna.mjs';
console.log(translate('ATGGCTTAA')); // MA*
```

Coordinates are zero-based and half-open. Strand is +1 or -1. DNA input is validated; `normalizeDNA` may optionally convert RNA U to DNA T. Ambiguous-base GC content counts only unambiguous A/C/G/T positions. Edits affecting feature interiors flag `affected: true` for manual review. These policies are not a complete annotation liftover model.

Core `findMotif` uses **possible-base intersection** for IUPAC codes in both the
sequence and motif: `N` can match `R`, and `R` can match `M` through their common
possible base A. A hit does not prove an exact sequence or enzyme binding. The
legacy browser literal-search widget is a separate implementation; this core
policy does not broaden that widget or GenBank's accepted DNA alphabet.

Translation resolves an ambiguous codon only when every possible codon gives the
same residue; mixed residues return `X`. Biopython's mixed-residue aliases B, Z
and J are normalized to X in the independent comparison, explicitly recorded in
the report. All 225 supported ambiguity-code pairs and 3,375 ambiguous codons are
cross-checked with pinned Biopython in `scripts/validate-biopython.py`.

## Scope limits

This is a scientific *foundation*, not a certified clinical engine. The motif finder does not model cut offsets, methylation, star activity, or ambiguous-site probabilities. Translation uses the standard nuclear genetic code, not mitochondrial or organism-specific codes.

Separate modules implement restriction cuts, supported GenBank/SBOL subsets and
conservative circular-gap edits; their contracts appear in `FORMAT-SUPPORT.md`.
Full INSDC compound features and broad scientific validation remain open. Projects
use browser-local storage with explicit backup/restore, not remote Git persistence.

`applyExplicitEdits` in `photon-adapter.mjs` accepts original-coordinate edit
batches. Non-wrapped features use `editSequenceBatch` to normalize and concatenate
the genome once; annotation mapping still costs O(features × edits). Wrapped
features use the existing conservative gap policy. Run
`node scripts/benchmark-edits.mjs 1000000 100` for an observational comparison.

## Suggested PR title

`feat(core): add independently tested modular DNA sequence engine`

This patch is intentionally additive to protect the existing application while introducing testable scientific code.
