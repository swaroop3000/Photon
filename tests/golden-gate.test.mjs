import test from 'node:test';
import assert from 'node:assert/strict';
import {TYPE_IIS,extractGoldenGatePart,assembleGoldenGate} from '../src/core/golden-gate.mjs';
const make=(l,p,r,enzyme='BsaI')=>{
 const e=TYPE_IIS[enzyme];return e.forward+'A'+l+p+r+'A'+e.reverse;
};
test('BsaI cut offsets retain correct overhangs and payload',()=>{
 const r=extractGoldenGatePart(make('AATT','GCGAT','CGTA'));
 assert.deepEqual([r.sequence,r.leftOverhang,r.rightOverhang],['AATTGCGAT','AATT','CGTA']);
});
test('BsmBI uses its own recognition sites',()=>{
 const r=extractGoldenGatePart(make('AATT','GCGAT','CGTA','BsmBI'),{enzyme:'BsmBI'});
 assert.equal(r.sequence,'AATTGCGAT');
});
test('ordered circular assembly verifies all junctions',()=>{
 const r=assembleGoldenGate([make('AATT','GCGAT','CGTA'),make('CGTA','TTGC','AATT')]);
 assert.equal(r.sequence,'AATTGCGATCGTATTGC');
 assert.equal(r.circular,true);
 assert.deepEqual(r.junctions.map(j=>j.overhang),['CGTA','AATT']);
});
test('linear assembly does not require circular closure',()=>{
 const r=assembleGoldenGate([make('AATT','GCGAT','CGTA'),make('CGTA','TTGC','GGGG')],{circularize:false});
 assert.equal(r.circular,false);
 assert.equal(r.junctions.length,1);
});
test('reject incompatible junction or incorrect order',()=>{
 const a=make('AATT','GCGAT','CGTA'),b=make('TTTT','TTGC','AATT');
 assert.throws(()=>assembleGoldenGate([a,b]),/Incompatible overhang/);
 assert.throws(()=>assembleGoldenGate([b,a]),/Incompatible (overhang|circular junction)/);
});
test('reject incompatible final circular junction',()=>{
 const a=make('AATT','GCGAT','CGTA'),b=make('CGTA','TTGC','GGGG');
 assert.throws(()=>assembleGoldenGate([a,b]),/Incompatible circular junction/);
});
test('reject missing duplicated or internal restriction sites',()=>{
 assert.throws(()=>extractGoldenGatePart('ATGC'),/exactly one/);
 const a=make('AATT','GCGAT','CGTA');
 assert.throws(()=>extractGoldenGatePart(a+a),/exactly one/);
 assert.throws(()=>extractGoldenGatePart(make('AATT','GGTCTCTT','CGTA')),/exactly one|Internal Type IIS/);
});
test('reject unsupported enzyme, too few parts, and empty payload',()=>{
 assert.throws(()=>extractGoldenGatePart(make('AATT','GCGAT','CGTA'),{enzyme:'NotI'}),/Unsupported/);
 assert.throws(()=>assembleGoldenGate([]),/At least two/);
 assert.throws(()=>extractGoldenGatePart(make('AATT','','CGTA')),/internal payload/);
});
