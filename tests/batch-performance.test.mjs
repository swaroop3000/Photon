import test from 'node:test';
import assert from 'node:assert/strict';
import {editSequence,editSequenceBatch} from '../src/core/dna.mjs';
import {applyExplicitEdits} from '../src/core/photon-adapter.mjs';

test('batch mapping matches sequential right-to-left edits over 300 seeded cases',()=>{
 let seed=3000;
 const next=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
 for(let trial=0;trial<300;trial++){
  const sequence='ACGT'.repeat(30);
  const operations=[];
  for(let start=5;start<115;start+=10){
   operations.push({start,end:start+next(5),insert:'TGCA'.slice(0,next(5))});
  }
  const features=Array.from({length:10},(_,i)=>{
   const start=next(110);return {name:'f'+i,start,end:start+1+next(120-start),strand:next(2)?1:-1};
  });
  const original=structuredClone({sequence,features,operations});
  let expected={sequence,features},rejected=false;
  for(const edit of [...operations].reverse()){
   expected=editSequence(expected.sequence,expected.features,edit);
   if(expected.features.some(f=>f.end<=f.start)){rejected=true;break;}
  }
  if(rejected)assert.throws(()=>editSequenceBatch(sequence,features,operations),/erase/);
  else {
   const actual=editSequenceBatch(sequence,features,operations);
   assert.equal(actual.sequence,expected.sequence);
   assert.deepEqual(actual.features,expected.features);
  }
  assert.deepEqual({sequence,features,operations},original);
 }
});
test('10 Mb explicit mixed edits conserve sequence and nested feature metadata',()=>{
 const seq='ACGT'.repeat(2_500_000),operations=[];
 for(let i=0;i<1000;i++){
  const start=1000+i*9000;
  operations.push({start,end:start+(i%3),insert:i%2?'G':'TT'});
 }
 const working={name:'large synthetic',seq,topology:'linear',features:[
  {name:'whole',type:'misc_feature',start:1,end:seq.length,strand:1,qualifiers:{ref:{ids:['synthetic']}}}]};
 const result=applyExplicitEdits(working,operations);
 let cursor=0;const parts=[];
 for(const op of operations){parts.push(seq.slice(cursor,op.start),op.insert);cursor=op.end;}
 parts.push(seq.slice(cursor));
 assert.equal(result.working.seq,parts.join(''));
 assert.equal(result.working.features[0].end,result.working.seq.length);
 assert.equal(result.working.features[0].affected,true);
 result.working.features[0].qualifiers.ref.ids.push('changed');
 assert.deepEqual(working.features[0].qualifiers.ref.ids,['synthetic']);
});
test('adjacent edits and insertion boundaries follow existing feature policy',()=>{
 const edits=[{start:2,end:4,insert:'A'},{start:4,end:4,insert:'GG'},
   {start:8,end:8,insert:'T'},{start:0,end:0,insert:'C'}];
 const features=[{start:4,end:8,name:'x'}];
 let expected={sequence:'AACCGGTT',features};
 for(const edit of [...edits].sort((a,b)=>b.start-a.start))
  expected=editSequence(expected.sequence,expected.features,edit);
 const actual=editSequenceBatch('AACCGGTT',features,edits);
 assert.equal(actual.sequence,expected.sequence);
 assert.deepEqual(actual.features,expected.features);
 assert.throws(()=>editSequenceBatch('ACGT',[],[{start:1,end:3},{start:2,end:2}]),/Overlapping/);
});
