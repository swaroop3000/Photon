# Photon — Codex handoff (November 14, 2026)

## 0. Canonical location / status

- GitHub: https://github.com/swaroop3000/Photon
- Development branch: `feature/photon-1-core-engine`
- Base branch: `main` — leave unchanged.
- Existing draft PR: https://github.com/swaroop3000/Photon/pull/1 — **do not merge**.
- Last verified pre-handoff implementation commit: `24e568fb7b107ae525b96adcbafc02fb4a75c59c`. This handoff document and `AGENTS.md` were added afterwards. Always check current HEAD, not the commit recorded here.
- As of the verification of the above implementation commit, all five GitHub Actions workflows **passed**: `dna-core`, `browser-smoke`, `primer3-engine`, `sbol3-interop`, `static-build`. **Cloudflare Workers Builds: photon failed**. Obtain the failing build's actual Cloudflare logs; do not guess the cause or claim deployment is fixed.
- Development has proceeded via repeated commits on this branch and PR updates; inspect Git history and PR description for chronological details.

## 1. User's objective

Build Photon as a sophisticated, independent, integrated genome/DNA design software platform, broadly aiming at the capability range of Genome Compiler while preserving its own existing look and UI. The user wants Codex to take over implementation, not to start over. Priorities: functionality, scientific accuracy, reliable editing/annotation integrity, cloning, file compatibility, performance and deployment. Do not assume all original Genome Compiler capabilities are present or independently verified. Avoid using proprietary competitor code.

## 2. Technical map

- `index.html`: existing large single-file legacy UI, local repository/version-control model, imports and exports. Keep UX intact unless changes are necessary and tested.
- `src/core/dna.mjs`: DNA normalization, reverse complement, standard genetic code, motifs, edit engine.
- `src/core/photon-adapter.mjs`: zero-based core / one-based legacy adapter, explicit batch DNA edits and history.
- `src/ui/editor-bridge.mjs`: browser event bridge and full-construct undo/redo history.
- `src/core/feature-io.mjs`: deliberately conservative GenBank single-record subset, features and circular coordinates.
- `src/core/genbank-collection.mjs`: multiple-record strict collection parser and exporter.
- `src/core/import-preflight.mjs`: conservative local-browser collection import size checks.
- `src/ui/feature-io-tools.mjs`: exposes strict GenBank and SBOL codecs to UI.
- `src/core/restriction.mjs`, `cloning.mjs`, `golden-gate.mjs`, `assembly.mjs`, `junction-check.mjs`: cloning and cut/junction operations.
- Other modules implement plasmid mapping, circular backbone, primers/Primer3 interchange, SBOL3, translation and construct QC.
- `scripts/benchmark-core.mjs`: one-size diagnostic performance timing.
- `scripts/profile-genome-scale.mjs`: separate processes at 100 kb / 1 Mb / 10 Mb, no production speed guarantees.
- `scripts/build-static.mjs`, `wrangler.jsonc`, `DEPLOYMENT.md`: asset-only Cloudflare static build configuration; deployment still not verified.
- `tests/`: Node core tests; `browser/`: Playwright browser regressions.
- `ENGINEERING-REVIEW.md`: living checklist; `FORMAT-SUPPORT.md`: file-compatibility claims; `README-ENGINE.md`: engine-specific detail.

## 3. Delivered milestones

1. A modular DNA sequence core connected to existing editor on HTTP(S), full construct snapshots for undo/redo, history isolated at repository/branch/committed-HEAD boundaries.
2. Annotation-preserving edits and explicit atomic nonoverlapping edit batches, with conservative behavior for circular origin-spanning features and complex indels. Nested annotation metadata deep-cloned to prevent aliasing.
3. Sequence analysis and scientific prototyping: reverse complement, translation, restriction maps, plasmid/feature views, cloning operations and small deterministic reference vectors. Primer3 is implemented via a local result-exchange workflow with CI testing against actual primer3-py.
4. GenBank and SBOL format support within documented limited subsets. Strict multi-record GenBank import creates separate *browser-local* Photon repositories following review and validation, not remote GitHub repositories. Browser preflight: max 100 records, 1 Mb total, 500 kb per record, 20k features. Duplicate names flagged. Unsupported grammar rejects rather than silently dropping annotations.
5. Local project safety: `Backup projects` downloads a versioned JSON snapshot of the local project database; `Restore backup` accepts a JSON file up to 20 MB with limited structural validation and explicit replacement confirmation. This is NOT a formal complete schema validator, encrypted backup, or reliable cloud storage. Multi-record import now checks localStorage writes and rolls back in-memory changes after a failed save. Other legacy save call sites may still suppress or inadequately report a failed save.
6. Deployment workflow: `npm run build` creates a minimal `dist` consisting of the HTML and browser modules. GitHub static-build CI passes. Cloudflare Workers build remains failed; examine Cloudflare actual build log/configuration, rather than assuming Wrangler config is sufficient.
7. Tests: unit suites for DNA, cloning, annotation metadata, import limits, GenBank, SBOL etc., plus browser suites for editor, import, backup/restore. All five GitHub Actions workflows passed at the last pre-handoff implementation commit, but check current head and run verification again after editing.

## 4. What remains and suggested Codex sequence

### Immediate: unblock deployment and protect browser-local data
- Read the exact Cloudflare Workers build log; determine whether the root directory, command, credentials, branch setting or Wrangler/asset config is wrong. Keep production branch stable; use preview deployment for feature work.
- Fully validate JSON backup structure and semantic invariants, avoid destructive or unverified restore, offer recoverable rollback and storage quota warnings; consider IndexedDB for larger constructs with versioned migrations. Preserve current users' data and backups.
- Strengthen import transaction and recovery behavior, including failure around localStorage quota, close/reopen persistence, and duplicate imports.

### Editing / performance
- Improve explicit multi-indel provenance instead of guessing complex alignment from free-text replacement.
- Resolve ambiguous circular origin-spanning edits only with an explicit reannotation policy.
- Virtualize large sequence editor and visual feature map, profile memory under 10 Mb/whole-genome loads, add streaming import.
- Stress-test annotation ranges, nested qualifiers and commits under large edit batches.

### Interoperability
- Broaden real INSDC/GenBank supported grammar: multi-exon joins, complement(join), fuzzy/remote locations, repeated/multiline qualifiers and translation tables. The existing feature model cannot represent all these losslessly; design an appropriate normalized AST or reject unsupported syntax explicitly.
- Validate against independently sourced records and tools such as Biopython; document exactly which variants are supported. Ensure external scientific data is legally reusable.

### Cloning / validation
- Compare curated enzyme definitions against authoritative references and test double-stranded cut/end orientation.
- Expand Gibson and Gateway support using independent fixtures; define boundaries of sequence-only simulation versus experimental chemistry.
- Establish versioned scientific reproducibility datasets, quantitative accuracy acceptance thresholds, independent review and a risk assessment. Do not make clinical or lab-grade claims before evidence.

### Product parity / release
- Create a clear independent feature inventory for the Genome Compiler capability categories and a test for each claimed parity item; keep independent implementation.
- Threat model for genomic data, backups, local browser origin storage, sharing, and deployments.
- Avoid any premature full-parity, clinical-grade or production-readiness claims.

## 5. Validation / workflow commands

```bash
npm test
npm run build
node scripts/benchmark-core.mjs 1000000
node scripts/profile-genome-scale.mjs
# Browser smoke: serve repo on localhost:8765 and install Playwright per .github/workflows/browser-smoke.yml
python3 -m http.server 8765
# In another terminal (after installing Playwright):
node --test browser/*.test.mjs
```

## 6. Branch and project safety

- Keep `main` unchanged, PR #1 draft and unmerged.
- On Codex Cloud, start from `feature/photon-1-core-engine` and branch from that HEAD if a separate task branch is required. Codex task workspace should not silently reset to `main`.
- Do not use synthetic tests alone to claim scientific validity; maintain clear "prototype" and "unvalidated" labels where appropriate.
- Do not overwrite local data or deploy production without an explicit reviewable action.
- Verify commit HEAD, CI conclusions and deployment status freshly each task. Update this document and engineering review as facts change.
