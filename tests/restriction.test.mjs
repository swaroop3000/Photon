import test from 'node:test';
import assert from 'node:assert/strict';
import {restrictionSites,virtualDigest,TYPE_II_ENZYMES} from '../src/core/restriction.mjs';
test('EcoRI cut positions and 5-prime overhang',()=>{
 const [s]=restrictionSites('TTGAATTCAA',['EcoRI']);
 assert.deepEqual([s.start,s.topCut,s.bottomCut,s.overhangLength,s.overhangType],[2,3,7,4,'5-prime']);
});
test('blunt cutter EcoRV maps symmetric cut',()=>{
 const [s]=restrictionSites('GATATC',['EcoRV']);
 assert.deepEqual([s.topCut,s.bottomCut,s.overhangType],[3,3,'blunt']);
});
test('PstI produces a 3-prime overhang',()=>{
 const [s]=restrictionSites('CTGCAG',['PstI']);
 assert.deepEqual([s.topCut,s.bottomCut,s.overhangType,s.overhangLength],[5,1,'3-prime',4]);
});
test('linear digest returns sorted fragment lengths',()=>{
 assert.deepEqual(virtualDigest('TTGAATTCAA',['EcoRI']).fragments,[7,3]);
 assert.deepEqual(virtualDigest('AAAAAA',['EcoRI']).fragments,[6]);
});
test('circular recognition across origin maps cut modulo length',()=>{
 const s=restrictionSites('AATT CG'.replace(' ',''),['EcoRI'],{circular:true});
 assert.equal(s.length,1);
 assert.deepEqual([s[0].start,s[0].topCut,s[0].bottomCut,s[0].wrapsOrigin],[5,0,4,true]);
 assert.deepEqual(virtualDigest('AATTCG',['EcoRI'],{circular:true}).fragments,[6]);
});
test('circular double digest fragments sum to full sequence length',()=>{
 const s='GAATTCGGATCC';
 const d=virtualDigest(s,['EcoRI','BamHI'],{circular:true});
 assert.deepEqual(d.fragments,[6,6]);
 assert.equal(d.fragments.reduce((a,b)=>a+b,0),s.length);
});
test('linear boundary cuts never yield phantom zero fragments',()=>{
 assert.deepEqual(virtualDigest('GATATC',['EcoRV']).fragments,[3,3]);
 assert.deepEqual(virtualDigest('GAATTC',['EcoRI']).fragments,[5,1]);
});
test('unknown enzymes and ambiguous sequence are rejected explicitly',()=>{
 assert.throws(()=>restrictionSites('GAATTC',['NotARealEnzyme']),/Unknown enzyme/);
 assert.throws(()=>restrictionSites('GAANTC',['EcoRI']),/Invalid DNA base/);
 assert.throws(()=>restrictionSites('GAATTC',['bad'],{enzymes:{bad:{recognition:'AAAA',topCut:1,bottomCut:3}}}),/palindromic/);
});
test('enzyme registry contains curated and bounded enzymes',()=>{
 assert.equal(Object.keys(TYPE_II_ENZYMES).length,7);
 assert.deepEqual(virtualDigest('',['EcoRI']).fragments,[]);
});
