import test from 'node:test';
import assert from 'node:assert/strict';
import {createPartLibrary,addLibraryPart,addLibraryAssembly} from '../src/core/part-library.mjs';
import {serializeHierarchicalSbol3} from '../src/core/sbol3-hierarchy.mjs';
function library(){
 let l=createPartLibrary();
 l=addLibraryPart(l,{id:'promoter',sequence:'ATGC'});
 l=addLibraryPart(l,{id:'gene',sequence:'AAGT'});
 l=addLibraryPart(l,{id:'terminator',sequence:'CCAA'});
 l=addLibraryAssembly(l,{id:'cassette',placements:[
  {ref:'promoter',strand:1},{ref:'gene',strand:1}]});
 l=addLibraryAssembly(l,{id:'circuit',placements:[
  {ref:'cassette',strand:1},{ref:'terminator',strand:-1},
  {ref:'cassette',strand:-1}]});
 return l;
}
test('hierarchical RDF contains nested linked assembly and reusable components',()=>{
 const rdf=serializeHierarchicalSbol3(library(),'circuit');
 assert.match(rdf,/<https:\/\/photon.app\/sbol3\/circuit\/sub1> <http:\/\/sbols.org\/v3#instanceOf> <https:\/\/photon.app\/sbol3\/cassette>/);
 assert.match(rdf,/<https:\/\/photon.app\/sbol3\/cassette\/sub2> <http:\/\/sbols.org\/v3#instanceOf> <https:\/\/photon.app\/sbol3\/gene>/);
 assert.equal((rdf.match(/<https:\/\/photon.app\/sbol3\/cassette> <http:\/\/www.w3.org\/1999\/02\/22-rdf-syntax-ns#type> <http:\/\/sbols.org\/v3#Component>/g)||[]).length,1);
});
test('RDF output is deterministic, with correct parent and child sequences',()=>{
 const first=serializeHierarchicalSbol3(library(),'circuit');
 assert.equal(first,serializeHierarchicalSbol3(library(),'circuit'));
 assert.match(first,/<https:\/\/photon.app\/sbol3\/cassette\/sequence> <http:\/\/sbols.org\/v3#elements> "atgcaagt"/);
 assert.match(first,/<https:\/\/photon.app\/sbol3\/circuit\/sequence> <http:\/\/sbols.org\/v3#elements> "atgcaagtttggacttgcat"/);
});
test('invalid root and missing children are rejected',()=>{
 assert.throws(()=>serializeHierarchicalSbol3(library(),'gene'),/Root must be an assembly/);
 assert.throws(()=>serializeHierarchicalSbol3(library(),'nonexistent'),/Unknown library reference/);
});
