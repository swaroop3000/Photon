import test from 'node:test';
import assert from 'node:assert/strict';
import {createPartLibrary,addLibraryPart,addLibraryAssembly,resolveLibraryAssembly} from '../src/core/part-library.mjs';
import {editCircuitPlacements} from '../src/core/circuit-editor.mjs';
function fixture(){
 let lib=createPartLibrary();
 for(const [id,sequence] of [['prom','ATGC'],['gene','AAGT'],['term','CCAA']])
  lib=addLibraryPart(lib,{id,sequence});
 lib=addLibraryAssembly(lib,{id:'cassette',placements:[{ref:'prom',strand:1},{ref:'gene',strand:1}]});
 lib=addLibraryAssembly(lib,{id:'circuit',placements:[{ref:'cassette',strand:1},{ref:'term',strand:1}]});
 return lib;
}
test('move reorders placements immutably with updated DNA',()=>{
 const original=fixture(),result=editCircuitPlacements(original,'circuit',{type:'move',index:1,to:0});
 assert.deepEqual(result.assemblies.circuit.placements.map(x=>x.ref),['term','cassette']);
 assert.equal(resolveLibraryAssembly(result,'circuit').sequence,'CCAAATGCAAGT');
 assert.equal(resolveLibraryAssembly(original,'circuit').sequence,'ATGCAAGTCCAA');
});
test('reverse flips a nested cassette and respects child order',()=>{
 const next=editCircuitPlacements(fixture(),'circuit',{type:'reverse',index:0});
 assert.equal(resolveLibraryAssembly(next,'circuit').sequence,'ACTTGCATCCAA');
 assert.equal(next.assemblies.circuit.placements[0].strand,-1);
});
test('insert same part multiple times without duplicate definitions',()=>{
 const next=editCircuitPlacements(fixture(),'circuit',{
  type:'insert',index:1,placement:{ref:'prom',strand:1}});
 assert.deepEqual(next.assemblies.circuit.placements.map(x=>x.ref),['cassette','prom','term']);
 assert.equal(Object.keys(next.parts).length,3);
});
test('remove leaves valid sequence and prevents deleting last placement',()=>{
 let next=editCircuitPlacements(fixture(),'circuit',{type:'remove',index:0});
 assert.equal(resolveLibraryAssembly(next,'circuit').sequence,'CCAA');
 assert.throws(()=>editCircuitPlacements(next,'circuit',{type:'remove',index:0}),/at least one/);
});
test('invalid edits cannot modify the input or introduce circular references',()=>{
 const original=fixture(),snapshot=JSON.stringify(original);
 assert.throws(()=>editCircuitPlacements(original,'cassette',{
  type:'insert',index:0,placement:{ref:'circuit',strand:1}}),/Circular assembly reference/);
 assert.throws(()=>editCircuitPlacements(original,'circuit',{
  type:'insert',index:0,placement:{ref:'missing',strand:1}}),/Unknown library reference/);
 assert.throws(()=>editCircuitPlacements(original,'circuit',{type:'move',index:0,to:4}),/Invalid move/);
 assert.throws(()=>editCircuitPlacements(original,'circuit',{type:'reverse',index:-1}),/Invalid reverse/);
 assert.equal(JSON.stringify(original),snapshot);
});
