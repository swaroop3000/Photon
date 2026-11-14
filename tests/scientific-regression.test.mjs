/** Deterministic external biochemical reference cases and long-sequence invariants.
 * EcoRI: G^AATTC / CTTAA^G; PstI: CTGCA^G / G^ACGTC.
 * Recognition/cut definitions: REBASE (https://rebase.neb.com).
 * Only in-silico sequence mechanics, not reaction yields or laboratory validation.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {restrictionSites,virtualDigest} from '../src/core/restriction.mjs';
import {digestFragments,rejoinSingleCut,cutEnds} from '../src/core/cloning.mjs';
import {assembleGoldenGate} from '../src/core/golden-gate.mjs';
import {reverseComplement,translate,gcContent,findMotif} from '../src/core/dna.mjs';

test('EcoRI and PstI cuts agree with recognition-site offsets',()=>{
 const eco=restrictionSites('TTGAATTCAA',['EcoRI'])[0];
 assert.deepEqual([eco.start,eco.topCut,eco.bottomCut],[2,3,7]);
 assert.deepEqual(cutEnds('TTGAATTCAA',eco).rightEnd,
   {kind:'5-prime',overhang:'AATT',protruding:'bottom'});
 const pst=restrictionSites('AACTGCAGTT',['PstI'])[0];
 assert.deepEqual([pst.start,pst.topCut,pst.bottomCut],[2,7,3]);
 assert.deepEqual(cutEnds('AACTGCAGTT',pst).rightEnd,
   {kind:'3-prime',overhang:'TGCA',protruding:'top'});
});
test('restriction digestion conserves length and linear single cut reconstitutes',()=>{
 const seq='TTGAATTCAA';
 assert.deepEqual(virtualDigest(seq,['EcoRI']).fragments,[7,3]);
 assert.deepEqual(digestFragments(seq,['EcoRI']).map(f=>f.length),[3,7]);
 assert.equal(rejoinSingleCut(seq,'EcoRI').sequence,seq);
});
test('ordered Golden Gate junctions are recorded with expected top-strand sequence',()=>{
 const make=(l,p,r)=>'GGTCTC'+'A'+l+p+r+'A'+'GAGACC';
 const assembled=assembleGoldenGate([make('AATT','GCGAT','CGTA'),make('CGTA','TTGC','AATT')]);
 assert.equal(assembled.sequence,'AATTGCGATCGTATTGC');
 assert.deepEqual(assembled.junctions.map(j=>j.overhang),['CGTA','AATT']);
 assert.equal(assembled.circular,true);
});
test('large DNA sequence operations preserve exact length and reverse-complement identity',()=>{
 const seq='ATGCGTAC'.repeat(25000);
 assert.equal(seq.length,200000);
 assert.equal(reverseComplement(reverseComplement(seq)),seq);
 assert.equal(gcContent(seq),0.5);
 assert.equal(translate(seq).length,Math.floor(seq.length/3));
 assert.equal(findMotif(seq,'TTTT').length,0);
});
