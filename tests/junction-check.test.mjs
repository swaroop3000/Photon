import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectCircularInsertion} from '../src/core/junction-check.mjs';
test('reports both oriented circular junctions and no imaginary sites',()=>{
 const result=inspectCircularInsertion('AACCGGTT','ATGC',4,{enzymes:['EcoRI'],flank:4});
 assert.equal(result.sequence,'AACCATGCGGTT');
 assert.deepEqual(result.junctions.map(j=>j.position),[4,8]);
 assert.equal(result.junctions[0].sequence,'AACC|ATGC');
 assert.equal(result.junctions[1].sequence,'ATGC|GGTT');
 assert.deepEqual(result.junctionSpanningSites,[]);
});
test('detects EcoRI recognition created at insertion junction',()=>{
 // Backbone AATTCG, insert G; at boundary 0 gives GAATTC at junction 0.
 const r=inspectCircularInsertion('AATTCG','G',0,{enzymes:['EcoRI'],flank:3});
 assert.equal(r.siteCountsBefore.EcoRI,0);
 assert.ok(r.junctionSpanningSites.some(x=>x.enzyme==='EcoRI'));
 assert.ok(r.warnings.some(x=>/recognition site/.test(x)));
});
test('rejects invalid junction boundaries and empty sequences',()=>{
 assert.throws(()=>inspectCircularInsertion('ATGC','',2),/nonempty/);
 assert.throws(()=>inspectCircularInsertion('ATGC','AC',8),/Invalid insertion boundary/);
 assert.throws(()=>inspectCircularInsertion('ATGC','AC',2,{flank:0}),/Invalid flank/);
});
