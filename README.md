# Photon

**Open, local-first DNA design with built-in version control.** Design plasmids and constructs visually, track every change like Git, and keep your files — no account, no lock-in, works offline.

Photon's current UI is in `index.html`; scientific modules live in `src/`. There is no build step, but sequence editing requires module loading via HTTP(S). Run a local HTTP server for fully offline work.

## Run it

- **Locally (recommended):** clone/download the full repository, run `python -m http.server 8765` from its root and open `http://localhost:8765`. Python's built-in server runs offline once the files are installed. Opening `index.html` directly with `file://` displays the legacy UI, but Apply/Undo/Redo are intentionally blocked because module loading can fail and the old sequence-only fallback could corrupt annotations.
- **On the web:** enable GitHub Pages (Settings → Pages → deploy from `main` / root) and open the published URL.

Your work is saved in the browser's local storage for the chosen origin (for example `http://localhost:8765`); changing origin will not automatically migrate stored projects. Export a `.photon.json` backup before changing how you open Photon. Export any design as FASTA, GenBank, SBOL, or a full `.photon.json` repo bundle.

## What it does

**Design studio**
- Circular and linear plasmid maps with click-to-select and an inspector (coordinates, strand, GC, translation)
- Editable sequence with find, undo/redo, and a validation shelf that flags features affected by an edit
- Auto-annotation, ORF finder, restriction sites + virtual gel, translation, protein stats, unique-cutter finder
- Primer design + virtual PCR, codon optimization, pairwise and multiple sequence alignment
- Cloning: Gibson, Golden Gate, Gateway, restriction digest
- Parts-based construct builder and a JavaScript scripting console

**Version control (GitHub-style, for DNA)**
- Repositories, branches, commits, and a repositories home + per-repo overview
- Position-based sequence diffs, compare any two commits, revert, cherry-pick, amend, rebase, stash
- Conflict-aware merge, pull requests with reviews, issues with labels/assignees/board, tags, wiki
- Commit graph and blame in Insights
- Import fidelity reports and export-loss reports with SHA-256 hashing

**Extras**
- Command palette (`Cmd/Ctrl+K`), keyboard shortcuts, light / dark / auto themes
- Built-in tutorial and interactive guided tour

## Honest scope

Photon is a front-end prototype. Everything a single scientist does locally is fully functional. The following are **deliberate mocks** because they require a backend or native runtime, and are labeled as such in the app: real remotes / push-pull, multi-user collaboration, CI/Actions, accounts, a Python binding, and an installable CLI. Some biology (merge conflict resolution, Gibson/Golden Gate/Gateway, restriction cut coordinates, pI estimation) is simplified and not intended for a lab of record.

## Roadmap

- **Now:** local design + version control (this build)
- **Phase 2:** cloud sync, shared parts registry, vendor-neutral ordering, CRISPR design, plugin API
- **Phase 3:** AI design copilot, enterprise compliance (21 CFR Part 11, SSO, audit)

## License

MIT — see `LICENSE`.
