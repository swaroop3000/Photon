import test from 'node:test';
import assert from 'node:assert/strict';
import {serializePhotonSbol,parsePhotonSbol} from '../src/core/sbol-io.mjs';
const fixture={name:'p&<Demo>',seq:'AACCGGTTAACC',topology:'circular',features:[
 {name:'ori & "tag"',type:'CDS',start:10,end:3,strand:1,qualifiers:{gene:'abc&<>'}},
 {name:'reverse',type:'promoter',start:9,end:2,strand:-1},
 {name:'normal',type:'misc',start:4,end:6,strand:1}]};
test('roundtrip preserves sequence topology annotations qualifiers and XML metacharacters',()=>{
 const xml=serializePhotonSbol(fixture),parsed=parsePhotonSbol(xml);
 assert.deepEqual(parsed,fixture);
 assert.match(xml,/&amp;/);
 assert.match(xml,/photon:topology>circular/);
});
test('linear reverse strand remains reverse strand',()=>{
 const input={name:'linear',topology:'linear',seq:'AACCGG',features:[{name:'r',type:'primer',start:2,end:5,strand:-1}]};
 assert.deepEqual(parsePhotonSbol(serializePhotonSbol(input)),input);
});
test('unsupported external SBOL input fails explicitly',()=>{
 assert.throws(()=>parsePhotonSbol('<sbol:SBOL/>'),/Unsupported SBOL/);
});
test('invalid circular and linear coordinates fail',()=>{
 assert.throws(()=>serializePhotonSbol({...fixture,topology:'linear'}),/circular DNA/);
 assert.throws(()=>serializePhotonSbol({...fixture,features:[{name:'x',start:0,end:2}]}),/1-based/);
});
test('invalid qualifiers are not silently converted or discarded',()=>{
 assert.throws(()=>serializePhotonSbol({...fixture,features:[{name:'a',type:'CDS',start:2,end:3,qualifiers:{gene:3}}]}),/qualifier/);
});
test('rejects invalid topology and DNA bases',()=>{
 assert.throws(()=>serializePhotonSbol({...fixture,topology:'other'}),/topology/);
 assert.throws(()=>serializePhotonSbol({...fixture,seq:'ACNX'}),/Invalid DNA base/);
});
