# Photon takeover validation — 2026-11-14

Starting remote feature HEAD: `c5af07f0e91cc01e50d17d1eaa787d105b2ea5bc`.
Starting `main`: `a2d2856c70c701a0eee945d9cbde5d1bb240754c` (unchanged).
Implementation milestones: `7f256ed` (build), `98e5633` (restore), `bc44c74`
(GenBank/reference checks), `1fd03a7` (explicit batch performance).

## Local verification

Environment: Linux, Node v24.22.1, Chromium via Playwright 1.56.1, Python 3.12.

| Check | Result |
| --- | --- |
| `npm test` | 225 passed, 0 failed/skipped |
| `node --test browser/*.test.mjs` over HTTP port 8765 | 35 passed, 0 failed/skipped |
| `npm run build` | Passed; minimal static distribution |
| Wrangler 4.162.0 `deploy --dry-run` in a separate source copy without `dist` | Custom build ran, assets packaged, no upload/deployment |
| Biopython 1.86 differential checks | 68 assertions, 2 synthetic GenBank records, 7 core enzymes; parser warnings treated as failures |
| Existing Primer3 workflow reproduced locally, primer3-py 2.4.0 | 5 actual Primer3 candidate pairs cross-validated |
| Existing SBOL3 workflow assertions reproduced locally, pySBOL3 | Single, multi-part and nested graphs passed validation, 0 warnings |
| `node scripts/benchmark-core.mjs 1000000` | Completed; JSON report alongside this file |
| `node scripts/profile-genome-scale.mjs` | Separate processes at 100 kb, 1 Mb and 10 Mb completed |
| `node scripts/benchmark-edits.mjs 1000000 100` | Identical sequence/annotations; sequential 972.8 ms, batch 9.6 ms on this host |
| `git diff --check` | Passed |

The 10 Mb/1,000-edit test validates exact sequence and nested annotation metadata.
300 seeded differential cases compare the optimized path with sequential
right-to-left feature mapping, including rejected annotation erasures. No time
threshold is asserted. Annotation transforms remain O(features × edits).

Genome diagnostic end-of-run heap was 10.32 MiB / 71.35 MiB / 396.57 MiB at
100 kb / 1 Mb / 10 Mb. These are **not peak-memory measurements**, browser
measurements, storage budgets or whole-genome workflow guarantees.

## Cloudflare evidence

The user supplied the actual log for build
`81eb4a4c-fac4-454e-938c-d2e5c73cdff7` at `c5af07f0`:

```text
2026-11-14T16:55:52.240Z Installing project dependencies: bun install
2026-11-14T16:55:52.781Z Executing user deploy command: npx wrangler versions upload
2026-11-14T16:56:10.010Z wrangler 4.162.0
2026-11-14T16:56:10.241Z [ERROR] The directory specified by the "assets.directory" field in your configuration file does not exist:
2026-11-14T16:56:10.241Z /opt/buildhome/repo/dist
2026-11-14T16:56:10.505Z Failed: error occurred while running deploy command
```

No static build command ran between dependency installation and version upload.
The Wrangler build hook fixes this missing-assets precondition locally. A new
Cloudflare build log is still required to verify the hosted upload. The observed
feature command uploads a version; it does not promote a production deployment.
No production deployment or merge was executed for this work.

## Remaining release blockers

Full INSDC joins/fuzzy/remote locations, repeated/valueless qualifiers and original
header/source preservation; real-record scientific reference datasets and external
review; Gateway fixtures and chemistry scope; circular overlapping reannotation;
whole-genome browser virtualization; IndexedDB migration, corrupt startup storage
recovery and legacy callers that ignore `save()` failures; full original Genome
Compiler capability audit. Backup validation adds a strict import boundary but
does not migrate existing live storage, encrypt backups, establish remote
persistence, or provide automatic rollback after a successful user-confirmed
replacement. Export current projects before replacing them.

Keep PR #1 draft and unmerged. These checks establish bounded software behavior,
not laboratory/clinical certification or full product parity.
