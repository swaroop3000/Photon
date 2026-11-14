import test from 'node:test';
import assert from 'node:assert/strict';
import {createPartLibrary,addLibraryPart,addLibraryAssembly} from '../src/core/part-library.mjs';
import {circuitIntoCircularBackbone} from '../src/core/circular-backbone.mjs';
import {serializeGenbank,parseGenbank} from '../src/core/feature-io.mjs';
function library(){
 let l=createPartLibrary();
 l=addLibraryPart(l,{id:'prom',sequence:'ATGC'});
 l=addLibraryPart(l,{id:'report',sequence:'AAGT'});
 l=addLibraryAssembly(l,{id:'circuit',placements:[
  {ref:'prom',strand:1},{ref:'report',strand:-1}]});
 return l;
}
const base=()=>({name:'pBackbone',seq:'AACCGGTTAACC',topology:'circular',features:[
 {name:'upstream',start:1,end:3,strand:1,type:'promoter',qualifiers:{gene:'a'}},
 {name:'downstream',start:9,end:11,strand:-1,type:'CDS',qualifiers:{product:'b'}}
]});
test('insertion between annotated regions preserves backbone and oriented circuit features',()=>{
 const before=base(),lib=library();
 const actual=circuitIntoCircularBackbone(lib,'circuit',before,{boundary:6});
 assert.equal(actual.seq,'AACCGGATGCACTTTTAACC');
 assert.equal(actual.topology,'circular');
 assert.deepEqual(actual.features.map(f=>[f.name,f.start,f.end,f.strand]),[
 ['upstream',1,3,1],['downstream',17,19,-1],
 ['prom',7,10,1],['report',11,14,-1]]);
 assert.deepEqual(actual.features[1].qualifiers,{product:'b'});
 assert.equal(before.seq,'AACCGGTTAACC');
 assert.equal(before.features[1].start,9);
});
test('insertion keeps an origin-spanning feature wrapped, moving only downstream arm',()=>{
 const b=base();
 b.features=[{name:'origin feature',start:10,end:2,strand:-1,type:'CDS'}];
 const actual=circuitIntoCircularBackbone(library(),'circuit',b,{boundary:6});
 assert.deepEqual([actual.features[0].start,actual.features[0].end],[18,2]);
 assert.equal(actual.features[0].strand,-1);
 assert.deepEqual(parseGenbank(serializeGenbank(actual)).features,actual.features);
});
test('rejects boundaries that cut backbone feature arms or their circular origin',()=>{
 const b=base();
 assert.throws(()=>circuitIntoCircularBackbone(library(),'circuit',b,{boundary:2}),/split backbone feature/);
 b.features=[{name:'wrapped',start:10,end:2,strand:1}];
 for(const boundary of [0,1,10,11,12])
  assert.throws(()=>circuitIntoCircularBackbone(library(),'circuit',b,{boundary}),/split backbone feature/);
});
test('accepts junction at exact end of nonwrapped feature',()=>{
 const b=base();
 const actual=circuitIntoCircularBackbone(library(),'circuit',b,{boundary:3});
 assert.equal(actual.features[0].end,3);
 assert.equal(actual.features[1].start,17);
 assert.equal(actual.features[2].start,4);
});
test('invalid topology, boundary and root are rejected without mutation',()=>{
 const b=base(),snapshot=JSON.stringify(b);
 assert.throws(()=>circuitIntoCircularBackbone(library(),'circuit',{...b,topology:'linear'},{boundary:6}),/Circular backbone/);
 assert.throws(()=>circuitIntoCircularBackbone(library(),'circuit',b,{boundary:-1}),/Insertion boundary/);
 assert.throws(()=>circuitIntoCircularBackbone(library(),'circuit',b,{boundary:12.5}),/Insertion boundary/);
 assert.throws(()=>circuitIntoCircularBackbone(library(),'missing',b,{boundary:6}),/Unknown library reference/);
 assert.equal(JSON.stringify(b),snapshot);
});
