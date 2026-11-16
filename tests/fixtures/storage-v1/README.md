# Historical persistence backend compatibility fixture

The `.mjs.txt` file contains unmodified `src/core/indexed-project-storage.mjs`
from feature commit `dc576600eb7d94d1d3b1e802e832d3d78463a4bf`, pinned by manifest
SHA-256. It is this repository's historical code, not a new implementation.

The Chromium compatibility regression checks the digest, rewrites only relative
module import URLs at execution time and imports a Blob module. Dependencies use
the current compatible core modules; the historical header/write refusal logic
remains unchanged. It opens an actual record created by the new backend and must
refuse its version-2 header and writes, preserving original data. This isolates
the persistence compatibility boundary; it does not claim to execute or validate
the entire historical UI. Fixtures are excluded from the built distribution.
