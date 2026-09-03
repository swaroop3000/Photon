# Photon

**Open, local-first DNA design with built-in version control.** Design plasmids and constructs visually, track every change like Git, and keep your files — no account, no lock-in, works offline.

Photon is a single self-contained HTML file. There is no build step and no server: open it and it runs.

## Run it

- **Locally:** download `index.html` and open it in any modern browser.
- **On the web:** enable GitHub Pages (Settings → Pages → deploy from `main` / root) and open the published URL.

Your work is saved in the browser's local storage. Export any design as FASTA, GenBank, SBOL, or a full `.photon.json` repo bundle.

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
