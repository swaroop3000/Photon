# Photon 1.0 — modular DNA sequence engine (additive patch)

This patch contains *new files only* and does not modify the existing `index.html` prototype. The application UI stays exactly as it was. The new ES module is not yet wired into the UI; that migration is a separate, reviewable change.

## Add to repository

Copy the contents of this patch directory into the repository root, keeping the folder paths. Run `npm test` with Node.js 20+.

## Module API

`src/core/dna.mjs` provides `normalizeDNA`, `reverseComplement`, `gcContent`, `translate`, `findMotif`, `editSequence`, `parseFASTA`, and `toFASTA`. Imports:

```js
import { translate, reverseComplement } from './src/core/dna.mjs';
console.log(translate('ATGGCTTAA')); // MA*
```

Coordinates are zero-based and half-open. Strand is +1 or -1. DNA input is validated; `normalizeDNA` may optionally convert RNA U to DNA T. Ambiguous-base GC content counts only unambiguous A/C/G/T positions. Edits affecting feature interiors flag `affected: true` for manual review. These policies are not a complete annotation liftover model.

## Scope limits

This is a scientific *foundation*, not a certified clinical engine. The motif finder does not model cut offsets, methylation, star activity, or ambiguous-site probabilities. Translation uses the standard nuclear genetic code, not mitochondrial or organism-specific codes. No circular wraparound feature edits or multi-segment features yet. FASTA parser only, not GenBank/SBOL. No UI wiring, database, or cloud functionality is claimed.

## Suggested PR title

`feat(core): add independently tested modular DNA sequence engine`

This patch is intentionally additive to protect the existing application while introducing testable scientific code.
