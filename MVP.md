# Photon MVP

Use the normal application root. There is one workspace, with no presentation
mode, scripted edits or investor controls. The modern sidebar, responsive panels,
themes and live save status are the product interface.

## Working workflow

- **New project** creates an empty construct or accepts pasted DNA. **Use example**
  provides synthetic annotated DNA; it has no verified biological activity.
  Creating a project preserves existing projects. Cancel leaves unapplied text alone.
- Import supported GenBank, FASTA, Photon backups and the documented SBOL subsets.
  Inspect annotations on circular/linear maps and in the sequence/feature tools.
- Apply edits, review affected annotations and Undo/Redo full construct snapshots.
  Commit revisions, compare history and use local branches/reviews.
- Export sequence/annotations in supported formats. **Backup projects** preserves
  local history; **Recovery** includes library archives. Keep these outside the browser.
- **Download app** produces the complete static application ZIP with its modules,
  stylesheet, integrity manifest and START.txt. It contains no project data. Extract
  everything, run `python3 -m http.server 8765`, then open `http://localhost:8765/`.
  The extracted app works without internet. Direct file opening is unsupported.

Working primer, digest, assembly and circuit tools remain accessible with their
method limits. Mock Actions, Remote, Labs, collaborators and unvalidated legacy
Gateway controls have been removed. This build has local browser storage/history;
remote multi-user synchronization is future work.

## Scope

The MVP supports the documented construct editing and format subsets. It does not
establish full Genome Compiler parity, unrestricted INSDC support, chromosome-scale
readiness or laboratory/clinical validity. See FORMAT-SUPPORT.md, STORAGE.md and
ENGINEERING-REVIEW.md for the exact supported subsets and remaining work.

Main and production stay protected. Preview success does not authorize a merge or
production promotion; PR #1 remains draft until explicit review and approval.
