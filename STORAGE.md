# Browser project storage and recovery

Photon continues to use the existing `locusPro_v1` localStorage key. This milestone
does not change its on-disk JSON format, origin, project IDs or UI layout. A storage
notice is added when a project cannot be loaded or saved.

## Versioned archive and persistent recovery

**Recovery → Create local archive** copies saved projects plus all keys with the
known `photon.parts.2.7:` and `photon.backbones.3.1:` prefixes into a version-1
IndexedDB vault. It preserves each source string exactly, checks the project
schema and a SHA-256 digest, and reads the archive back before reporting success.
Unrelated application keys, theme and tutorial preferences are excluded. No
localStorage values are removed or rewritten by this copy.

This is a **migration staging archive**, not a switch of the active project backend.
The existing synchronous UI still saves projects to localStorage. A safe active
IndexedDB migration requires asynchronous command transactions and a coordinated
cutover for the auxiliary libraries. That work remains open.

Failed project saves now also attempt to store their recovery copy in IndexedDB.
The notice says **Recovery copy saved on this device** only after the catalog and
payload transaction completes. After reopening Photon, **Review recovery** offers
the saved attempt for download; it never automatically applies it to projects.
Use the existing confirmed **Restore backup** workflow to apply a valid recovered
project backup. Original corrupt storage copies are downloadable diagnostic bytes.

If IndexedDB is denied, full, blocked or unavailable, main project saving retains
its current behavior and in-memory recovery download remains available. A failure
notice reports that persistent recovery could not be saved. A tab/process ending
before the recovery transaction commits can still lose the attempted-state copy.
Browser eviction, clearing site data and device failure can remove both stores;
export files for a separate backup. Transaction completion is not a power-loss
durability guarantee.

The vault retains at most five distinct archives and twenty distinct recovery
records. It refuses new distinct copies at capacity, keeping existing copies
intact. Download and explicitly **Delete copy** to free space. Each deletion
requires confirmation and changes only that saved copy, never current projects.
No automatic pruning occurs. Repeated identical attempts in one session deduplicate.
Archived auxiliary values are opaque source copies; their validity is not inferred.

Archive downloads use `photon/browser-storage-archive/1` and contain projects plus
library source entries. They are not the older project-only backup format and are
not yet accepted by **Restore backup**. Multi-key archive restore must be designed
as part of the coordinated migration; export individual libraries with their
existing controls for today's import workflows. Do not delete live storage based
solely on an archive copy.

## Opening projects

The app reads and validates working snapshots, annotations, branches and history
before initializing the existing UI modules. Existing legacy defaults are added
in memory; opening a valid existing database does not rewrite it. A new empty
profile seeds a demo through one validated write.

Malformed JSON, invalid references or denied reads never cause a demo to replace
the existing stored value. Instead, a temporary demo is displayed with saving
blocked. **Download original stored data** preserves the exact original bytes
when they were readable. This raw diagnostic file is not necessarily a valid
Photon backup; do not assume it can be restored without repair. The regular
project backup control is disabled to avoid exporting the temporary demo as if
it were the recovered projects.

Use **Restore backup** with a valid Photon backup to replace corrupt projects,
after downloading the original data and confirming replacement. If storage
access itself was denied, restore access and reload first: Photon cannot safely
overwrite a value it was unable to read. Previously accepted records that fail
current semantic validation are preserved for recovery, not silently repaired.

## Failed actions

Main project saves serialize and validate the candidate database, check that the
stored bytes match the last observed value, and use a single localStorage write.
On failure, the in-memory project database returns to its last successful
checkpoint. Callers receive a thrown `ProjectStorageError`, stopping subsequent
success messages. Apply, Undo, Redo, batch edits and construct replacement update
their history only after saving succeeds. A failed Commit does not leave a new
in-memory branch head.

The notice offers **Download unsaved recovery**: a version-1 project backup
containing the attempted database state. The immediate download is held in memory;
only the latest serializable failed attempt is retained there. Export it before
closing/reloading unless persistent recovery has explicitly reported success.
Validation failures can produce diagnostic copies that need repair before restore.
Browser unload prompts are best-effort and do not protect against process
termination, device failure or clearing site data.

Free storage space and retry the original action to persist it. The failed action
has been rolled back; a later successful action does not automatically replay it.
Tests exercise actual Chromium quota exhaustion using isolated synthetic data,
including a 1 Mb construct and retry after space is freed.

## Multiple tabs and limits

If another tab's newer value is observed before a write, the stale tab refuses to
overwrite it. Download its attempted state, then reload to load the newer value.
There is no automatic merge. localStorage does not provide compare-and-swap:
two tabs writing in the narrow interval after their checks can still race. Atomic
writer coordination and versioned IndexedDB migration remain future work.

Each save validates/serializes the database and retains one JSON checkpoint.
This adds memory and synchronous work proportional to stored project/history size;
it is not a large-genome storage solution. Backup import still has a 20 MB file
cap and 500-project limit; live validation does not impose these import caps.

Part and backbone libraries, theme and tutorial preferences use separate keys.
They are not part of the project-only checkpoint or failed-action payload. The
staging archive includes the two known library namespaces, while theme/tutorial
preferences remain excluded. This milestone adds no encryption, remote sync,
clinical storage guarantees or automatic repair.
