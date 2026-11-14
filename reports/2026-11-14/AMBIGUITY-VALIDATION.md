# Scientific software regression: IUPAC ambiguity

Starting implementation: `cc9fd73334b0c709103bd9b304b03d0760feec3b`.

The modular motif finder accepted ambiguity in sequence and pattern but compared
code characters rather than the represented possible-base sets when both were
ambiguous. Before repair, `findMotif('N','R')` and `findMotif('R','M')` both returned
no hits. They now return a possible hit because their sets intersect. A precomputed
four-bit mask avoids allocating sets for every position in a long scan.

This is a **possible-match** policy, not evidence of an exact base or enzyme
binding. The strict restriction-site mapper, legacy literal-search widget and
GenBank accepted alphabet are unchanged. No uncertainty is silently converted
into a definite molecular outcome.

## Independent software comparison

Pinned Biopython 1.86 provides the IUPAC definitions and translation reference:

- All 225 sequence/pattern pairs over the 15 supported ambiguity codes.
- All 3,375 three-base ambiguous codons under standard table 1.
- Reverse complement of the full supported ambiguity-code string.
- The earlier two synthetic GenBank records, seven core enzymes and prepared
  sequence-overlap fixture continue to pass.

Biopython returns B, Z or J for some mixed N/D, Q/E or I/L outcomes. Photon documents
mixed-residue results as X. The comparison explicitly normalizes those three
reference aliases to X for **15 codons**; other outcomes compare directly. This
preserves the existing Photon contract rather than claiming letter-for-letter
equivalence where the amino-acid alphabets differ.

`ambiguity-biopython.json` records **3,669 passing assertions**, fixture digest,
seed, tool version, pair/codon counts and the alias policy. The accompanying
1 Mb core benchmark is diagnostic only. Additional translation tables, real-record
datasets, laboratory experiments and formal scientific acceptance remain open.

## Combined implementation checks

- `npm test`: **242 passed**, 0 failed/skipped.
- HTTP browser suite: **54 passed**, 0 failed/skipped.
- `npm run build`: passed.
- Independent Biopython check: **3,669 assertions passed** under the explicit
  mixed-residue alias policy above.
- Separate 100 kb / 1 Mb / 10 Mb core diagnostic processes completed; report in
  `ambiguity-genome-profile.json`. These are not browser timings, memory budgets
  or performance acceptance thresholds.

Keep PR #1 draft. Check the exact pushed commit's CI before review; do not merge
or promote production without explicit approval.
