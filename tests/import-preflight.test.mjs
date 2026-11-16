import test from 'node:test';
import assert from 'node:assert/strict';
import {preflightGenbankCollection} from '../src/core/import-preflight.mjs';
const record=(name,len=8)=>({name,seq:'A'.repeat(len),topology:'linear',features:[]});
test('preflight reports records and distinguishes duplicate names without mutation',()=>{
 const rs=[record('plasmid'),record('plasmid'),record('other')];
 const copy=structuredClone(rs),result=preflightGenbankCollection(rs);
 assert.deepEqual(result.duplicateNames,['plasmid']);
 assert.equal(result.totalBases,24);
 assert.equal(result.recordCount,3);
 assert.equal(result.details[1].duplicateName,true);
 assert.deepEqual(rs,copy);
});
test('preflight rejects local browser storage abuse',()=>{
 assert.throws(()=>preflightGenbankCollection([record('large',501_000)]),/size limit/);
 assert.throws(()=>preflightGenbankCollection([record('a',500_000),record('b',500_000),record('c',1)]),/collection exceeds/i);
 assert.throws(()=>preflightGenbankCollection(Array.from({length:101},(_,i)=>record('r'+i))),/record count/i);
 assert.throws(()=>preflightGenbankCollection([record('ok')],{maxTotalBases:0}),/Invalid import limit/);
});
