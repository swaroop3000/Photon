"""Offline exact-local compound-feature checks against Biopython 1.86.

Liftover expectations use surviving base identities rather than Photon interval
formulas. Includes the pinned public V00499.1 beta-globin record, random synthetic
records, reverse strands, adjacent/single-base exons and frame-crossing boundaries.
"""
import hashlib
import io
import json
from pathlib import Path
import random
import subprocess
import warnings
import Bio
from Bio import SeqIO, BiopythonParserWarning
from Bio.Seq import Seq
from Bio.SeqFeature import SeqFeature, SimpleLocation, CompoundLocation
from Bio.SeqRecord import SeqRecord
warnings.simplefilter('error', BiopythonParserWarning)
root = Path(__file__).resolve().parent.parent
raw = (root/'tests/fixtures/genbank/V00499.1.gb').read_bytes()
manifest = json.loads((root/'tests/fixtures/genbank/V00499.1-manifest.json').read_text())
assert hashlib.sha256(raw).hexdigest() == manifest['sha256']
public = SeqIO.read(io.StringIO(raw.decode()), 'genbank')
records = [public]
cases = [{'text':raw.decode(), 'edits':[{'start':300,'end':302,'insert':'GGG'}]}]
rng = random.Random(20261116)
for i in range(50):
    record = SeqRecord(Seq(''.join(rng.choice('ACGT') for _ in range(400))),
                       id=f'COMPOUND{i}',name=f'COMPOUND{i}',description='Synthetic exact local joins')
    record.annotations={'molecule_type':'DNA','topology':'circular' if i%2 else 'linear'}
    # Non-triplet exon lengths force concatenation before translation/extraction.
    groups=[[(10,27),(40,60),(91,116)],[(131,140),(151,170),(232,251)],[(280,281),(281,299),(310,311)]]
    features=[]
    for j,spans in enumerate(groups):
        strand=rng.choice([1,-1])
        parts=[SimpleLocation(a,b,strand=strand) for a,b in spans]
        if strand == -1: parts.reverse()
        features.append(SeqFeature(CompoundLocation(parts),type='misc_feature',qualifiers={
            'label':[f'feature{j}'],'note':['synthetic independent joins']}))
    record.features=features
    stream=io.StringIO();SeqIO.write(record,stream,'genbank')
    cases.append({'text':stream.getvalue(),'edits':[
        {'start':30,'end':30,'insert':''.join(rng.choice('ACGT') for _ in range(rng.randint(1,5)))},
        {'start':178,'end':181,'insert':''},
        {'start':11,'end':12,'insert':rng.choice('ACGT')}]})
    records.append(record)
run=subprocess.run(['node','tests/check-compound-biopython.mjs'],cwd=root,
                   input=json.dumps({'cases':cases}),text=True,capture_output=True,check=True)
results=json.loads(run.stdout)
checks=1
for record,case,result in zip(records,cases,results,strict=True):
    # Track identities of surviving original bases. Insertions between exons do
    # not belong to the exon; mapped end points follow their original base IDs.
    bases=list(str(record.seq));identities=list(range(len(record)))
    for edit in sorted(case['edits'],key=lambda e:e['start'],reverse=True):
        a,b=edit['start'],edit['end'];replacement=edit['insert']
        ids=identities[a:b] if b-a==len(replacement) else [None]*len(replacement)
        bases[a:b]=list(replacement);identities[a:b]=ids
    positions={old:new for new,old in enumerate(identities) if old is not None}
    for phase in ['original','edited']:
        actual=SeqIO.read(io.StringIO(result[phase]['exported']),'genbank')
        expected_seq=str(record.seq) if phase=='original' else ''.join(bases)
        assert str(actual.seq)==expected_seq
        assert actual.annotations['topology']==record.annotations['topology']
        expected_features=[f for f in record.features if f.type!='source']
        assert len(actual.features)==len(expected_features)
        checks+=3
        for feature,returned,extracted in zip(expected_features,actual.features,result[phase]['extracted'],strict=True):
            location=feature.location
            if phase=='edited':
                parts=[SimpleLocation(positions[int(p.start)],positions[int(p.end)-1]+1,strand=p.strand)
                       for p in feature.location.parts]
                location=parts[0] if len(parts)==1 else CompoundLocation(parts)
            assert returned.location==location,(returned.location,location)
            assert returned.type==feature.type
            expected_quals=feature.qualifiers
            actual_quals=returned.qualifiers if 'label' in expected_quals else {k:v for k,v in returned.qualifiers.items() if k!='label'}
            assert actual_quals==expected_quals
            assert extracted==str(location.extract(Seq(expected_seq)))
            checks+=4
    if record.id=='V00499.1':
        feature=next(f for f in actual.features if f.type=='CDS')
        assert str(feature.extract(actual.seq).translate(cds=True))==feature.qualifiers['translation'][0]
        checks+=1
print(json.dumps({'schema':'photon-compound-genbank-validation/1','biopython':Bio.__version__,
 'accession':'V00499.1','public_fixture_sha256':manifest['sha256'],'records':len(records),
 'synthetic_seed':20261116,'assertions':checks,'phases':['original','after explicit edits'],
 'scope':'Exact ascending disjoint local joins, both strands, circular/linear molecules, '
         'spliced extraction and base-identity interval liftover. No fuzzy, remote, '
         'mixed-strand, non-monotonic joins or wet-lab/clinical claims.'},indent=2))
