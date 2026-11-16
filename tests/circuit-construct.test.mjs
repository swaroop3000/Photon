import test from 'node:test';
import assert from 'node:assert/strict';
import {createPartLibrary,addLibraryPart,addLibraryAssembly} from '../src/core/part-library.mjs';
import {circuitToConstruct} from '../src/core/circuit-construct.mjs';
function fixture(){
 let lib=createPartLibrary();
 for(const [id,sequence] of [['prom','ATGC'],['gene','AAGT'],['term','CCAA']])
   lib=addLibraryPart(lib,{id,sequence});
 lib=addLibraryAssembly(lib,{id:'cassette',placements:[
   {ref:'prom',strand:1},{ref:'gene',strand:1}]});
 lib=addLibraryAssembly(lib,{id:'circuit',placements:[
   {ref:'cassette',strand:1},{ref:'term',strand:-1},{ref:'cassette',strand:-1}]});
 return lib;
}
const old=()=>({name:'Original',seq:'AACCGG',topology:'circular',
 features:[{name:'old',start:1,end:3,strand:1,type:'CDS'}]});
test('circuit conversion produces linear sequence and complete 1-based annotations',()=>{
 const result=circuitToConstruct(fixture(),'circuit',old());
 assert.equal(result.seq,'ATGCAAGTTTGGACTTGCAT');
 assert.equal(result.topology,'linear');
 assert.equal(result.name,'circuit');
 assert.deepEqual(result.features.map(f=>[f.start,f.end,f.strand]),[
   [1,4,1],[5,8,1],[9,12,-1],[13,16,-1],[17,20,-1]]);
 assert.ok(result.features.every(f=>f.type==='misc_feature'&&f.qualifiers.note.includes('source path')));
});
test('conversion does not mutate original plasmid or library',()=>{
 const source=old(),library=fixture();
 const a=JSON.stringify(source),b=JSON.stringify(library);
 const result=circuitToConstruct(library,'circuit',source,{name:'NewConstruct'});
 assert.equal(result.name,'NewConstruct');
 assert.equal(JSON.stringify(source),a);
 assert.equal(JSON.stringify(library),b);
});
test('invalid root and missing references are rejected',()=>{
 assert.throws(()=>circuitToConstruct(fixture(),'prom',old()),/root must be an assembly/);
 let library=fixture();
 library.assemblies.circuit.placements[0].ref='missing';
 assert.throws(()=>circuitToConstruct(library,'circuit',old()),/Unknown library reference/);
});
test('refuses malformed target names and working constructs',()=>{
 assert.throws(()=>circuitToConstruct(fixture(),'circuit',{seq:'AA'}),/Working Photon construct/);
 assert.throws(()=>circuitToConstruct(fixture(),'circuit',old(),{name:' '}),/target construct name/);
});
