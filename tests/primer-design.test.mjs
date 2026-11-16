import test from 'node:test';
import assert from 'node:assert/strict';
import {designPrimerPairs} from '../src/core/primer-design.mjs';
const SEQ='ATGCCGATCGTACGTTAGCTAGGTACCTAGCTGATCGATGCTAGTCAGTCACTAGCTAGTCGATGACCTGTACGATCGTTAACGTAGCTAGCTAGCTACGATTGCATCGATACGTAGGCTAGCATGCTAGTCAGTACGATCGCTAGTCCGATGCTAGCTAGCATCGTAGCTGAC';
test('generates ordered, unique-binding candidates and exact amplicons',()=>{
 const pairs=designPrimerPairs(SEQ,{minProduct:80,maxProduct:200,maxPairs:8});
 assert.ok(pairs.length>0);
 for(const p of pairs){
   assert.equal(p.amplicon.length,p.reverse.end-p.forward.start);
   assert.equal(p.amplicon.sequence,SEQ.slice(p.forward.start,p.reverse.end));
   assert.ok(p.reverse.start>=p.forward.end);
 }
});
test('templates shorter than required product return no candidates',()=>{
 assert.deepEqual(designPrimerPairs('ATGCATGC'),[]);
});
test('highly repetitive template fails unique primer binding rule',()=>{
 assert.deepEqual(designPrimerPairs('ATGC'.repeat(60),{minProduct:60,maxProduct:200}),[]);
});
test('invalid nucleotide and invalid constraints are rejected',()=>{
 assert.throws(()=>designPrimerPairs('ACGN'.repeat(40)),/Invalid DNA base/);
 assert.throws(()=>designPrimerPairs(SEQ,{minLength:30,maxLength:18}),/Invalid primer design/);
 assert.throws(()=>designPrimerPairs(SEQ,{maxPairs:0}),/Invalid primer design/);
});
test('candidate results are reproducible, scored and bounded',()=>{
 const a=designPrimerPairs(SEQ,{minProduct:80,maxProduct:200,maxPairs:4});
 const b=designPrimerPairs(SEQ,{minProduct:80,maxProduct:200,maxPairs:4});
 assert.deepEqual(a,b);assert.ok(a.length<=4);
 for(let i=1;i<a.length;i++)assert.ok(a[i].score>=a[i-1].score);
});
