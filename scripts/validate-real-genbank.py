"""Offline public-accession and CDS semantics checks against Biopython 1.86.

The pinned, unmodified public record is described in tests/fixtures/genbank/README.md.
This checks sequence/annotation interoperability, not laboratory function.
"""
import hashlib
import io
import itertools
import json
from pathlib import Path
import subprocess
import warnings
import Bio
from Bio import SeqIO, BiopythonParserWarning
from Bio.Data import CodonTable
from Bio.Seq import Seq
warnings.simplefilter('error', BiopythonParserWarning)
root = Path(__file__).resolve().parent.parent
raw = (root / 'tests/fixtures/genbank/J01749.1.gb').read_bytes()
manifest = json.loads((root / 'tests/fixtures/genbank/manifest.json').read_text())
assert hashlib.sha256(raw).hexdigest() == manifest['sha256']
record = SeqIO.read(io.StringIO(raw.decode()), 'genbank')
features = [f for f in record.features if f.type != 'source']
vectors = []
expected = []
# Every unambiguous internal codon in each supported table, on both strands.
for table in [1, 11]:
    for bases in itertools.product('ACGT', repeat=3):
        codon = ''.join(bases)
        dna = 'ATG' + codon + 'TAA'
        for strand in [1, -1]:
            seq = dna if strand == 1 else str(Seq(dna).reverse_complement())
            vectors.append({'seq': seq, 'feature': {'start': 1, 'end': 9, 'strand': strand,
                'qualifiers': {'transl_table': str(table)}}})
            expected.append(str(Seq(dna).translate(table=table)))
    # Independently defined alternative initiation codons, complete CDS semantics.
    for start in CodonTable.unambiguous_dna_by_id[table].start_codons:
        dna = start + 'AAA' + 'TAA'
        vectors.append({'seq': dna, 'feature': {'start': 1, 'end': 9,
            'qualifiers': {'transl_table': str(table)}}})
        expected.append(str(Seq(dna).translate(table=table, cds=True)) + '*')
    for offset in [1, 2]:
        dna = 'A' * offset + 'ATGAAATAA'
        vectors.append({'seq': dna, 'feature': {'start': 1, 'end': len(dna),
            'qualifiers': {'transl_table': str(table), 'codon_start': str(offset + 1)}}})
        expected.append(str(Seq(dna[offset:]).translate(table=table)))
run = subprocess.run(['node', 'tests/check-real-genbank.mjs'], cwd=root,
    input=json.dumps({'genbank': raw.decode(), 'vectors': vectors}), text=True, capture_output=True, check=True)
result = json.loads(run.stdout)
exported = SeqIO.read(io.StringIO(result['exported']), 'genbank')
assert str(exported.seq) == str(record.seq)
assert exported.annotations['topology'] == record.annotations['topology']
assert len(exported.features) == len(features) == 48
checks = 4  # Includes fixture digest.
for original, returned, extracted in zip(features, exported.features, result['extracted'], strict=True):
    assert original.type == returned.type
    assert original.location == returned.location
    # Photon deliberately adds a display label. Source/header metadata are outside this subset.
    actual_qualifiers = {k: v for k, v in returned.qualifiers.items() if k != 'label'}
    assert original.qualifiers == actual_qualifiers, (original.qualifiers, actual_qualifiers)
    assert extracted == str(original.extract(record.seq))
    checks += 4
for feature, actual in zip([f for f in features if f.type == 'CDS'], result['cds'], strict=True):
    assert actual['valid'] and actual['translationMatches']
    assert actual['protein'].removesuffix('*') == feature.qualifiers['translation'][0]
    assert actual['protein'].removesuffix('*') == str(feature.extract(record.seq).translate(table=11, cds=True))
    checks += 3
for actual, protein in zip(result['vectors'], expected, strict=True):
    assert actual['protein'] == protein, (actual, protein)
    checks += 1
print(json.dumps({'schema': 'photon-real-genbank-validation/1', 'biopython': Bio.__version__,
    'accession': 'J01749.1', 'sha256': manifest['sha256'], 'length': len(record),
    'non_source_features': len(features), 'annotated_cds': len(result['cds']),
    'cds_vectors': len(vectors), 'assertions': checks,
    'scope': 'One public plasmid record; exact supported locations, qualifiers, extraction and tables 1/11. '
             'No header/source preservation, broad INSDC, expression or laboratory validation.'}, indent=2))
