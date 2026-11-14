import test from 'node:test';
import assert from 'node:assert/strict';
import {createPartLibrary,addLibraryPart,addLibraryAssembly,
 resolveLibraryAssembly,serializePartLibrary,parsePartLibrary} from '../src/core/part-library.mjs';
function sample(){
 let l=createPartLibrary();
 for(const [id,sequence] of [['promoter','ATGC'],['reporter','AAGT'],['terminator','CCAA']])
  l=addLibraryPart(l,{id,sequence});
 l=addLibraryAssembly(l,{id:'cassette',placements:[
   {ref:'promoter',strand:1},{ref:'reporter',strand:1}]});
 l=addLibraryAssembly(l,{id:'circuit',placements:[
   {ref:'cassette',strand:1},{ref:'terminator',strand:-1},
   {ref:'reporter',strand:1}]});
 return l;
}
test('nested assemblies flatten in order with reused references',()=>{
 const result=resolveLibraryAssembly(sample(),'circuit');
 assert.equal(result.sequence,'ATGCAAGTTTGG AAGT'.replaceAll(' ',''));
 assert.deepEqual(result.parts.map(x=>[x.id,x.start,x.end]),[
  ['promoter',1,4],['reporter',5,8],['terminator',9,12],['reporter',13,16]]);
 assert.deepEqual(result.parts[0].path,['circuit','cassette','promoter']);
});
test('negative orientation reverses nested order and strands',()=>{
 let l=sample();
 l=addLibraryAssembly(l,{id:'flipped',placements:[{ref:'cassette',strand:-1}]});
 const r=resolveLibraryAssembly(l,'flipped');
 assert.deepEqual(r.parts.map(x=>[x.id,x.strand]),[['reporter',-1],['promoter',-1]]);
 assert.equal(r.sequence,'ACTTGCAT');
});
test('library IDs are immutable and duplicate definitions fail',()=>{
 const l=sample();
 assert.throws(()=>addLibraryPart(l,{id:'reporter',sequence:'ATGC'}),/Duplicate/);
 assert.throws(()=>addLibraryAssembly(l,{id:'circuit',placements:[{ref:'promoter'}]}),/Duplicate/);
 assert.equal(l.parts.reporter.sequence,'AAGT');
});
test('detects cycles, missing references and depth limits',()=>{
 let l=createPartLibrary();
 l=addLibraryAssembly(l,{id:'A',placements:[{ref:'B'}]});
 l=addLibraryAssembly(l,{id:'B',placements:[{ref:'A'}]});
 assert.throws(()=>resolveLibraryAssembly(l,'A'),/Circular assembly reference/);
 let m=createPartLibrary();
 m=addLibraryAssembly(m,{id:'root',placements:[{ref:'missing'}]});
 assert.throws(()=>resolveLibraryAssembly(m,'root'),/Unknown library reference/);
 assert.throws(()=>resolveLibraryAssembly(sample(),'circuit',{maxDepth:1}),/depth exceeded/);
});
test('safe JSON roundtrip preserves nested references and sequences',()=>{
 const a=sample(),b=parsePartLibrary(serializePartLibrary(a));
 assert.deepEqual(b,a);
 assert.deepEqual(resolveLibraryAssembly(b,'circuit'),resolveLibraryAssembly(a,'circuit'));
});
test('malformed IDs and sequence inputs are rejected',()=>{
 assert.throws(()=>addLibraryPart(createPartLibrary(),{id:'bad space',sequence:'ATGC'}),/IDs/);
 assert.throws(()=>addLibraryPart(createPartLibrary(),{id:'OK',sequence:'ATG?'}),/Invalid DNA base/);
 assert.throws(()=>parsePartLibrary('not JSON'),/Invalid part library JSON/);
 assert.throws(()=>parsePartLibrary(JSON.stringify({...sample(),format:'other'})),/Invalid Photon part library/);
});
