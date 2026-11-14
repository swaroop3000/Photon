# Versioned recovery vault / migration staging

Starting feature commit: `3439858c934d27d4b0621c83d01aa062074e600d`.

The main project backend remains localStorage. This milestone provides a
version-1 IndexedDB recovery vault and lossless staging archives for a future
asynchronous backend cutover. It does not delete source keys, promote a new
backend, or implement multi-key archive restore.

## Checks

- `npm test`: 241 passed, 0 failed/skipped.
- `node --test browser/*.test.mjs`: 51 passed, 0 failed/skipped before the separate
  import-display security milestone.
- `npm run build`: passed; new core and UI modules included in static assets.
- Four new Node checks: exact source strings, known-namespace filtering,
  project/schema/corruption rejection, deterministic hash and SHA-256 reference.
- Six new Chromium checks: archive byte preservation across browser restart;
  failed-edit recovery across restart and explicitly confirmed restore; transaction
  abort after payload write leaving neither payload nor catalog; concurrent
  retention capacity without deleting old records; future schema/corrupt payload
  rejection without reset; denied IndexedDB with continued primary behavior and
  in-memory recovery export.

The transaction-abort check aborts a real IndexedDB transaction after its payload
request succeeds, then verifies both stores are empty. The concurrent capacity
check issues eight writes and verifies exactly five archives commit, all retained
payloads are readable, and explicit deletion frees one slot. No automatic pruning.

## Operational limits

An attempted-state copy is available after its transaction completes; a process
ending before completion can lose it. A completed transaction is not a guarantee
against browser eviction, clearing site data, device failure or power loss.
No encryption, remote backup, automatic replay or automatic repair is added.
Local archive downloads contain known library source entries but are not accepted
by the older project-only Restore backup control. See `STORAGE.md` for recovery
steps, archive format and migration boundaries.

Active IndexedDB transactions for project commands, atomic simultaneous-writer
coordination, coordinated library migration and multi-key restore remain open.
