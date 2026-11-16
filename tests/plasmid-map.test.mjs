import test from 'node:test';
import assert from 'node:assert/strict';
import {splitCircularFeature,mapRestrictionMarkers} from '../src/core/plasmid-map.mjs';

test('non-wrapping legacy feature remains a single interval',()=>{
 assert.deepEqual(splitCircularFeature({start:3,end:8},12),[{start:3,end:8}]);
});
test('origin-spanning legacy feature is split into two intervals',()=>{
 assert.deepEqual(splitCircularFeature({start:10,end:3},12),[{start:10,end:12},{start:1,end:3}]);
});
test('rejects invalid coordinates, length and map types',()=>{
 assert.throws(()=>splitCircularFeature({start:0,end:2},12),/Feature coordinates/);
 assert.throws(()=>splitCircularFeature({start:1,end:3},0),/Length/);
 assert.throws(()=>mapRestrictionMarkers('GAATTC',['EcoRI'],{view:'unknown'}),/map view/);
});
test('circular cut at interbase zero maps to 12 oclock',()=>{
 const m=mapRestrictionMarkers('AATTCG',['EcoRI'],{circular:true,view:'circular'});
 assert.equal(m.length,1);
 assert.equal(m[0].topCut,0);
 assert.ok(Math.abs(m[0].x1-310)<1e-8);
 assert.ok(Math.abs(m[0].y1-80)<1e-8);
 assert.equal(m[0].wrapsOrigin,true);
});
test('linear EcoRI cut maps to relative x coordinate',()=>{
 const m=mapRestrictionMarkers('TTGAATTCAA',['EcoRI'],{view:'linear'});
 assert.equal(m.length,1);
 assert.equal(m[0].x,202);
});
test('same digest sites are projected to both views without mutation',()=>{
 const seq='GAATTCGGATCC';
 const c=mapRestrictionMarkers(seq,['EcoRI','BamHI'],{circular:true,view:'circular'});
 const l=mapRestrictionMarkers(seq,['EcoRI','BamHI'],{circular:true,view:'linear'});
 assert.deepEqual(c.map(s=>s.topCut),l.map(s=>s.topCut));
 assert.equal(c.length,2);
 assert.equal(l.length,2);
});
test('empty sequences show no map markers',()=>{
 assert.deepEqual(mapRestrictionMarkers('',['EcoRI'],{view:'linear'}),[]);
});
