# Photon deployment — Cloudflare Workers static assets

The Photon browser client is a static HTML + ES module application; it must be served over HTTP(S), **not** opened directly as a `file://` document. The core DNA editor fails closed when modules cannot load.

## Build

1. Install Node.js 20+.
2. Run `npm test`.
3. Run `npm run build`.
4. Check that `dist/index.html`, `dist/src/ui/editor-bridge.mjs` and `dist/src/core/dna.mjs` exist.
5. To inspect locally, run `cd dist && python -m http.server 8765`.

The build copies **only** the site and browser modules; it excludes Git metadata, test fixtures, reports and source build scripts. `dist/` is ignored by Git.

## Cloudflare Workers Builds

- Use project name **photon** (matching `wrangler.jsonc`).
- Set build command to `npm run build`; deploy command to `npx wrangler deploy`.
- Root directory: repository root (where `wrangler.jsonc` is).
- The static assets are published from `./dist`.
- Keep the production deployment bound to the intended stable branch; use a separate preview deployment for the feature branch.
- Do not put secrets or patient genomic data into the static site.

**Cloudflare build error diagnosis:** Open the failing build's logs in the Cloudflare dashboard. GitHub's generic Workers check conclusion alone does not identify whether the failure is from missing build output, a Wrangler/config mismatch, credentials or Cloudflare service configuration. This repository configuration is a candidate remediation, **not proof of a fixed hosted deployment**.

## Data safety

Photon stores local repositories in the browser's localStorage. It is not a clinical record system, a remote git service, or a durable backup. Export Photon JSON bundles before clearing site data, switching origins or importing large collections. Keep sensitive/clinical data out of the demo.
