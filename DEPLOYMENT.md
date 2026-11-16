# Photon deployment — Cloudflare Workers static assets

The Photon browser client is a static HTML + ES module application; it must be served over HTTP(S), **not** opened directly as a `file://` document. The core DNA editor fails closed when modules cannot load.

## Build

1. Install Node.js 20+.
2. Run `npm test`.
3. Run `npm run build`.
4. Check that `dist/index.html`, `dist/src/ui/editor-bridge.mjs` and `dist/src/core/dna.mjs` exist.
5. To inspect locally, run `cd dist && python -m http.server 8765`.

The build copies **only** the site and browser modules, and generates START.txt plus a SHA-256 application manifest; it excludes Git metadata, test fixtures, reports and source build scripts. `dist/` is ignored by Git.

## Cloudflare Workers Builds

- Use project name **photon** (matching `wrangler.jsonc`).
- Set build command to `npm run build`; feature-branch command to `npx wrangler versions upload`.
- Reserve `npx wrangler deploy` for approved production releases.
- Root directory: repository root (where `wrangler.jsonc` is).
- The static assets are published from `./dist`.
- Keep the production deployment bound to the intended stable branch; use a separate preview deployment for the feature branch.
- Do not put secrets or patient genomic data into the static site.

**Cloudflare build error diagnosis:** Open the failing build's logs in the Cloudflare dashboard. GitHub's generic Workers check conclusion alone does not identify whether the failure is from missing build output, a Wrangler/config mismatch, credentials or Cloudflare service configuration. This repository configuration is a candidate remediation, **not proof of a fixed hosted deployment**.

### Confirmed failure and local remediation (2026-11-14)

The user supplied the actual log for build `81eb4a4c-fac4-454e-938c-d2e5c73cdff7`
on commit `c5af07f0`. Cloudflare ran `bun install`, then immediately
`npx wrangler versions upload` (Wrangler 4.162.0), without running the static build.
Wrangler failed because `/opt/buildhome/repo/dist` did not exist. `dist/` is generated
and intentionally untracked; installing dependencies does not create it.

`wrangler.jsonc` now declares `build.command: npm run build`, so Wrangler creates
the assets before packaging, including when the dashboard only runs the upload
command. CI removes generated assets and runs pinned Wrangler with `deploy --dry-run`
to check this clean-build path without uploading or deploying. A successful dry run
does not establish a successful hosted build or validate Cloudflare credentials.

For feature builds, retain `npx wrangler versions upload`; this uploads a version
without promoting it to production. Do not replace it with `wrangler deploy` on the
feature branch. The production branch command above requires separate approval.
Verify dashboard branch/build settings and the next real build log before closing
the hosted deployment checklist item.

## Data safety

Photon stores active projects and libraries in revisioned IndexedDB, retaining legacy localStorage source bytes during migration (see `STORAGE.md`). It is not a clinical record system, a remote git service, or a durable backup. Export Photon JSON bundles before clearing site data, switching origins or importing large collections. Keep sensitive/clinical data out of the demo.

## Complete application download

The normal workspace's Download app action fetches the build manifest and verifies
each packaged file's size and SHA-256 before creating a ZIP. A changed/missing file
fails visibly. The ZIP includes index.html, src/, START.txt and its manifest; it
never includes browser projects, libraries, Git metadata or test reports. Extract
all files and use a local HTTP server as described in START.txt. Download app is
not a project backup. On the source development server, run `npm run build` first;
the action uses dist/ there.
