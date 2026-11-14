import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackboneLibrary,addBackbone,getBackbone,serializeBackboneLibrary,parseBackboneLibrary} from '../src/core/backbone-library.mjs';
const b=()=>({name:'pBase',seq:'AACCGGTTAACC',topology:'circular',features:[
 {name:'ori-wrap',start:10,end:2,strand:-1,type:'rep_origin',qualifiers:{note:'keep me'}}
]});
test('backbones round-trip independently with wrapped annotations',()=>{
 const source=b();
 const lib=addBackbone(createBackboneLibrary(),'backbone1',source);
 source.features[0].name='mutated';
 const loaded=getBackbone(lib,'backbone1');
 assert.equal(loaded.features[0].name,'ori-wrap');
 loaded.features[0].start=4;
 assert.equal(getBackbone(lib,'backbone1').features[0].start,10);
 assert.deepEqual(parseBackboneLibrary(serializeBackboneLibrary(lib)),lib);
});
test('rejects invalid topology, positions, ids and duplicates',()=>{
 assert.throws(()=>addBackbone(createBackboneLibrary(),'bad name',b()),/ID/);
 assert.throws(()=>addBackbone(createBackboneLibrary(),'base',{...b(),topology:'linear'}),/circular/);
 assert.throws(()=>addBackbone(createBackboneLibrary(),'base',{...b(),features:[{name:'x',start:14,end:2}]}),/1-based/);
 const lib=addBackbone(createBackboneLibrary(),'base',b());
 assert.throws(()=>addBackbone(lib,'base',b()),/Duplicate/);
 assert.throws(()=>getBackbone(lib,'other'),/Unknown/);
 assert.throws(()=>parseBackboneLibrary('bad'),/JSON/);
});
