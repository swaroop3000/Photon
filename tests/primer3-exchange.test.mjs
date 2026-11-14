import test from 'node:test';
import assert from 'node:assert/strict';
import {preparePrimer3Request,parsePrimer3Result} from '../src/core/primer3-exchange.mjs';
const dna='ATGCGTACCGTTAGCAATGCCGTAGCTTACGATCGATGCCTGATCGTTACGATCGTTCATCGATCGTTCATGC';
const w={name:'pExample',seq:dna,topology:'linear',features:[]};
test('request uses strict deterministic explicit local Primer3 schema',()=>{
 const r=preparePrimer3Request(w,{minProduct:40,maxProduct:65});
 assert.equal(r.engine,'primer3-py-local');assert.equal(r.sequence,dna);
 assert.equal(r.options.optTm,60);
});
test('invalid product constraints or circular topology rejected',()=>{
 assert.throws(()=>preparePrimer3Request({...w,topology:'circular'}),/linear/);
 assert.throws(()=>preparePrimer3Request(w,{minProduct:80,maxProduct:30}),/Invalid maximum product/);
});
test('valid real-engine-style pair has correct reverse orientation and placement',()=>{
 const fw=dna.slice(0,20),rs=45,reverse=dna.slice(rs,rs+20);
 // Reverse complement is produced by the shared sequence module.
 const complement={A:'T',T:'A',G:'C',C:'G'};
 const rev=[...reverse].reverse().map(c=>complement[c]).join('');
 const obj={format:'photon/primer3-result/1',engine:'primer3-py',
 engineVersion:'2.4.0',template:dna,name:'pExample',
 pairs:[{forward:{sequence:fw,start:0,tm:60},
 reverse:{sequence:rev,start:rs,tm:59.5},productSize:rs+20,pairPenalty:1.25}]};
 const parsed=parsePrimer3Result(JSON.stringify(obj),w);
 assert.deepEqual([parsed.pairs[0].forward.start,parsed.pairs[0].reverse.end],[0,rs+20]);
 assert.equal(parsed.pairs[0].pairPenalty,1.25);
 assert.throws(()=>parsePrimer3Result(JSON.stringify({...obj,template:dna+'A'}),w),/differs/);
 obj.pairs[0].reverse.sequence='AAAAAAAAAAAAAAAAAAAA';
 assert.throws(()=>parsePrimer3Result(JSON.stringify(obj),w),/does not match/);
});
test('empty paired results valid with explanation, invalid schema rejected',()=>{
 const r=parsePrimer3Result(JSON.stringify({format:'photon/primer3-result/1',
 engine:'primer3-py',engineVersion:'2.4.0',template:dna,name:'sample',pairs:[],explain:'No primer pairs'}),w);
 assert.equal(r.pairs.length,0);
 assert.throws(()=>parsePrimer3Result('{}',w),/Unsupported/);
});
