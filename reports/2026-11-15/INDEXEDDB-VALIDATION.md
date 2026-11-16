# Active IndexedDB cutover — November 15, 2026

Starting feature HEAD: `1d4201909f314d1c4228710b5adedd610e4af9c6`.
Backend/command milestone: `eeda152`; the following UI milestone enables it.
Both milestones were verified together on the final implementation state.

## Implemented behavior

- Active projects and known part/backbone libraries move to `photon-projects`
  IndexedDB v1. Source strings are retained in migration metadata and their original
  localStorage keys. Migration commits project, library and source records together.
- A small non-genomic localStorage marker is reserved before migration. Missing
  active data with that marker never silently reopens a stale legacy copy.
  An interrupted cutover requires reviewed retry/restore rather than automatic
  fallback. Marker reservation can fail if legacy storage is already completely full.
- UI save requests are serialized; consecutive synchronous legacy snapshots coalesce.
  Saving blocks overlapping user actions and defers rendering/success feedback.
  Failure restores the last committed checkpoint and retains attempted data.
- Project and library writes use expected-revision comparison inside the readwrite
  transaction. Same-client and multi-client races are covered. Reads do not silently
  adopt a new revision for an old writer. There is no automatic conflict merge.
- Library handlers and DNA history await commit. Failed library text remains in
  its editor and recovery payload. Overlapping DNA API calls are explicitly refused.
- Consistent active snapshots drive backups/archives. Retained-source review can
  restore project/library data only after confirmation, with a source-change guard.
  A stale command queued during restore cannot overwrite the restored state.

## Local verification

Linux, Node v24.22.1, Playwright 1.56.1 Chromium:

| Check | Result |
| --- | --- |
| `npm test` | 248 passed, 0 failed/skipped |
| HTTP browser suite | 66 passed, 0 failed/skipped |
| `npm run build` | Passed |
| Clean-source Wrangler 4.162.0 `deploy --dry-run` | Custom build produced 62 assets; no upload/deployment |
| Built distribution, separate HTTP port 8766 | Active IndexedDB, persisted Apply/Undo, archive read-back and absence of legacy-project writes passed; 0 page errors |
| `node scripts/benchmark-core.mjs 1000000` | Completed; diagnostic only |
| `git diff --check` | Passed |

Six new Node command tests cover delayed acknowledgements, immutable snapshots,
failure rollback/queue cancellation, sequential project/library barriers, failed
serialization, restore exclusion and coalescing. Twelve new Chromium backend/UI
cases cover real legacy migration, exact source/library bytes, restart, aborted
migration, reviewed retry, combined-write abort, same-/multi-client CAS, legacy
drift/stale review, future schema, missing/unavailable active data, library retry,
success timing and overlapping DNA API rejection.

Existing tests now wait for asynchronous acknowledgements and inspect committed
IndexedDB data. Failure injection targets active IndexedDB transactions, not
localStorage setters. The real localStorage-quota test now verifies a full legacy
store does not prevent a 1 Mb IndexedDB edit. Actual IndexedDB hardware quota
exhaustion is not measured; failure/rollback uses real transaction aborts and
injected quota errors. The previous localStorage backend retains its own unit tests.

## Remaining acceptance work

The implementation is not independent release approval. Review the cutover and
rollback procedure, remaining legacy merge/rebase/stash/import paths and broader
browser/device behavior. Automatic reverse migration and general multi-key archive
file restore remain unfinished. Do not assume an older app's retained localStorage
copy contains newer IndexedDB edits; export current projects and libraries first.

The active backend still serializes whole project/history snapshots. Existing
20 MB / 500-project backup-import caps remain, and may be smaller than active data.
Whole-genome virtualization, streaming/recovery budgets, wider file interoperability,
scientific acceptance and full capability parity remain open. No clinical, encrypted
or remote collaboration repository is provided.

Keep PR #1 draft and main unchanged. Current-head remote workflows must be checked
separately and recorded on the PR. No production promotion is authorized.
