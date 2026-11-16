import test from 'node:test';
import assert from 'node:assert/strict';
import {sequenceWindow} from '../src/core/sequence-window.mjs';
const w={seq:'ACGT'.repeat(10),topology:'circular',features:[
 {name:'wrap',start:38,end:3,type:'CDS',strand:-1},
 {name:'middle',start:7,end:15,type:'misc_feature'}]};
test('display windows clip ordinary and origin-spanning annotations using local half-open coordinates',()=>{
 const a=sequenceWindow(w,{start:1,size:10});
 assert.deepEqual(a.annotations,[{index:0,start:0,end:3,type:'CDS'},{index:1,start:6,end:10,type:'misc_feature'}]);
 assert.equal(a.sequence,'ACGTACGTAC');assert.equal(a.previousStart,null);assert.equal(a.nextStart,11);
 const b=sequenceWindow(w,{start:35,size:10});
 assert.equal(b.end,40);assert.equal(b.nextStart,null);assert.equal(b.previousStart,25);
 assert.deepEqual(b.annotations,[{index:0,start:3,end:6,type:'CDS'}]);
});
test('ten-megabase projection stays bounded at beginning, arbitrary coordinates and final base',()=>{
 const large={seq:'ACGT'.repeat(2500000),topology:'linear',features:[{start:9999998,end:10000000,type:'CDS'}]};
 for(const start of [1,6001,7654321,9994001,10000000]){
  const r=sequenceWindow(large,{start});
  assert.ok(r.sequence.length<=6000);assert.equal(r.sequence,large.seq.slice(start-1,start+5999));
  assert.equal(r.end,Math.min(10000000,start+5999));
 }
 const tail=sequenceWindow(large,{start:10000000});
 assert.deepEqual(tail.annotations,[{index:0,start:0,end:1,type:'CDS'}]);
});
test('windowing rejects invalid ranges/annotation coordinates without modifying the construct',()=>{
 const before=structuredClone(w);
 for(const opts of [{start:0},{start:41},{start:1.2},{size:6001},{size:0}])assert.throws(()=>sequenceWindow(w,opts),/Window/);
 assert.throws(()=>sequenceWindow({...w,topology:'linear'}),/circular/);
 assert.deepEqual(w,before);
 const empty=sequenceWindow({seq:'',topology:'linear',features:[]});
 assert.equal(empty.sequence,'');assert.equal(empty.end,0);assert.equal(empty.nextStart,null);
});
