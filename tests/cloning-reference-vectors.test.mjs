/** Sequence-only cross-checks for curated palindromic enzyme cut offsets.
 * Fixed recognition diagrams are published by REBASE/NEB:
 * BamHI G^GATCC, HindIII A^AGCTT, EcoRV GAT^ATC,
 * SmaI CCC^GGG, NotI GC^GGCCGC.
 * No inference about reaction efficiency, methylation or wet-lab yields.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {restrictionSites,virtualDigest} from '../src/core/restriction.mjs';
import {cutEnds,digestFragments,rejoinSingleCut} from '../src/core/cloning.mjs';
const vectors=[
 ['BamHI','TTGGATCCAA',2,3,7,'5-prime','GATC'],
 ['HindIII','TTAAGCTTAA',2,3,7,'5-prime','AGCT'],
 ['EcoRV','TTGATATCAA',2,5,5,'blunt',''],
 ['SmaI','TTCCCGGGAA',2,5,5,'blunt',''],
 ['NotI','TTGCGGCCGCAA',2,4,8,'5-prime','GGCC']
];
for(const [enzyme,seq,start,top,bottom,kind,overhang] of vectors){
 test(enzyme+' cut positions and overhang classification',()=>{
  const hit=restrictionSites(seq,[enzyme]);
  assert.equal(hit.length,1);
  assert.deepEqual([hit[0].start,hit[0].topCut,hit[0].bottomCut],[start,top,bottom]);
  const ends=cutEnds(seq,hit[0]);
  assert.equal(ends.leftEnd.kind,kind);
  assert.equal(ends.rightEnd.kind,kind);
  assert.equal(ends.leftEnd.overhang,overhang);
  assert.equal(ends.rightEnd.overhang,overhang);
  assert.equal(rejoinSingleCut(seq,enzyme).sequence,seq);
  assert.equal(digestFragments(seq,[enzyme]).reduce((n,f)=>n+f.length,0),seq.length);
  assert.equal(virtualDigest(seq,[enzyme]).fragments.reduce((a,b)=>a+b,0),seq.length);
 });
}
