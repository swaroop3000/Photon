import test from 'node:test';
import assert from 'node:assert/strict';
import {applyExplicitEdits,createEditorHistory} from '../src/core/photon-adapter.mjs';
const fixture=()=>({name:'batch',topology:'linear',seq:'AACCGGTTAACC',
 features:[{name:'up',start:1,end:2},{name:'middle',start:5,end:6},{name:'down',start:10,end:12}]});
test('two separate edits use original coordinates and preserve intervening annotation',()=>{
 const w=fixture(),saved=structuredClone(w);
 const r=applyExplicitEdits(w,[{start:2,end:4,insert:'G'},{start:8,end:8,insert:'TT'}]);
 assert.equal(r.working.seq,'AAGGGTTTTTAACC');
 assert.deepEqual(r.working.features.map(f=>[f.start,f.end]),[[1,2],[4,5],[11,13]]);
 assert.deepEqual(w,saved);
 assert.equal(r.edits.length,2);
});
test('reject overlapping, coincident, out-of-bounds and malformed operations',()=>{
 const w=fixture();
 assert.throws(()=>applyExplicitEdits(w,[{start:2,end:5,insert:'A'},{start:4,end:6,insert:'G'}]),/Overlapping/);
 assert.throws(()=>applyExplicitEdits(w,[{start:2,end:2,insert:'A'},{start:2,end:2,insert:'T'}]),/Overlapping/);
 assert.throws(()=>applyExplicitEdits(w,[{start:-1,end:1,insert:'G'}]),/Invalid edit/);
 assert.throws(()=>applyExplicitEdits(w,[{start:1,end:2,insert:'?'}]),/Invalid DNA base/);
 assert.deepEqual(w,fixture());
});
test('failed batch is atomic when one edit would erase an annotation',()=>{
 const w=fixture(),before=structuredClone(w);
 assert.throws(()=>applyExplicitEdits(w,[{start:10,end:10,insert:'A'},
  {start:4,end:6,insert:''}]),/erase an annotation/);
 assert.deepEqual(w,before);
});
test('wrapped origin feature survives multiple independent gap edits',()=>{
 const w={name:'circle',topology:'circular',seq:'AACCGGTTAACC',
  features:[{name:'origin',start:10,end:3,strand:-1}]};
 const r=applyExplicitEdits(w,[{start:4,end:4,insert:'G'},{start:6,end:7,insert:'A'}]);
 assert.equal(r.working.seq,'AACCGGGATAACC');
 assert.deepEqual(r.working.features.map(f=>[f.start,f.end]),[[11,3]]);
 assert.deepEqual(w.features[0],{name:'origin',start:10,end:3,strand:-1});
});
