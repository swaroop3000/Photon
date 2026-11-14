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
