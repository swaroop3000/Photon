# Investor MVP focus and rehearsal validation

The user narrowed the immediate objective to an MVP for investors. This milestone
continues `dd20aa5` without waiting for the entire scientific roadmap. It adds an
optional presentation view over the existing working editor, not a replacement UI.

The entry point is `?demo=investor` or the **Investor demo** button. The view states
its core/experimental scope, shows the value proposition and offers real sample,
edit, undo, commit and export operations. Experimental tools and developer-oriented
controls are outside this focused view; exiting restores them. The plasmid map is
sized for presentation. This is display scope, not a security boundary.

The sample is deterministic synthetic DNA, parsed through the GenBank codec and
saved as a separate project through normal asynchronous storage. No existing
project is reset/replaced. The example changes one actual unannotated spacer base;
its guard refuses a different/modified construct. Undo and commits use the real
editor/history path. Exports contain current DNA and supported annotations. No
remote teamwork, biological functionality, artificial investor metrics or customer
traction is simulated. Local commit history is explicitly distinguished from
remote Git hosting. The three-minute founder script is in `INVESTOR-DEMO.md`.

## Verification

Linux, Node 24.22.1, Chromium/Playwright 1.56.1:

- `npm test`: **280 passed**, zero failures/skips, including three new fixture/
  edit/undo/refusal cases.
- Full `node --test browser/*.test.mjs`: **91 passed**, zero failures/skips,
  152.1 seconds on this host. Three new cases exercise the complete sample/edit/
  undo/reapply/commit/export/reload flow, original-project preservation, failed-save
  rollback and preserving unapplied text across presentation toggles.
- The three presentation cases passed again after the final display/Undo refinements.
- Static build and Wrangler 4.162.0 `deploy --dry-run` passed with **71 assets**;
  nothing was uploaded or production-promoted by the dry run.
- Built distribution on local HTTP 8766 passed sample/edit/undo/reapply/commit,
  parsed export equality and reload persistence, with **zero page errors**.
- Visually inspected the presentation at desktop dimensions with a synthetic
  sample; preserved the existing map/editor style and added a concise guide.

The initial local HTTP process had stopped responding; it was restarted with log
redirection before browser verification. This was test infrastructure, not an
application failure. Current-head GitHub workflow evidence is maintained in PR #1.

## Next acceptance step

Founder rehearsal on the actual presentation machine and, if needed, review of
an exact hosted preview URL. Broad INSDC, whole-genome, Gateway/chemistry and full
parity work remain deferred beyond this investor demonstration. Existing approval
requirements for main merge and production promotion stay in force. No such
approval or promotion is inferred from the MVP scope change.
