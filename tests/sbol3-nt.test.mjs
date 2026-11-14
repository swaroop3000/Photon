import test from 'node:test';
import assert from 'node:assert/strict';
import {serializeSbol3NTriples,parseSbol3NTriples} from '../src/core/sbol3-nt.mjs';
const w={name:'pTest',seq:'AACCGGTTAACC',topology:'circular',features:[
 {name:'origin crossing',type:'CDS',start:10,end:3,strand:-1,qualifiers:{gene:'bla',note:'works "well"'}},
 {name:'prom',type:'promoter',start:4,end:7,strand:1}
]};
test('SBOL3 N-Triples graph models one component and a linked IUPAC DNA sequence',()=>{
 const text=serializeSbol3NTriples(w);
 assert.match(text,/<http:\/\/sbols.org\/v3#Component>/);
 assert.match(text,/<https:\/\/identifiers.org\/SBO:0000251>/);
 assert.match(text,/<https:\/\/identifiers.org\/edam:format_1207>/);
 assert.match(text,/<http:\/\/sbols.org\/v3#hasFeature>/);
});
test('SBOL3 roundtrip retains circular origin-spanning annotations and qualifiers',()=>{
 const decoded=parseSbol3NTriples(serializeSbol3NTriples(w));
 assert.deepEqual(decoded,w);
});
test('linear, reverse orientation, no features',()=>{
 const x={name:'Linear',seq:'ATGCATGC',topology:'linear',features:[]};
 assert.deepEqual(parseSbol3NTriples(serializeSbol3NTriples(x)),x);
});
test('reject incompatible ranges and missing nodes',()=>{
 const encoded=serializeSbol3NTriples(w);
 assert.throws(()=>parseSbol3NTriples(encoded.replace('<http://sbols.org/v3#Range>','<http://sbols.org/v3#Cut>')),/Invalid Range/);
 assert.throws(()=>parseSbol3NTriples('not ntriples'),/Unsupported N-Triples/);
});
test('invalid topology and feature coordinates are rejected',()=>{
 assert.throws(()=>serializeSbol3NTriples({...w,topology:'weird'}),/topology/);
 assert.throws(()=>serializeSbol3NTriples({...w,topology:'linear'}),/circular DNA/);
});
