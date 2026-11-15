# Photon alpha security review — 2026-11-14

This is a scoped engineering assessment, not an independent security certification.
Genomic data, annotations, working copies, commit history, reusable libraries,
recovery records and downloaded files are the assets considered here.

## Trust boundaries and observed behavior

| Boundary | Current behavior | Remaining risk/control needed |
| --- | --- | --- |
| Imported files → UI | Schema/format/coordinate checks; display escaping; reviewed replacement | Systematic audit of remaining HTML/SVG interpolation and import paths |
| Browser origin → stored genomes | Active IndexedDB projects/libraries, retained legacy source and separate recovery vault | Any script executing on the origin can access these plaintext values; no account isolation/encryption |
| Failed action → recovery vault | Recovery payload and catalog commit atomically; no automatic replay | Asynchronous capture can be interrupted before completion; browser eviction/device loss remain possible |
| Storage migration | Atomic project/library copy, revision CAS, retained source and a migration marker preventing silent stale fallback | General archive-file restore, reverse-migration procedure and independent cutover review remain open |
| Application → network | Static application/module loading; source-download helpers fetch the current app URL | No network sandbox for user console scripts; hosted response policy and production settings require review |
| Browser → exported files | Explicit user-triggered project/library/archive/recovery downloads | Exports contain plaintext DNA/metadata; storage outside the browser is under the user's control |
| User console → application | `new Function` intentionally executes user-entered JavaScript with origin privileges | Console is not a sandbox; UI identifies its access. A constrained console/CSP design requires a separate decision |
| GitHub/Cloudflare → published code | Feature branch checks; observed feature command is `wrangler versions upload` | Verify current dashboard branch settings and actual successful build log before release; production promotion needs approval |

The SBOL/ontology HTTP namespace strings are identifiers, not evidence of remote
data transmission. No external analytics scripts or CDN runtime dependencies were
found in the current HTML/module entry path. This source review is not a proof
that arbitrary console code, browser extensions or a compromised host cannot
transmit data. Theme/tutorial keys and unrelated application keys are excluded
from browser archives; only the known Photon project/library namespaces are copied.

## Confirmed imported-markup vulnerability and repair

The legacy feature-type legend, selected-feature inspector, annotation-resolution
warning text and commit-tag badge interpolated imported strings into HTML without
escaping. Project backup validation appropriately permitted string labels, so a
malicious but structurally valid backup could introduce markup. A feature-type
payload was reproduced in an isolated Chromium profile executing a harmless
event handler; no real genomic data or external endpoint was used.

The four display paths now use the existing HTML text escape helper. Strings are
preserved in project data and displayed literally. No feature names/types are
silently stripped or renamed. `browser/import-display-safety.test.mjs` uses real
confirmed backup import to verify feature legend/inspector, tag badges and
resolution warnings create no image element and preserve the original string.
The feature/tag regressions failed before the repair and passed afterwards.

This repair covers those identified sinks; it is not a claim that every UI path
has been independently audited. Strict Content Security Policy enforcement is
not added: the current interface uses inline handlers and a privileged scripting
console. A policy that actually blocks injected script requires coordinated
implementation and tests, not an unverified header change.

## Open release work

1. Independent review of all remaining HTML/SVG/XML rendering and import/export
   boundaries, including direct repository-bundle import and biological metadata.
2. Define console trust/sandbox scope and implement a tested response-policy plan.
3. Independently review the implemented active storage cutover, revision coordination
   and release rollback procedure; verify recovery under more browser/device failure
   modes. Browser restart, transaction abort and missing data are tested; power loss
   and physical disk corruption are not simulated.
4. Decide data-at-rest, retention, device sharing and supported sensitive-data scope.
   No clinical/regulated repository or encrypted multi-user service is provided.
5. Verify hosted configuration, source/build provenance and rollback procedure with
   the exact release candidate. User approval remains required for merge and for
   any production version promotion.

Keep PR #1 draft while these release decisions are unresolved.
