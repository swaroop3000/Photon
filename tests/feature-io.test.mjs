import test from 'node:test';
import assert from 'node:assert/strict';
import {validateFeature,circularFeatureSequence,genbankFeatureLocation,
 parseGenbankFeatureLocation,serializeGenbank,parseGenbank} from '../src/core/feature-io.mjs';
const w={name:'photon-demo',seq:'AACCGGTTAACC',topology:'circular',features:[
 {name:'crossing',type:'CDS',start:10,end:3,strand:1},
 {name:'reverse',type:'promoter',start:9,end:2,strand:-1},
 {name:'normal',type:'misc_feature',start:4,end:6,strand:1}]};
test('circular extraction preserves origin traversal and reverse strand',()=>{
 assert.equal(circularFeatureSequence(w.seq,w.features[0],{circular:true}),'ACCAAC');
 assert.equal(circularFeatureSequence(w.seq,w.features[1],{circular:true}),'TTGGTT');
});
test('validation rejects crossing features on linear constructs and invalid bounds',()=>{
 assert.throws(()=>validateFeature({start:10,end:2},12),/circular/);
 assert.throws(()=>validateFeature({start:0,end:2},12,{circular:true}),/1-based/);
 assert.throws(()=>validateFeature({start:13,end:2},12,{circular:true}),/1-based/);
 assert.throws(()=>validateFeature({start:10,end:2,strand:0},12,{circular:true}),/Strand/);
});
test('GenBank locations handle origin and reverse features',()=>{
 assert.equal(genbankFeatureLocation(w.features[0],12,{circular:true}),'join(10..12,1..3)');
 assert.equal(genbankFeatureLocation(w.features[1],12,{circular:true}),'complement(join(9..12,1..2))');
 assert.deepEqual(parseGenbankFeatureLocation('complement(join(9..12,1..2))',12,{circular:true}),
   {start:9,end:2,strand:-1});
});
test('GenBank roundtrip retains topology and feature identity',()=>{
 const result=parseGenbank(serializeGenbank(w));
 assert.equal(result.topology,'circular');assert.equal(result.name,w.name);
 assert.equal(result.seq,w.seq);assert.deepEqual(result.features,w.features);
});
test('invalid or unsupported joined intervals are not silently flattened',()=>{
 assert.throws(()=>parseGenbankFeatureLocation('join(9..11,1..2)',12,{circular:true}),/Unsupported/);
 assert.throws(()=>parseGenbankFeatureLocation('join(9..12,1..2)',12,{circular:false}),/Unsupported/);
 assert.throws(()=>parseGenbankFeatureLocation('join(2..12,1..3)',12,{circular:true}),/cross origin/);
});
test('linear feature roundtrip remains linear',()=>{
 const linear={name:'linear',seq:'AACCGG',topology:'linear',features:[
 {name:'x',type:'CDS',start:2,end:5,strand:-1}]};
 assert.deepEqual(parseGenbank(serializeGenbank(linear)).features,linear.features);
});


test('GenBank supported qualifiers survive round-trip with coordinates and strands',()=>{
 const input={...w,features:[{...w.features[0],qualifiers:{
   gene:'bla',product:'beta lactamase',note:'annotation checked'}}]};
 const exported=serializeGenbank(input);
 const result=parseGenbank(exported);
 assert.deepEqual(result.features,input.features);
 assert.equal(result.topology,'circular');
 assert.equal(result.seq,input.seq);
});
test('GenBank unsupported qualifiers are rejected instead of silently discarded',()=>{
 assert.throws(()=>serializeGenbank({...w,features:[{...w.features[0],qualifiers:{'not valid':'x'}}]}),
  /Unsupported GenBank qualifier/);
});


const externalGenbank=[
 'LOCUS       EXAMPLE01             24 bp    DNA     circular',
 'DEFINITION  Example external GenBank-style record.',
 'FEATURES             Location/Qualifiers',
 '     source          1..24',
 '                     /organism="synthetic construct"',
 '     CDS             complement(join(21..24,1..4))',
 '                     /gene="testA"',
 '                     /product="synthetic peptide"',
 '     promoter        5..10',
 '                     /label="promA"',
 '                     /note="simple annotation"',
 '     misc_feature    14',
 '                     /label="single base"',
 'ORIGIN',
 '        1 aaccggttaacc ggttaaccggtt',
 '//'
].join('\n');

test('external GenBank-style record imports source, wrapped, reverse and single-base locations',()=>{
 const parsed=parseGenbank(externalGenbank);
 assert.equal(parsed.name,'EXAMPLE01');
 assert.equal(parsed.topology,'circular');
 assert.equal(parsed.seq,'AACCGGTTAACCGGTTAACCGGTT');
 assert.deepEqual(parsed.features,[
  {name:'testA',type:'CDS',start:21,end:4,strand:-1,
   qualifiers:{gene:'testA',product:'synthetic peptide'}},
  {name:'promA',type:'promoter',start:5,end:10,strand:1,
   qualifiers:{note:'simple annotation'}},
  {name:'single base',type:'misc_feature',start:14,end:14,strand:1}
 ]);
 assert.deepEqual(parseGenbank(serializeGenbank(parsed)).features,parsed.features);
});
test('external GenBank unsupported fuzzy, multi-exon or remote features fail closed',()=>{
 for(const bad of ['<4..8','join(2..4,8..12)','AB123:2..5','order(1..2,4..5)']){
   assert.throws(()=>parseGenbank(externalGenbank.replace('5..10',bad)),/Unsupported/);
 }
});
test('external GenBank malformed ORIGIN and mismatched declared length fail',()=>{
 assert.throws(()=>parseGenbank(externalGenbank.replace('24 bp','25 bp')),/length differs/);
 assert.throws(()=>parseGenbank(externalGenbank.replace('aaccggttaacc','aacxggttaacc')),/Invalid DNA base/);
});
test('external GenBank multiline qualifiers are rejected rather than silently truncated',()=>{
 const altered=externalGenbank.replace('/product="synthetic peptide"','/product="synthetic\n                     peptide"');
 assert.throws(()=>parseGenbank(altered),/Unsupported GenBank qualifier|Multiline/);
});
