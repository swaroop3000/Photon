import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeConstructQC,serializeQCReport} from '../src/core/construct-qc.mjs';
const source=(seq,features=[],topology='linear')=>({name:'qc-demo',seq,topology,features});
test('calculates exact composition and GC fraction',()=>{
 const r=analyzeConstructQC(source('AACCGGTT'));
 assert.deepEqual(r.baseCounts,{A:2,C:2,G:2,T:2});
 assert.equal(r.gcFraction,0.5);
 assert.equal(r.length,8);
 assert.equal(r.featureCount,0);
 assert.match(serializeQCReport(r),/photon\/construct-qc\/1/);
});
test('valid CDS with stop passes frame, start, stop and internal stop checks',()=>{
 const r=analyzeConstructQC(source('ATGAAATAA',[{name:'cds',type:'CDS',start:1,end:9,strand:1}]));
 assert.deepEqual(r.features[0].problems,[]);
 assert.equal(r.warnings.length,0);
});
test('identifies internal stop and invalid reading frame without mutating original',()=>{
 const w=source('ATGTAATAAA',[{name:'cds',type:'CDS',start:1,end:10,strand:1}]);
 const before=JSON.stringify(w);
 const r=analyzeConstructQC(w);
 assert.ok(r.features[0].problems.includes('CDS_FRAME'));
 assert.ok(r.features[0].problems.includes('CDS_INTERNAL_STOP'));
 assert.equal(JSON.stringify(w),before);
});
test('supports reverse strand and origin crossing features',()=>{
 const w=source('TAACCCATG',[{name:'reverse',type:'CDS',start:7,end:3,strand:1}], 'circular');
 const r=analyzeConstructQC(w);
 assert.equal(r.features[0].length,6);
 assert.equal(r.features[0].valid,true);
 assert.deepEqual(r.features[0].problems,[]);
});
test('flags invalid feature coordinates without crashing other QC checks',()=>{
 const r=analyzeConstructQC(source('ATGC',[{name:'invalid',type:'CDS',start:5,end:1}]));
 assert.equal(r.features[0].valid,false);
 assert.equal(r.warnings[0].code,'INVALID_FEATURE');
});
test('finds homopolymer and tandem repeats',()=>{
 const r=analyzeConstructQC(source('AAAAAAAAAAAACACACACACACA'),{repeatLimit:10});
 assert.ok(r.repeats.homopolymers.some(h=>h.base==='A'&&h.length>=8));
 assert.ok(r.repeats.tandem.some(t=>t.motif==='AC'&&t.copies>=4));
});
test('predicts a complete ORF on plus strand',()=>{
 const dna='ATG'+'AAA'.repeat(30)+'TAA';
 const r=analyzeConstructQC(source(dna),{orfMinAminoAcids:30});
 assert.ok(r.predictedOrfs.some(x=>x.start===1&&x.end===dna.length&&x.strand===1));
});
test('rejects empty, malformed, or oversized option inputs',()=>{
 assert.throws(()=>analyzeConstructQC(source('')),/empty/);
 assert.throws(()=>analyzeConstructQC(source('AAX')),/Invalid DNA base/);
 assert.throws(()=>analyzeConstructQC(source('ATGC'),{repeatLimit:0}),/repeatLimit/);
 assert.throws(()=>analyzeConstructQC({seq:'ATGC',topology:'linear'}),/Working construct/);
});


test('reports adjacent annotated junction sequences without claiming validation',()=>{
 const r=analyzeConstructQC(source('ATGCCGTTAA',[
  {name:'partA',type:'misc_feature',start:1,end:4,strand:1},
  {name:'partB',type:'misc_feature',start:5,end:10,strand:-1}
 ]));
 assert.equal(r.annotationJunctions.length,1);
 assert.equal(r.annotationJunctions[0].boundary,4);
 assert.match(r.annotationJunctions[0].flanks,/\|/);
 assert.match(r.annotationJunctions[0].assessment,/not supplied/);
});
test('detects adjacency at the circular sequence origin',()=>{
 const r=analyzeConstructQC(source('ATGCCGTTAA',[
  {name:'end',start:7,end:10,type:'misc_feature'},
  {name:'begin',start:1,end:3,type:'misc_feature'}
 ],'circular'));
 assert.ok(r.annotationJunctions.some(j=>j.leftFeature==='end'&&j.rightFeature==='begin'&&j.boundary===0));
});
test('bounds annotation workload on untrusted inputs',()=>{
 const f=Array.from({length:2001},(_,i)=>({name:'part'+i,start:1,end:1,type:'misc_feature'}));
 assert.throws(()=>analyzeConstructQC(source('ATGC',f)),/2,000 annotations/);
});
