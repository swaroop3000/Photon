# Active browser project storage — IndexedDB v1

Photon now uses the `photon-projects` IndexedDB database for active projects and
both known reusable-library namespaces. The existing interface is retained.
This replaces the earlier synchronous localStorage backend; the separate
`photon-project-recovery` vault remains available for recovery/archive copies.
Serve Photon through HTTPS or localhost HTTP: migration fingerprints use WebCrypto.
Storage remains specific to the browser origin; changing host, port or scheme
requires an explicit export/import rather than an automatic cross-origin move.

## Migration and source preservation

On first successful opening, Photon validates the legacy `locusPro_v1` database,
adds existing legacy defaults in memory, and copies projects plus all
`photon.parts.2.7:` / `photon.backbones.3.1:` values in one IndexedDB transaction.
Original strings are retained in migration metadata, with a source fingerprint.
No original project/library localStorage values are deleted or rewritten. Source
library strings are preserved as supplied; migration is not biological validation.

Before starting cutover, Photon reserves a small non-genomic localStorage marker:
`photon.active-indexeddb.v1:photon-projects`. This marker is deliberately retained
if migration is interrupted. A missing active record with an existing marker
requires explicit reviewed recovery; it must never silently reopen an older legacy
copy. If localStorage is already completely full, the initial marker reservation
can fail. Export the retained source, free a little space and perform reviewed
recovery. Ordinary IndexedDB saves do not grow localStorage once the marker exists.

Existing active IndexedDB data is authoritative on reopening. If IndexedDB is
unavailable, a future schema is encountered, or active data is missing/corrupt,
Photon does not automatically fall back to the retained older localStorage data.
It shows a protected temporary demo, or verified current data read-only when
possible. The normal project-backup control is disabled for a temporary demo.

Close older Photon tabs after cutover. An older application version can still
write its legacy keys because it does not understand the new backend. Observed
legacy changes block normal writes and are preserved for review. The original
migration source and current retained legacy copy can be downloaded separately
through **Recovery**. A reviewed source restore checks that the source has not
changed since review.

## Commit acknowledgement and concurrency

All main project saves pass through an asynchronous command coordinator. The
interface shows **Saving projects…** and prevents overlapping user actions while
transactions are pending. Rendering and success messages are deferred until the
backend acknowledges a commit. Consecutive synchronous legacy snapshots within
one action are coalesced to their final snapshot. On failure, queued dependent
candidates are discarded, the in-memory database returns to the last committed
checkpoint, and the failure is shown without a success acknowledgement.

DNA Apply/Undo/Redo, explicit edit batches and construct replacements update
history only after saving succeeds. Their public methods return promises; callers
must await them. Overlapping DNA API operations are refused rather than guessing
which coordinates or undo stack they should use. Part/backbone save handlers also
await commit; failed library saves retain their edited text and attempted bytes.

The active document has a monotonically increasing revision. Project and library
transactions read and compare the expected revision inside the same readwrite
transaction that commits their changes. Stale writers are rejected, including
simultaneous direct calls from one client. Library writes advance the shared
revision. This is conservative: unrelated edits from another tab still require
reload/review; there is no automatic merge or live collaboration service.

Project/library migration and combined project/library writes are atomic across
all active stores. Revision/data/cache acknowledgements occur on transaction
completion, not individual request success. Legacy source-change checks span
localStorage and IndexedDB and cannot form one atomic cross-store transaction;
old versions must be closed. A later legacy write is detected on the next check.

Programmatic callers can await `PhotonProjects.whenIdle()` for the command queue
or inspect `PhotonProjects.readSnapshot()` for a consistent committed snapshot.
`save()` returns a promise. Reading a newer snapshot does not silently advance a
stale writer's expected revision. Reload to adopt another tab's changes.

## Recovery and backups

**Backup projects** exports a committed IndexedDB snapshot using the existing
`photon/local-project-backup/1` format. **Restore backup** validates the file and
requires replacement confirmation. It rejects overlap with another pending action.
A restore cannot be followed by a stale queued snapshot that overwrites it.

If a migration was interrupted or active data disappeared, use **Recovery →
Review retained source for restore** only after reviewing/exporting the available
copies. The retained source may be older than the latest lost active data. Explicit
confirmation is required to replace projects and matching library values. Other
library keys are retained. Invalid retained project data is refused; use a valid
project backup instead. A blocked existing active record and its libraries are
preserved as repair metadata when reviewed recovery replaces them.

Failed saves offer an immediate recovery download and attempt a persistent copy
in the separate IndexedDB recovery vault. Success is reported only after that
vault transaction commits. Reopening Photon offers saved attempts for download;
they are never silently applied. Project attempts use the existing project backup
format. Failed library/combined/abandoned-command records are diagnostic formats
preserving their intended bytes; do not treat them as ordinary project backups.

**Create local archive** copies a consistent active project/library snapshot into
the recovery vault and verifies its checksum by reading it back. It exports
`photon/browser-storage-archive/1`, including known library keys. That format is
not yet accepted by the project-only Restore backup control; general multi-key
archive-file restore remains separate work. Use the existing individual library
export/import controls alongside project backups when moving data today.

The vault keeps at most five distinct archives and twenty recovery copies. It
refuses new copies at capacity without deleting old ones. Download and explicitly
confirm **Delete copy** to free room. If recovery persistence fails, download the
in-memory attempt before closing. Transaction completion does not guarantee
survival of power loss, device failure, browser eviction or cleared site data.

## Limits and rollback boundaries

This is local browser storage with no encryption, account isolation, remote
backup or clinical guarantees. Whole-project snapshots still require validation,
serialization and memory proportional to stored history size. The 1 Mb browser
regression is not a whole-genome performance or quota guarantee. Actual IndexedDB
quota exhaustion is simulated through transaction faults; the tests separately
fill real localStorage and verify active IndexedDB editing continues.

Existing project-backup import limits remain 20 MB / 500 projects. Live storage
can exceed those import limits; larger recovery/export workflows need further
engineering. Archive read limits and browser/device budgets also remain bounded.

Failure rollback and migration source retention are tested. **Automatic reverse
migration to an older software version is not implemented.** Do not switch to an
old app and assume its retained localStorage snapshot is current. Export latest
projects and libraries first; an old backend may not have sufficient quota to hold
newer data. Do not manually delete the migration marker to bypass recovery checks.
Independent cutover/rollback review and broader browser validation remain required
before release approval.
