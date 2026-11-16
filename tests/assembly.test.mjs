import test from 'node:test';
import assert from 'node:assert/strict';
import { overlapLengths, assembleOverlaps } from '../src/core/assembly.mjs';
const A='ATGCCGTAACCTGGA';
const B='GATTCCTACGGAATC';
test('ordered 15-bp assembly joins two fragments without duplicating overlap',()=>{
 const r=assembleOverlaps(['TT'+A,A+'GG']);
 assert.equal(r.sequence,'TT'+A+'GG');
 assert.deepEqual(r.junctions.map(j=>j.overlap),[15]);
 assert.equal(r.circular,false);
});
test('three fragments preserve order and report both junctions',()=>{
 const r=assembleOverlaps(['TT'+A,A+'CC'+B,'CC'+B+'AA']);
 assert.equal(r.sequence,'TT'+A+'CC'+B+'AA');
 assert.deepEqual(r.junctions.map(j=>j.overlap),[15,17]);
});
test('missing overlaps are rejected rather than concatenated',()=>{
 assert.throws(()=>assembleOverlaps(['TT'+A,B+'CC']),/Missing overlap/);
});
test('repeated sequence overlaps must be explicitly accepted',()=>{
 const x='A'.repeat(20);
 assert.deepEqual(overlapLengths(x+'T','T'+x,{minOverlap:1,maxOverlap:4}),[1]);
 assert.throws(()=>assembleOverlaps(['GG'+x,x+'TT'],{minOverlap:15}),/Ambiguous overlap/);
 assert.equal(assembleOverlaps(['GG'+x,x+'TT'],{minOverlap:15,requireUniqueOverlap:false}).sequence,'GG'+x+'TT');
});
test('ambiguous nucleotides, empty fragments, and invalid bounds are rejected',()=>{
 assert.throws(()=>assembleOverlaps(['TT'+A,A+'NN']),/Invalid DNA base/);
 assert.throws(()=>assembleOverlaps(['TT'+A,'']),/Empty/);
 assert.throws(()=>assembleOverlaps([A]),/At least two/);
 assert.throws(()=>overlapLengths(A,B,{minOverlap:0}),/Invalid overlap/);
});
test('circularization requires a distinct terminal overlap',()=>{
 const r=assembleOverlaps([A+'GG'+B, B+'TT'+A],{circularize:true});
 assert.equal(r.circular,true);
 assert.equal(r.sequence,A+'GG'+B+'TT');
 assert.equal(r.junctions.length,2);
});
test('circularization rejects missing terminal overlap',()=>{
 assert.throws(()=>assembleOverlaps(['TT'+A,A+'GG'],{circularize:true}),/terminal overlap/);
});
