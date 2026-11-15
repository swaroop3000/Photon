"""Offline differential validation of all legacy UI enzymes against Biopython 1.86."""
import itertools
import json
from pathlib import Path
import random
import subprocess
import Bio
from Bio import Restriction
from Bio.Seq import Seq
root = Path(__file__).resolve().parent.parent
names = ['EcoRI','BamHI','HindIII','NotI','XhoI','XbaI','PstI','SalI','NcoI','NdeI',
 'KpnI','SacI','SpeI','SmaI','EcoRV','BsaI','BsmBI','ClaI','MluI','NheI','AflII',
 'ApaI','BglII','DraI','HpaI','PvuII','ScaI','StuI']
vectors = []
rng = random.Random(3000)
for name in names:
    enzyme = getattr(Restriction, name)
    for recognition in sorted({enzyme.site, str(Seq(enzyme.site).reverse_complement())}):
        # Partial external cuts at molecule ends; test both orientations and both cuts.
        for left, right in itertools.product([0, 1, 4, 5, 6, 12], repeat=2):
            for circular in [False, True]:
                vectors.append({'enzyme': name, 'sequence': 'A'*left + recognition + 'A'*right,
                                'circular': circular})
        # Every rotation around a circular-origin site, with room for external cuts.
        seq = 'A'*12 + recognition + 'A'*12
        for offset in range(len(seq)):
            vectors.append({'enzyme': name, 'sequence': seq[offset:]+seq[:offset], 'circular': True})
    seq = ''.join(rng.choice('ACGT') for _ in range(1000)) + enzyme.site + 'A'*20
    for circular in [False, True]:
        vectors.append({'enzyme': name, 'sequence': seq, 'circular': circular})
run = subprocess.run(['node','tests/check-curated-enzymes.mjs'],cwd=root,
    input=json.dumps({'vectors':vectors}),text=True,capture_output=True,check=True)
result = json.loads(run.stdout)
assert set(result['registry']) == set(names)
assert set(row[0] for row in result['ui']) == set(names)
checks = 2
for name, recognition, offset in result['ui']:
    enzyme = getattr(Restriction,name)
    assert recognition == enzyme.site and offset == enzyme.fst5
    assert result['registry'][name] == {'recognition':enzyme.site,'topCut':enzyme.fst5,
        'bottomCut':len(enzyme.site)+enzyme.fst3}
    checks += 2
for v, actual in zip(vectors,result['vectors'],strict=True):
    enzyme = getattr(Restriction,v['enzyme'])
    expected = sorted({(p-1)%len(v['sequence']) if v['circular'] else p-1
        for p in enzyme.search(Seq(v['sequence']),linear=not v['circular'])})
    assert actual['cuts'] == expected, (v,actual['cuts'],expected)
    assert sum(actual['fragments']) == len(v['sequence'])
    for site in actual['sites']:
        assert site['overhangLength'] == abs(enzyme.ovhg)
        assert site['overhangType'] == ('blunt' if enzyme.ovhg == 0 else '5-prime' if enzyme.ovhg < 0 else '3-prime')
        checks += 2
    checks += 2
print(json.dumps({'schema':'photon-curated-enzyme-validation/1','biopython':Bio.__version__,
    'enzymes':len(names),'digest_vectors':len(vectors),'assertions':checks,'seed':3000,
    'scope':'Exact ACGT linear/circular cut coordinates, both Type IIS orientations, '
            'origin rotations and top-strand fragment lengths. No ambiguous recognition sites, '
            'methylation, chemistry, ligation yield or laboratory validation.'},indent=2))
