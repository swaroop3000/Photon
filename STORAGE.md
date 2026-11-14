# Browser project storage and recovery

Photon continues to use the existing `locusPro_v1` localStorage key. This milestone
does not change its on-disk JSON format, origin, project IDs or UI layout. A storage
notice is added when a project cannot be loaded or saved.

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
containing the attempted database state. Export it before closing/reloading the
tab or taking another action that saves successfully. It is an **in-memory**
recovery copy, not a persistent crash journal. Only the latest serializable failed
attempt is retained. Validation failures can produce diagnostic copies that need
repair before restore. Browser unload prompts are best-effort and do not protect
against process termination, device failure or clearing site data.

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
They are not part of this project's database checkpoint/recovery payload; use
their separate export controls. This milestone adds no encryption, remote sync,
clinical storage guarantees, automatic repair or durable crash recovery.
