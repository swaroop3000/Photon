# AGENTS.md — Photon development instructions for Codex

You are working on **Photon**, a browser-based DNA/construct engineering and version-control application. The product ambition is broad Genome Compiler-like functionality through independent implementation, not copying another product's code or asserting scientific equivalence without evidence.

## Read first
1. `CODEX_HANDOFF.md` — handoff from earlier development.
2. `ENGINEERING-REVIEW.md` — verified workstreams, limitations and release blockers.
3. `FORMAT-SUPPORT.md`, `README-ENGINE.md`, `DEPLOYMENT.md`.
4. Existing tests and the current draft pull request #1.

## Critical branch safety
- **Never commit directly to `main` or merge PR #1.** Keep main and its original UI protected.
- Default development target: `feature/photon-1-core-engine`. If Codex requires its own branch/task workspace, branch from that feature branch's current HEAD (not from main), then prepare a reviewable PR against the feature branch. Avoid overwriting concurrent changes.
- Preserve the existing UI and users' local project data. Avoid broad rewrites.
- Never auto-deploy production. Review/preview changes independently.
- Explicitly report what passed and failed; never claim a hosted deployment or scientific validation without supporting evidence.

## Architecture and conventions
- ES modules: `src/core/*.mjs` (pure DNA, GenBank, molecular-cloning and validation operations), `src/ui/*.mjs` (browser bindings), `index.html` (legacy user interface and local project model).
- Core edits use **zero-based half-open** intervals; legacy features use **one-based inclusive** coordinates. Origin-spanning features on circles need special handling. Reject edits that would erase or corrupt annotations instead of guessing.
- Full construct snapshots must preserve name, topology, sequence and **nested annotation metadata** across edits, undo/redo and commit boundaries.
- Do not silently discard unsupported GenBank/INSDC syntax or silently infer clinically significant results.
- `localStorage` is not a durable, encrypted, or clinical repository. Maintain explicit backup/export and reject storage failures.
- Source is JavaScript ES modules; tests use Node's native test runner, browser tests use Playwright. Do not introduce unnecessary dependencies.

## Run before review
- `npm test`
- `npm run build`
- `node scripts/benchmark-core.mjs 1000000` for diagnostics if performance changes.
- `node scripts/profile-genome-scale.mjs` for opt-in 100 kb/1 Mb/10 Mb profiling, where resources permit.
- Browser smoke tests require serving the repository over HTTP on port 8765 and a Playwright installation (see `.github/workflows/browser-smoke.yml`).
- GitHub Actions checks: DNA core, browser smoke, Primer3, SBOL3, static build. Check Cloudflare deployment separately in Cloudflare logs.

## Change protocol
1. Inspect repository status and existing CI failures.
2. Implement one coherent milestone with tests; distinguish prototype results from independently validated molecular biology.
3. Run relevant tests and check GitHub Actions; diagnose failures from real logs.
4. Update `ENGINEERING-REVIEW.md` and the draft PR with completed work and outstanding risks.
5. Leave code unmerged and present a concise implementation/verification report.

Do not treat the feature checklist as complete solely because code files or green tests exist. Full Genome Compiler parity, entire INSDC support, genome-scale performance and laboratory validation are **not complete**.
