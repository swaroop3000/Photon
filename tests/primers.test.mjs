import test from 'node:test';
import assert from 'node:assert/strict';
import {primerMetrics,primerBindingSites,virtualPCRProducts} from '../src/core/primers.mjs';
test('GC and Wallace Tm for short oligos',()=>{
 const r=primerMetrics('ATGCAT');
 assert.equal(r.length,6);assert.equal(r.gcPercent,100*2/6);
 assert.equal(r.approxTmC,16);assert.equal(r.method,'Wallace rule');
});
test('longer oligos use explicit empirical approximation',()=>{
 const r=primerMetrics('ATGCCGTAACCTGGATTCGA');
 assert.equal(r.length,20);assert.equal(r.method,'simple long-oligo approximation');
 assert.ok(Number.isFinite(r.approxTmC));
});
test('reverse primer binds reverse complement of template sequence',()=>{
 assert.deepEqual(primerBindingSites('ATGCCCTTAA','TTAA',{strand:'forward'}).map(x=>x.start),[6]);
 assert.deepEqual(primerBindingSites('ATGCCCTTAA','TTAA',{strand:'reverse'}).map(x=>x.start),[6]);
 assert.deepEqual(primerBindingSites('ATGCCCTTAA','GGGC',{strand:'reverse'}).map(x=>x.start),[2]);
});
test('linear PCR returns exact product and positions',()=>{
 const r=virtualPCRProducts('ATGCCCGGGTTTAA','ATGCCC','TTAAAC');
 assert.equal(r.length,1);
 assert.deepEqual([r[0].start,r[0].end,r[0].length],[0,14,14]);
 assert.equal(r[0].sequence,'ATGCCCGGGTTTAA');
});
test('repeated sites report multiple products',()=>{
 const s='AAAAAACCCCCCAAAAAACCCCCC';
 const r=virtualPCRProducts(s,'AAAAAA','GGGGGG');
 assert.ok(r.length>1);assert.equal(r[0].length,12);
});
test('circular PCR wraps around origin',()=>{
 const seq='GGGTTTAAACCC';
 const r=virtualPCRProducts(seq,'AAACCC','AAACCC',{circular:true});
 assert.ok(r.some(p=>p.wrapsOrigin));
 assert.ok(r.every(p=>p.length<=seq.length));
});
test('invalid bases and strand selection are rejected',()=>{
 assert.throws(()=>primerMetrics('ATGN'),/Invalid DNA base/);
 assert.throws(()=>primerBindingSites('ATGC','AT',{strand:'x'}),/Unknown primer strand/);
 assert.throws(()=>virtualPCRProducts('ATGC','A','T',{maxProducts:0}),/Invalid maxProducts/);
});
test('self dimer and hairpin flags are explicitly heuristic',()=>{
 const r=primerMetrics('GCGCGCGCGCGC');
 assert.equal(typeof r.possibleSelfDimer,'boolean');
 assert.equal(typeof r.possibleHairpin,'boolean');
 assert.match(r.warning,/Approximate/);
});
