import test from 'node:test';
import assert from 'node:assert/strict';
import {curatedDigest,curatedRestrictionSites,CURATED_ENZYMES} from '../src/core/curated-digest.mjs';
import {extractGoldenGatePart} from '../src/core/golden-gate.mjs';
test('Type IIS cuts occur outside recognition sites in both orientations',()=>{
 const seq='AAAAAGGTCTCAAAACCCCGGGGTTTTAAAAAGAGACCAAAAA';
 const r=curatedDigest(seq,['BsaI']);
 assert.deepEqual(r.sites.map(s=>[s.start,s.strand,s.topCut,s.bottomCut]),[[5,1,12,16],[32,-1,27,31]]);
 assert.deepEqual(r.fragments,[16,15,12]);
 const prepared=extractGoldenGatePart(seq);
 assert.equal(r.sites[0].topCut,prepared.leftCut);assert.equal(r.sites[1].topCut,prepared.rightCut);
});
test('linear incomplete or terminal Type IIS cuts are omitted rather than wrapped',()=>{
 for(const seq of ['GGTCTC','GGTCTCAAAA','AAAAAGAGACC','GAGACC']){
  assert.equal(curatedRestrictionSites(seq,['BsaI']).length,0);
  assert.deepEqual(curatedDigest(seq,['BsaI']).fragments,[seq.length]);
 }
 assert.equal(curatedRestrictionSites('GGTCTCAAAAAA',['BsaI'])[0].topCut,7);
});
test('circular reverse external cuts wrap with nonnegative coordinates and conserve length',()=>{
 const seq='GAGACCAAAAAAAAAAAA',r=curatedDigest(seq,['BsaI'],{circular:true});
 assert.equal(r.sites[0].strand,-1);
 assert.equal(r.sites[0].topCut,seq.length-5);assert.equal(r.sites[0].bottomCut,seq.length-1);
 assert.deepEqual(r.fragments,[seq.length]);
});
test('all 28 UI enzymes have unique curated definitions and exact ACGT behavior',()=>{
 assert.equal(Object.keys(CURATED_ENZYMES).length,28);
 assert.throws(()=>curatedDigest('AAANGGTCTCAAAA',['BsaI']),/Invalid DNA base/);
 assert.throws(()=>curatedDigest('ACGT',['unknown']),/Unknown/);
 assert.throws(()=>curatedDigest('ACGT',null),/array/);
 assert.deepEqual(curatedDigest('',[]).fragments,[]);
 const a=curatedDigest('AAGAATTCCC',['EcoRI','EcoRI']);
 assert.equal(a.sites.length,1);assert.deepEqual(a.cuts,[3]);assert.deepEqual(a.fragments,[7,3]);
});
