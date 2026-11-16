import test from 'node:test';
import assert from 'node:assert/strict';
import {mismatchBindingSites,mismatchPrimerPairScreen} from '../src/core/primer-mismatch.mjs';

test('exact forward and reverse binding report expected coordinates',()=>{
  assert.deepEqual(mismatchBindingSites('ACGTTT','ACG',{maxMismatches:0}).map(x=>x.start),[0]);
  assert.deepEqual(mismatchBindingSites('ACGTTT','AAC',{strand:'reverse',maxMismatches:0}).map(x=>x.start),[2]);
});
test('single internal mismatch allowed with exact three-prime last two bases',()=>{
  const hits=mismatchBindingSites('ATGCC','ACGCC',{maxMismatches:1,protected3Prime:2});
  assert.equal(hits.length,1);
  assert.deepEqual(hits[0].primerMismatchPositions,[1]);
});
test('3 prime mismatch is prohibited despite mismatch budget',()=>{
  assert.deepEqual(mismatchBindingSites('ATGCT','ATGCC',{maxMismatches:1,protected3Prime:1}),[]);
  assert.equal(mismatchBindingSites('ATGCT','ATGCC',{maxMismatches:1,protected3Prime:0}).length,1);
});
test('reverse-strand primer mismatch positions are given in 5 prime orientation',()=>{
  const hits=mismatchBindingSites('GGATT','AGCC',{strand:'reverse',maxMismatches:1,protected3Prime:1});
  assert.equal(hits.length,1);
  assert.deepEqual(hits[0].primerMismatchPositions,[1]);
});
test('origin-spanning circular binding is found; linear binding is not',()=>{
  assert.deepEqual(mismatchBindingSites('TTACG','GTT',{circular:true,maxMismatches:0}).map(x=>x.start),[4]);
  assert.deepEqual(mismatchBindingSites('TTACG','GTT',{maxMismatches:0}),[]);
});
test('candidate ordering sorts perfect matches before mismatches',()=>{
  const r=mismatchBindingSites('ACGATG','ATG',{maxMismatches:1,protected3Prime:1});
  assert.equal(r[0].mismatches,0);
  assert.equal(r[0].start,3);
  assert.equal(r[1].mismatches,1);
});
test('validation rejects ambiguous templates, invalid options and excessive hits',()=>{
  assert.throws(()=>mismatchBindingSites('ACGN','ACG'),/Invalid DNA base/);
  assert.throws(()=>mismatchBindingSites('ACG','ACG',{maxMismatches:-1}),/Invalid maxMismatches/);
  assert.throws(()=>mismatchBindingSites('ACG','ACG',{protected3Prime:4}),/exceed primer/);
  assert.throws(()=>mismatchBindingSites('AAAA','A',{maxMismatches:0,protected3Prime:1,maxHits:2}),/limit exceeded/);
});
test('pair screen returns both strands and explicit scope warning',()=>{
  const s=mismatchPrimerPairScreen('ACGTTT','ACG','AAC',{maxMismatches:0});
  assert.deepEqual(s.summary,{forwardCount:1,reverseCount:1,forwardPerfect:1,reversePerfect:1});
  assert.match(s.warning,/not thermodynamic/);
});
