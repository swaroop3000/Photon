# Reviewed atomic browser-archive restore

Continues `1666c41`. Recovery now has a separate file review path for
`photon/browser-storage-archive/1` (64 MB maximum). The project-only backup control
keeps its existing format/limits.

Before offering application, review verifies the archive checksum, projects/history,
part-library text (including all assembly roots) and backbone-library JSON. The
same pure library-text grammar is shared with the Builder. Accepted source strings
are retained exactly; invalid/future library syntax is refused without replacing
data. The review enumerates incoming projects/libraries and existing library keys
absent from the archive. A checked acknowledgement plus explicit restore action
is required. The restore removes those absent keys to match the archived namespaces.

Before replacement, Photon commits and reads back a prior-state archive in the
separate recovery vault. An unavailable/full vault prevents replacement without
automatic deletion. Final project/library writes/removals share one IndexedDB
transaction with both reviewed active revision and retained-source hash checks.
The originals in localStorage remain unchanged. Failed writes roll back together;
stale same-client and other observed changes cannot apply an older reviewed plan.

## Targeted verification

Linux, Node 24.22.1, Chromium/Playwright 1.56.1:

- Three new pure-core cases: review plan/byte preservation/removals, valid-checksum
  but semantically invalid libraries (including cycles), tampering and future formats.
- Five real-browser UI cases: full restore plus page reload and prior-state copy;
  transaction failure after queued library removal; stale active/source review;
  invalid library refusal/cancellation; full vault refusal without deletion.
- Additional real-IDB backend case: a same-client committed library write after
  review invalidates the captured revision before replacement.
- All targeted cases passed. Final combined suite results are in the session report.

## Limits

Requires a semantically valid active snapshot to preserve before replacement.
Unknown/corrupt active schemas retain separate recovery paths. Archives with
invalid library strings remain exportable for manual recovery but cannot be applied.
Whole-file validation/JSON snapshots use memory proportional to file/history size;
this is not streaming, unlimited restore or cross-device durability acceptance.
Automatic reverse migration and independent cutover/rollback review remain open.
No merge, production promotion or remote DNA upload was performed.
