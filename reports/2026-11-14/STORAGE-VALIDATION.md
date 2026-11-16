# Storage reliability milestone — 2026-11-14

Starting feature HEAD: `723cbdb0fc6b77562eb0ea0537cc6c78bf68053e`.
The original interface and `locusPro_v1` project data format are retained.

## Changes

- Main project storage now validates live databases and preserves the original
  bytes on corrupt/unreadable startup. Existing legacy defaults migrate in memory
  without implicitly rewriting stored data.
- UI modules initialize after the storage driver. Unavailable modules leave
  original data untouched and project writes unavailable.
- Failed saves throw, stop success callbacks and restore the last successful
  in-memory database checkpoint. Editor undo/redo history changes only after
  saving succeeds. A persistent notice offers attempted-state recovery export.
- Corrupt startup offers original-byte download and requires an explicitly
  confirmed validated restore to replace data. A temporary demo is identified
  as such and its regular project-backup control is disabled.
- Compare-before-write refuses observed newer data from another tab. It is not
  an atomic simultaneous-writer lock.

## Verification

Linux / Node v24.22.1 / Playwright 1.56.1 Chromium, HTTP port 8765:

| Check | Result |
| --- | --- |
| `npm test` | 237 passed, 0 failed/skipped (12 new storage-driver cases) |
| `node --test browser/*.test.mjs` | 45 passed, 0 failed/skipped (10 new storage cases) |
| `npm run build` | Passed |
| Clean-source Wrangler 4.162.0 `deploy --dry-run` | Passed; build hook generated missing assets; no upload/deployment |
| `node scripts/benchmark-core.mjs 1000000` | Completed; diagnostic only |
| `git diff --check` | Passed |

Browser regressions cover malformed JSON, invalid branch heads, exact raw data
download, confirmed restore/reload, denied startup reads, failed Apply/Undo with
history retry, failed Commit with attempted-head recovery, failed single/collection
imports, two-tab conflict/reload, missing storage module and a full browser-process
restart preserving working DNA, nested annotations and committed HEAD.

The quota test fills **real Chromium localStorage** in an isolated profile until
it refuses growth, then verifies a 1 Mb project survives a failed edit. After the
test frees space, retry persists and reloads correctly. Injected exceptions also
verify failures without depending on the host's quota size. These tests do not
simulate power failure, disk corruption during browser shutdown or forced process
termination during a write.

## Boundaries

Recovery of attempted state is in memory until downloaded. Only the latest
serializable failed attempt is retained, and a later successful action clears
the notice; it does not replay the failed action. No persistent crash journal,
automatic data repair, encryption, remote sync or IndexedDB migration is added.
localStorage's one-key write is atomic, but compare-before-write cannot eliminate
the narrow simultaneous-writer race. Validation, serialization and the rollback
checkpoint use memory/work proportional to the project/history database.

Part/backbone libraries remain separate keys and use their own save/export paths.
Previously accepted data that fails semantic validation is preserved for recovery
rather than rewritten. See `STORAGE.md` for recovery steps and remaining migration
work. Full INSDC/scientific/product parity blockers remain unchanged.

PR #1 must remain draft. No merge or production version promotion is authorized.
Current-head remote CI should be verified separately and recorded on the PR.
