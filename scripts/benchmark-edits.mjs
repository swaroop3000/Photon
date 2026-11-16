/** Observational comparison; no timing thresholds or browser speed claims. */
import {performance} from 'node:perf_hooks';
import {editSequence,editSequenceBatch} from '../src/core/dna.mjs';
const bases=Number(process.argv[2]??1000000),count=Number(process.argv[3]??100);
if(!Number.isSafeInteger(bases)||bases<100||bases>10000000||
   !Number.isSafeInteger(count)||count<1||count>1000||count>bases/10)
 throw new RangeError('Expected 100–10000000 bases and 1–1000 separated edits');
const sequence='ACGT'.repeat(Math.ceil(bases/4)).slice(0,bases);
const operations=Array.from({length:count},(_,i)=>({start:i*Math.floor(bases/count),
 end:i*Math.floor(bases/count)+1,insert:i%2?'GG':'T'})).reverse();
const features=[{start:0,end:bases,name:'whole'}];
const start=performance.now();
let old={sequence,features};
for(const edit of operations)old=editSequence(old.sequence,old.features,edit);
const sequentialMs=performance.now()-start;
const optimizedStart=performance.now();
const batch=editSequenceBatch(sequence,features,operations);
const batchMs=performance.now()-optimizedStart;
if(old.sequence!==batch.sequence||JSON.stringify(old.features)!==JSON.stringify(batch.features))
 throw new Error('Batch and sequential outputs differ');
console.log(JSON.stringify({schema:'photon-edit-benchmark-v1',node:process.version,bases,edits:count,
 sequentialMs,batchMs,heapUsedMiB:process.memoryUsage().heapUsed/1048576,identical:true},null,2));
