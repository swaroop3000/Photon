# Draft PR #1 merge and release gates

Keep `feature/photon-1-core-engine` and PR #1 in draft until an explicitly scoped
alpha candidate is reviewed. Main and production promotion remain protected by
separate user approval. A successful build is not merge or publication approval.

## Evidence already available

- [x] Main project save failures roll back, do not report success, and preserve
      recoverable attempts; core and real Chromium quota/restart regressions.
- [x] Invalid startup projects remain untouched, with exact-byte recovery and
      confirmed validated replacement paths.
- [x] Versioned IndexedDB recovery vault/staging archive, including known library
      keys; real transaction abort, restart, retention and unavailable-store tests.
- [x] Scoped security assessment and repaired imported-markup display paths with
      actual backup-import regressions.
- [x] Capability inventory separates tested subsets, prototypes, mocks and open
      work. No full Genome Compiler parity or laboratory/clinical claim.

## Before requesting merge approval

- [x] Implement the asynchronous project command lifecycle and active IndexedDB
      backend with coordinated project/library migration, shared revision CAS,
      failure rollback, source retention and missing-active-data protection tests.
- [ ] Independently review the cutover, command lifecycle and release rollback
      procedure, including the newly implemented reviewed atomic archive restore.
      Automatic reverse migration remains open; retained legacy data must not be assumed current.
- [ ] Review the accumulated PR code, especially legacy merge/rebase/stash,
      annotation integrity, import/bundle trust boundaries and all HTML/SVG sinks.
      The scoped security assessment is not independent full-review signoff.
- [ ] Define the alpha's supported data, sizes, browsers, scientific operations,
      prototype exclusions and sensitive-data policy. Broader INSDC and whole-genome
      functionality must remain explicitly excluded unless independently accepted.
- [ ] Establish reference datasets and accuracy acceptance criteria for the exact
      molecular operations included in the alpha. Keep Gateway and unsupported
      chemistry out of verified-support claims until validated.
- [ ] Verify the actual successful Cloudflare build log, current branch settings
      and release/rollback procedure. GitHub provider-check success alone is not
      independent dashboard-log/configuration review.
- [ ] Run all six CI workflows on the exact proposed release commit and review
      failures from actual logs. Retest the built distribution's core user flows.
- [ ] Obtain explicit user approval to take PR #1 out of draft and merge. Do not
      execute either action while approval is absent.

## Before production version promotion

- [ ] Obtain explicit approval for the exact reviewed version and intended audience.
- [ ] Confirm what a push/merge does in the hosting dashboard. If merging main
      triggers production publication, that side effect requires approval too.
- [ ] Promote only the reviewed artifact/version; verify hosted behavior and rollback
      availability. No automatic promotion is performed by this development session.

Broader product parity remains a separate roadmap and evidence program. A release
date should be decided after these gates have owners and acceptance evidence;
an overnight development session does not by itself establish release readiness.
