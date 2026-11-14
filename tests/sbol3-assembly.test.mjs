import test from 'node:test';
import assert from 'node:assert/strict';
import {assembleSbol3Parts,serializeSbol3Assembly,parseSbol3Assembly} from '../src/core/sbol3-assembly.mjs';
const parts=[{id:'promoter',name:'Promoter',sequence:'ATGCCGTAA'},
 {id:'reporter',name:'Reporter',sequence:'AAGTCCGTA',strand:-1},
 {id:'terminator',name:'Terminator',sequence:'TTAACG'}];
test('ordered parts build correct sequence and 1-based placements',()=>{
 const r=assembleSbol3Parts(parts,{name:'Circuit'});
 assert.equal(r.sequence,'ATGCCGTAA'+'TACGGACTT'+'TTAACG');
 assert.deepEqual(r.parts.map(p=>[p.start,p.end]),[[1,9],[10,18],[19,24]]);
});
test('RDF N-Triples assembly roundtrips linked components and reversed part',()=>{
 const r=assembleSbol3Parts(parts,{name:'Circuit'});
 const xml=serializeSbol3Assembly(parts,{name:'Circuit'});
 assert.match(xml,/<http:\/\/sbols.org\/v3#SubComponent>/);
 assert.match(xml,/<http:\/\/sbols.org\/v3#instanceOf>/);
 assert.deepEqual(parseSbol3Assembly(xml),r);
});
test('reject duplicate IDs, malformed strands and empty parts',()=>{
 assert.throws(()=>assembleSbol3Parts([parts[0],parts[0]]),/Duplicate/);
 assert.throws(()=>assembleSbol3Parts([parts[0],{id:'b',sequence:''}]),/Empty/);
 assert.throws(()=>assembleSbol3Parts([parts[0],{id:'b',sequence:'ACT',strand:0}]),/strand/);
});
test('tampering with child sequence fails integrity check',()=>{
 const text=serializeSbol3Assembly(parts,{name:'Circuit'});
 assert.throws(()=>parseSbol3Assembly(text.replace('"aagtccgta"','"ccccccccc"')),/disagrees/);
});
