import test from 'node:test';
import assert from 'node:assert/strict';
import {featureMapSegments,arcSectorPath} from '../src/core/feature-map.mjs';
test('origin-spanning circular feature yields two independently visible segments',()=>{
 const s=featureMapSegments({start:10,end:3},12);
 assert.deepEqual(s.map(x=>[x.start,x.end]),[[10,12],[1,3]]);
 assert.deepEqual(s.map(x=>[x.startAngle,x.endAngle]),[[270,360],[0,90]]);
});
test('normal feature remains one segment',()=>{
 const s=featureMapSegments({start:3,end:9},12);
 assert.equal(s.length,1);
 assert.deepEqual([s[0].startAngle,s[0].endAngle],[60,270]);
});
test('linear view preserves both disjoint origin intervals',()=>{
 const s=featureMapSegments({start:10,end:3},12,{view:'linear'});
 assert.equal(s.length,2);
 assert.deepEqual(s.map(x=>Math.round(x.width)),[135,135]);
 assert.ok(s[0].x>s[1].x);
});
test('arc paths are finite and contain SVG commands',()=>{
 for(const interval of featureMapSegments({start:10,end:3},12)){
  const d=arcSectorPath(interval);
  assert.match(d,/^M/);assert.match(d,/ A/);assert.match(d,/ Z$/);
  assert.doesNotMatch(d,/(NaN|Infinity)/);
 }
});
test('full-circle feature renders two proper arcs',()=>{
 const d=arcSectorPath(featureMapSegments({start:1,end:12},12)[0]);
 assert.equal((d.match(/ A/g)||[]).length,4);
});
test('invalid feature and geometry inputs fail explicitly',()=>{
 assert.throws(()=>featureMapSegments({start:0,end:4},12),/Feature coordinates/);
 assert.throws(()=>featureMapSegments({start:1,end:3},12,{view:'other'}),/Unknown map view/);
 assert.throws(()=>arcSectorPath({startAngle:200,endAngle:100}),/Invalid feature arc/);
});
