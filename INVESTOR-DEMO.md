# Photon investor MVP

The immediate goal is a credible three-minute demonstration of **version control
for DNA design**. Full Genome Compiler parity and the broader engineering roadmap
are not prerequisites for this investor presentation.

## What the MVP demonstrates

- Import a supported GenBank construct and inspect annotated circular/linear maps.
- Make a real sequence change, preserve annotations, and undo the change.
- Commit a design snapshot and inspect local history/differences.
- Export the edited construct with supported annotations and retain projects locally.

The optional presentation view shows this core workflow and visibly labels its
scope. Experimental tools remain accessible after **Exit presentation**; their
existence is not presented as verified support. No simulated investor metrics,
customer traction, biological results or remote collaboration are added.

## Open and rehearse

The feature build has a modern workspace with desktop sidebar navigation,
responsive panels and light/dark themes. **Hide guide** gives the map/editor more
room; **Show guide** restores the walkthrough without changing project data.
Preview captures: [desktop](reports/2026-11-16/ui/desktop.png),
[dark](reports/2026-11-16/ui/dark.png), [phone](reports/2026-11-16/ui/mobile.png).

Use the feature build with `?demo=investor` appended to its URL, or select
**Investor demo** in the top bar. For a local presentation:

```sh
npm run build
python3 -m http.server 8765 --directory dist
```

Open `http://localhost:8765/?demo=investor` in desktop Chromium/Chrome. Do a full
rehearsal on the exact browser/machine first. A hosted shareable preview is a
separate hosting action; main/production promotion still needs explicit approval.

**Start new sample** parses a deterministic synthetic example through the real
GenBank codec and creates a separate local project with its initial commit.
Existing projects are retained. Every action awaits the normal storage lifecycle;
a failed sample save leaves projects unchanged. **Download sample GenBank** offers
the same fixture for a manual file-picker import demonstration.

## Three-minute script

| Time | Show | Say |
| --- | --- | --- |
| 0:00–0:25 | Title and map | “Photon brings traceable version history into DNA design. We are proving the core workflow before expanding the platform.” |
| 0:25–0:50 | Start a new sample, select a map feature | “This is synthetic demonstration data. We can see the construct and its annotations together.” |
| 0:50–1:25 | Apply example change, Undo, then apply again | “This changes an actual spacer base. Undo restores the complete design, including its annotations.” |
| 1:25–2:00 | Commit, enter “Tune synthetic spacer”, open Commits/Compare | “A design revision becomes a traceable snapshot. This alpha keeps history in the browser.” |
| 2:00–2:30 | Export GenBank; optionally show Backup projects | “The resulting sequence and supported annotations can leave the app in a real file.” |
| 2:30–3:00 | Return to Code | “Next we want pilot-user feedback, shared team projects and broader interoperability. The working core is what you have just seen.” |

Do not say that local commits are remote GitHub collaboration. Do not describe
synthetic motifs as a functional, experimentally verified plasmid. Broader cloning,
AI/Labs and whole-genome capabilities are outside this demonstration. No clinical
or laboratory-grade claim, existing customer traction or full parity claim is made.

## Focused demo acceptance

- [x] End-to-end browser regression: sample import/create, edit, full undo, reapply,
  real commit, parse exported GenBank and reload persistence.
- [x] Existing project objects stay unchanged when a presentation project is added.
- [x] Failed sample saves preserve active projects and show failure, not success.
- [x] Entering/exiting presentation preserves unapplied editor text and restores
  access to the full interface. This is presentation scope, not a security boundary.
- [x] The deterministic fixture has a complete standard-code illustrative CDS;
  the scripted change occurs outside annotated intervals.
- [ ] Rehearse with the founder on the exact presentation machine and browser.
- [ ] If a hosted investor link is needed, review the exact preview URL, hosting
  branch settings and deployed behavior before sharing. Production is separate.

## Deferred beyond this MVP

Full INSDC compatibility, chromosome-scale virtualization/streaming, Gateway and
chemistry validation, every historical migration/downgrade path, remote team
collaboration, clinical suitability and Genome Compiler parity. Keep these on the
roadmap, not in the investor-demo definition of done. Wider scientific use or a
public production launch still requires its appropriate release/scientific review.
