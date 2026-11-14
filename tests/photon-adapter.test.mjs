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
