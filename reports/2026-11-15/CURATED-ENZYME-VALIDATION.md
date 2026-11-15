# Full UI enzyme registry and Type IIS cut repair

Continues `107b200`. The original 28-enzyme legacy digest used inside-site offset
1 for BsaI/BsmBI, inferred the reverse cut from the top offset and reduced even
linear cut coordinates modulo length. These produced scientifically wrong digest
maps. It now calls a pure curated mapper with explicit both-strand offsets.

The new model uses exact ACGT; unknown enzymes/ambiguous DNA are refused. Linear
sites require both cuts strictly inside the molecule. Circular sites wrap. Both
Type IIS orientations and actual cut counts are used by the legacy digest/unique-
cutter panels. No DNA is modified by mapping. The separate seven-enzyme modular
ligation model retains its previous scope.

Validation (Node 24.22.1, Biopython 1.86, Chromium/Playwright 1.56.1):

- All **262 Node tests passed**, static build passed.
- **2 new Chromium cases passed**: legacy Type IIS fragment output and ambiguous
  DNA refusal without page errors. Four new core regressions cover Golden Gate
  cut agreement, incomplete ends, circular reverse coordinates and registry guards.
- `python scripts/validate-curated-enzymes.py`: **12,358 assertions**, all **28**
  definitions including the actual inline UI table and **3,118 digest vectors**.
  Tests compare linear/circular top-strand cuts to independent Biopython search,
  overhang length/type, fragment-length conservation, both Type IIS orientations,
  all rotations around circular recognition sites and insufficient flanking DNA.
  Results: `curated-enzyme-validation.json`. Added to scientific-reference CI.

The independent comparison exposed the zero-coordinate terminal-cut convention;
the implementation now explicitly excludes both terminal and external linear cuts.
These are sequence-level predictions, not wet-lab validation, Gateway acceptance,
methylation/star-activity analysis or yield estimates. Broader ambiguity policies
and independent scientific review remain open. No merge or production promotion.
