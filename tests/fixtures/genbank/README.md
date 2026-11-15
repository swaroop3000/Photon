# Public GenBank interoperability fixture

`J01749.1.gb` is the unmodified public NCBI GenBank flat file for cloning vector
pBR322 (4,361 bases), retrieved on 2026-11-15 using the accession-specific EFetch
URL in `manifest.json`. The manifest pins the exact bytes and SHA-256: accession
versions pin sequence, but database annotations can change independently. The
flat file includes its original bibliography and attribution. This public
scientific database record is test data, not user DNA or competitor source code.
NCBI database usage information: https://www.ncbi.nlm.nih.gov/home/about/policies/ .

`validate-real-genbank.py` uses Biopython 1.86 offline to compare sequence,
topology, all 48 non-source feature locations, qualifier values/order and extracted
sequences, plus its three annotated table-11 CDS peptides. Photon adds display
labels. Its supported-subset exporter deliberately omits the original header and
source annotations, so this is not full-record archival equivalence. Tests also
cover 270 independently generated CDS vectors for tables 1/11, both strands,
all 64 internal codons, alternative starts and codon offsets. It is one plasmid
record, not a broad real-genome interoperability dataset or laboratory validation.
