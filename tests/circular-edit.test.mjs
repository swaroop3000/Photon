import test from 'node:test';
import assert from 'node:assert/strict';
import {applyCircularGapEdit} from '../src/core/circular-edit.mjs';
const original=()=>({seq:'AACCGGTTAACC',topology:'circular',name:'p',
 features:[{name:'wrap',start:10,end:3,strand:1,type:'CDS'}]});
test('inserting in the unannotated gap shifts the wrapped start only',()=>{
 const w=original(),r=applyCircularGapEdit(w,{start:5,end:5,insert:'GG'});
 assert.equal(r.working.seq,'AACCGGGGTTAACC');
 assert.deepEqual([r.working.features[0].start,r.working.features[0].end],[12,3]);
 assert.deepEqual([w.features[0].start,w.features[0].end],[10,3]);
});
test('deleting inside the gap moves the downstream origin arm',()=>{
 const w=original(),r=applyCircularGapEdit(w,{start:4,end:6,insert:''});
 assert.equal(r.working.seq,'AACCTTAACC');
 assert.deepEqual([r.working.features[0].start,r.working.features[0].end],[8,3]);
});
test('edits touching either arm are rejected without mutation',()=>{
 const w=original(),before=JSON.stringify(w);
 assert.throws(()=>applyCircularGapEdit(w,{start:0,end:2,insert:'TT'}),/overlaps/);
 assert.throws(()=>applyCircularGapEdit(w,{start:10,end:10,insert:'G'}),/overlaps/);
 assert.equal(JSON.stringify(w),before);
});
test('removing the whole gap is rejected',()=>{
 const w=original();
 assert.throws(()=>applyCircularGapEdit(w,{start:3,end:9,insert:''}),/remaining unannotated gap/);
});
test('multiple wrapped features require the edit to be safe for all',()=>{
 const w=original();
 w.features.push({name:'second',start:8,end:4,strand:-1});
 assert.throws(()=>applyCircularGapEdit(w,{start:3,end:4,insert:'A'}),/overlaps/);
 const r=applyCircularGapEdit(w,{start:5,end:5,insert:'A'});
 assert.deepEqual(r.working.features.map(f=>[f.start,f.end]),[[11,3],[9,4]]);
});
test('ordinary features are lifted with the wrapped features in original order',()=>{
 const w=original();
 w.features.unshift({name:'normal',start:6,end:8,type:'misc'});
 const r=applyCircularGapEdit(w,{start:3,end:3,insert:'A'});
 assert.deepEqual(r.working.features.map(f=>[f.name,f.start,f.end]),[
  ['normal',7,9],['wrap',11,3]]);
});
test('invalid coordinates and topology are refused',()=>{
 const w=original();
 assert.throws(()=>applyCircularGapEdit({...w,topology:'linear'},{start:4,end:4,insert:'A'}),/Circular/);
 assert.throws(()=>applyCircularGapEdit(w,{start:-1,end:2,insert:'A'}),/Invalid edit/);
 assert.throws(()=>applyCircularGapEdit(w,{start:5,end:5,insert:'N?'}),/Invalid DNA base/);
});

test('gap edit cannot silently erase an ordinary annotation',()=>{
 const w=original();
 w.features.push({name:'gap-feature',start:5,end:6,strand:1,type:'misc'});
 assert.throws(()=>applyCircularGapEdit(w,{start:4,end:6,insert:''}),/erase an annotation/);
 assert.equal(w.features.length,2);
 assert.equal(w.seq,'AACCGGTTAACC');
});
