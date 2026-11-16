import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
test('benchmark script reports machine-readable metrics without claiming SLA',()=>{
 const raw=execFileSync(process.execPath,['scripts/benchmark-core.mjs','10000'],{
  encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
 const report=JSON.parse(raw);
 assert.equal(report.schema,'photon-core-benchmark-v1');
 assert.equal(report.bases,10000);
 assert.equal(report.counts.proteinResidues,Math.floor(10000/3));
 assert.equal(report.counts.enzymeSites,report.counts.motifHits);
 assert.ok(report.heapUsedMiB>0);
 for(const key of ['normalize','reverseComplement','gcContent','translate','restrictionEcoRI','motifSearch']){
  assert.ok(Number.isFinite(report.metrics[key].milliseconds));
  assert.ok(report.metrics[key].milliseconds>=0);
 }
});
