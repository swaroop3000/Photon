import test from 'node:test';
import assert from 'node:assert/strict';
import { applySequenceRevision, createEditorHistory } from '../src/core/photon-adapter.mjs';

const sample = () => ({
  name: 'demo', topology: 'linear', seq: 'AACCGGTTAACC',
  features: [
    { name: 'up', start: 1, end: 2, type: 'CDS' },
    { name: 'mid', start: 4, end: 7, type: 'promoter' },
    { name: 'down', start: 9, end: 10, type: 'terminator' }
  ]
});
test('adapter handles 1-based inclusive feature coordinates on replacement', () => {
  const original = sample();
  const r = applySequenceRevision(original, 'AACCATTAACC');
  assert.equal(r.working.seq, 'AACCATTAACC');
  assert.deepEqual(r.working.features.map(f => [f.start,f.end]), [[1,2],[4,6],[8,9]]);
  assert.deepEqual(r.affectedFeatures, ['mid']);
  assert.equal(original.features[1].end,7);
});
test('adapter returns unchanged clone for no-op edit', () => {
  const w=sample(),r=applySequenceRevision(w,w.seq);
  assert.equal(r.changed,false);
  assert.notStrictEqual(r.working,w);
});
test('validation rejects invalid new bases and malformed feature positions', () => {
  assert.throws(()=>applySequenceRevision(sample(),'AAC!'),/Invalid DNA base/);
  const w=sample();w.features[0].start=0;
  assert.throws(()=>applySequenceRevision(w,'ACGT'),/Invalid 1-based/);
});
test('history undo and redo restore annotations, not only sequence', () => {
  const h=createEditorHistory(sample());
  h.apply('AACCATTAACC');
  assert.equal(h.current.features[1].end,6);
  assert.equal(h.undo().features[1].end,7);
  assert.equal(h.redo().features[1].end,6);
});
test('new edit clears redo history and no-op does not create undo entry', () => {
  const h=createEditorHistory(sample(),{limit:2});
  h.apply(sample().seq);
  assert.equal(h.canUndo,false);
  h.apply('AACCATTAACC');h.undo();
  assert.equal(h.canRedo,true);
  h.apply('AACCTTTAACC');
  assert.equal(h.canRedo,false);
});


test('origin-spanning features are preserved on no-op and block unsafe sequence liftover',()=>{
 const w=sample();
 w.topology='circular';
 w.features=[{name:'wrapped',start:10,end:2,strand:1,type:'CDS'}];
 const unchanged=applySequenceRevision(w,w.seq);
 assert.equal(unchanged.changed,false);
 assert.deepEqual(unchanged.working.features,w.features);
 assert.throws(()=>applySequenceRevision(w,w.seq+'A'),/reannotation/);
 assert.equal(w.seq,'AACCGGTTAACC');
});


test('wrapped circular annotations shift during safe gap insertion and undo restores them',()=>{
 const w=sample();
 w.topology='circular';
 w.features=[{name:'wrap',start:10,end:3,strand:1}];
 const h=createEditorHistory(w);
 const newSeq=w.seq.slice(0,5)+'GG'+w.seq.slice(5);
 const result=h.apply(newSeq);
 assert.equal(result.changed,true);
 assert.deepEqual([h.current.features[0].start,h.current.features[0].end],[12,3]);
 assert.deepEqual([h.undo().features[0].start,h.current.features[0].end],[10,3]);
 assert.equal(h.current.seq,w.seq);
 assert.equal(h.redo().seq,newSeq);
});

test('no-op validation rejects malformed annotations before preserving history',()=>{
 const w=sample();w.features[1].end=w.seq.length+1;
 assert.throws(()=>applySequenceRevision(w,w.seq),/Invalid 1-based/);
 const h=createEditorHistory(sample());h.apply('AACCATTAACC');
 const before=h.current;
 assert.equal(before.features[1].affected,true);
 assert.equal(h.canUndo,true);
});
test('fully deleting an annotated feature is rejected transactionally',()=>{
 const w={name:'deletion',topology:'linear',seq:'AACCGGTTAACC',
   features:[{name:'essential',start:5,end:6,strand:1,type:'CDS'}]};
 const h=createEditorHistory(w);
 // Replacement deletes the annotated bases entirely.
 assert.throws(()=>h.apply('AACCTTAACC'),/erase an annotation/);
 assert.deepEqual(h.current,w);
 assert.equal(h.canUndo,false);
 assert.equal(h.canRedo,false);
});
test('insertion and downstream annotation liftover survive undo redo',()=>{
 const w=sample(),h=createEditorHistory(w);
 const r=h.apply(w.seq.slice(0,3)+'TT'+w.seq.slice(3));
 assert.equal(r.changed,true);
 assert.deepEqual(h.current.features.map(f=>[f.start,f.end]),[[1,2],[6,9],[11,12]]);
 assert.deepEqual(h.undo(),w);
 assert.deepEqual(h.redo(),r.working);
});
test('sequential edits and undo do not mutate previous commit snapshots',()=>{
 const original=sample(),snapshot=structuredClone(original),h=createEditorHistory(original);
 h.apply(original.seq+'C');
 h.apply(original.seq+'CG');
 assert.equal(h.current.seq,original.seq+'CG');
 assert.equal(h.undo().seq,original.seq+'C');
 assert.equal(h.undo().seq,original.seq);
 assert.equal(h.redo().seq,original.seq+'C');
 assert.deepEqual(original,snapshot);
});

test('disjoint substitutions preserve annotation between edits',()=>{
 const w={name:'two loci',topology:'linear',seq:'AACCGGTTAACC',
  features:[{name:'between',start:5,end:8,type:'promoter'},
            {name:'first',start:2,end:2,type:'misc'},
            {name:'last',start:11,end:11,type:'misc'}]};
 const r=applySequenceRevision(w,'ATCCGGTTAATC');
 assert.deepEqual(r.working.features.map(f=>[f.start,f.end]),[[5,8],[2,2],[11,11]]);
 assert.deepEqual(r.affectedFeatures,['first','last']);
 assert.equal(w.seq,'AACCGGTTAACC');
});
test('independent safe changes in wrapped circular gap preserve origin-crossing feature',()=>{
 const w={name:'circle',topology:'circular',seq:'AACCGGTTAACC',
   features:[{name:'origin',start:10,end:3,type:'CDS',strand:-1},
             {name:'middle',start:6,end:7,type:'misc'}]};
 const r=applySequenceRevision(w,'AACCTGATAACC');
 assert.deepEqual(r.working.features.map(f=>[f.start,f.end]),[[10,3],[6,7]]);
 assert.deepEqual(r.affectedFeatures,['middle']);
 const h=createEditorHistory(w);
 h.apply('AACCTGATAACC');
 assert.deepEqual(h.undo(),w);
 assert.equal(h.redo().seq,'AACCTGATAACC');
});
test('circular edit rejects deletion of an ordinary annotation inside wrapped gap',()=>{
 const w={name:'circle',topology:'circular',seq:'AACCGGTTAACC',
   features:[{name:'origin',start:10,end:3,type:'CDS'},
             {name:'gap-cds',start:5,end:6,type:'CDS'}]};
 assert.throws(()=>applySequenceRevision(w,'AACCTTAACC'),/erase an annotation/);
 assert.equal(w.seq,'AACCGGTTAACC');
});
