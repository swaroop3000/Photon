"""Deterministic differential checks with pinned Biopython; synthetic data only.

Run: python -m pip install biopython==1.86
     python scripts/validate-biopython.py
No network requests, user sequence uploads, or claims about laboratory outcomes.
"""
import hashlib
import io
import json
from pathlib import Path
import random
import subprocess
import warnings

import Bio
from Bio import SeqIO, Restriction
from Bio.Seq import Seq
from Bio.SeqFeature import SeqFeature, SimpleLocation, CompoundLocation
from Bio.SeqRecord import SeqRecord
from Bio import BiopythonParserWarning

warnings.simplefilter('error', BiopythonParserWarning)

root = Path(__file__).resolve().parent.parent
rng = random.Random(3000)
sequence = ''.join(rng.choice('ACGT') for _ in range(3000))
# Include all curated recognition sites explicitly, as well as random background.
names = ['EcoRI', 'BamHI', 'HindIII', 'PstI', 'EcoRV', 'SmaI', 'NotI']
sequence += ''.join('TT' + getattr(Restriction, n).site + 'AA' for n in names)
records = []
texts = []
for circular in [False, True]:
    record = SeqRecord(Seq(sequence[:300]), id='CIRCULAR' if circular else 'LINEAR',
                       name='CIRCULAR' if circular else 'LINEAR', description='Synthetic interoperability fixture')
    record.annotations = {'molecule_type': 'DNA', 'topology': 'circular' if circular else 'linear'}
    record.features = [
        SeqFeature(SimpleLocation(10, 73, strand=-1), type='CDS', qualifiers={
            'label': ['reverse CDS'], 'gene': ['syntheticA'],
            'note': ['A "quoted" note with wrapped prose. ' + 'independent reference text ' * 8],
            'translation': [str(record.seq[10:73].reverse_complement().translate())]}),
        SeqFeature(SimpleLocation(90, 91, strand=1), type='misc_feature', qualifiers={'label': ['single base']})]
    if circular:
        # Negative-strand compound parts are listed in biological extraction order.
        location = CompoundLocation([SimpleLocation(0, 9, strand=-1), SimpleLocation(280, 300, strand=-1)])
        record.features.append(SeqFeature(location, type='misc_feature', qualifiers={'label': ['wrapped reverse']}))
    stream = io.StringIO()
    SeqIO.write(record, stream, 'genbank')
    texts.append(stream.getvalue())
    records.append(record)

# Prepared, oriented fragments from a known target; this checks sequence-only
# overlap assembly, not Gibson reaction kinetics or Gateway recombination.
target = sequence[:400]
fragments = [target[:160], target[140:280], target[260:]]
payload = {'genbank': texts, 'sequence': sequence, 'assembly': {'fragments': fragments}}
run = subprocess.run(['node', 'tests/check-biopython.mjs'], cwd=root, input=json.dumps(payload),
                     text=True, capture_output=True, check=True)
result = json.loads(run.stdout)
assert result['reverse'] == str(Seq(sequence).reverse_complement())
assert result['protein'] == str(Seq(sequence[:len(sequence)//3*3]).translate())
assert result['assembly']['sequence'] == target
assert [j['overlap'] for j in result['assembly']['junctions']] == [20, 20]
checks = 4
for original, returned in zip(records, result['records'], strict=True):
    exported = SeqIO.read(io.StringIO(returned['exported']), 'genbank')
    assert str(exported.seq) == str(original.seq)
    assert exported.annotations['topology'] == original.annotations['topology']
    assert len(exported.features) == len(original.features)
    for expected, actual, extracted in zip(original.features, exported.features, returned['extracted'], strict=True):
        assert actual.type == expected.type
        assert actual.location == expected.location, (actual.location, expected.location)
        assert actual.qualifiers == expected.qualifiers, (actual.qualifiers, expected.qualifiers)
        assert extracted == str(expected.extract(original.seq))
        checks += 4
    checks += 3
for name in names:
    enzyme = getattr(Restriction, name)
    definition = result['enzymes'][name]
    assert definition == {'recognition': enzyme.site, 'topCut': enzyme.fst5,
                          'bottomCut': len(enzyme.site) + enzyme.fst3}
    sites = [s for s in result['sites'] if s['enzyme'] == name]
    assert [s['topCut'] for s in sites] == [p-1 for p in enzyme.search(Seq(sequence), linear=True)]
    for site in sites:
        assert site['overhangLength'] == abs(enzyme.ovhg)
        assert site['overhangType'] == ('blunt' if enzyme.ovhg == 0 else '5-prime' if enzyme.ovhg < 0 else '3-prime')
    checks += 2 + 2*len(sites)
print(json.dumps({'schema': 'photon-biopython-validation-v1', 'biopython': Bio.__version__,
                  'fixture_sha256': hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest(),
                  'seed': 3000, 'records': len(records), 'enzymes': len(names), 'assertions': checks,
                  'scope': 'Synthetic supported-subset differential checks; no wet-lab validation'}, indent=2))
