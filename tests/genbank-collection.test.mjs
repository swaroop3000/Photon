import test from 'node:test';
import assert from 'node:assert/strict';
import {splitGenbankRecords,parseGenbankCollection,serializeGenbankCollection} from '../src/core/genbank-collection.mjs';

const constructs=[
 {name:'vector_A',topology:'linear',seq:'AACCGGTT',features:[{name:'part',type:'CDS',start:2,end:5,strand:1}]},
 {name:'vector_B',topology:'circular',seq:'ACCGGTTAACC',features:[{name:'wrap',type:'promoter',start:9,end:2,strand:-1}]},
];
test('two GenBank records round-trip without dropping topology, features or sequence',()=>{
 const text=serializeGenbankCollection(constructs);
 const records=splitGenbankRecords(text);
 assert.equal(records.length,2);
 assert.deepEqual(parseGenbankCollection(text),constructs);
});
test('CRLF files and optional whitespace between records are supported',()=>{
 const text=serializeGenbankCollection(constructs).replace(/\n/g,'\r\n');
 assert.equal(parseGenbankCollection(text).length,2);
});
test('invalid second record aborts entire collection parse',()=>{
 const s=serializeGenbankCollection(constructs);
 const records=splitGenbankRecords(s);
 const corrupted=records[1].replace(/(ORIGIN[^\n]*\n\s*1\s+)a/i,'$1x');
 assert.notEqual(corrupted,records[1],'fixture corruption must actually change the ORIGIN text');
 assert.throws(()=>parseGenbankCollection(records[0]+corrupted),/Invalid DNA base/);
});
test('unterminated, concatenated LOCUS, stray text and record limits are rejected',()=>{
 const text=serializeGenbankCollection(constructs);
 assert.throws(()=>splitGenbankRecords(text.replace(/\/\/\s*$/,'')),/Unterminated/);
 assert.throws(()=>splitGenbankRecords(text.replace(/\/\/\n/,'\n')),/New LOCUS/);
 assert.throws(()=>splitGenbankRecords('trash\n'+text),/Unexpected text/);
 assert.throws(()=>splitGenbankRecords(text,{maxRecords:1}),/limit exceeded/);
});
