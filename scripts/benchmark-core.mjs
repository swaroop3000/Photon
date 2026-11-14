/** Run with: node scripts/benchmark-core.mjs [base-pair-count]
 * Simple developer diagnostic, not a CI performance gate: results vary by host.
 */
import {performance} from 'node:perf_hooks';
import {reverseComplement,normalizeDNA,gcContent,translate,findMotif} from '../src/core/dna.mjs';
import {restrictionSites} from '../src/core/restriction.mjs';
const count=process.argv[2]===undefined?1_000_000:Number(process.argv[2]);
if(!Number.isSafeInteger(count)||count<1||count>10_000_000)
 throw new RangeError('Base-pair count must be an integer between 1 and 10000000');
const repeat='ACGTGAATTCGCTAGC';
const dna=repeat.repeat(Math.ceil(count/repeat.length)).slice(0,count);
const metrics={};
function run(name,task){
 const start=performance.now(),out=task();
 metrics[name]={milliseconds:Number((performance.now()-start).toFixed(3))};
 return out;
}
const normalized=run('normalize',()=>normalizeDNA(dna));
const reverse=run('reverseComplement',()=>reverseComplement(normalized));
const gc=run('gcContent',()=>gcContent(normalized));
const translated=run('translate',()=>translate(normalized));
const sites=run('restrictionEcoRI',()=>restrictionSites(normalized,['EcoRI']));
const motif=run('motifSearch',()=>findMotif(normalized,'GAATTC'));
if(normalized.length!==count||reverse.length!==count||translated.length!==Math.floor(count/3)||
   !Number.isFinite(gc)||sites.length!==motif.length)
 throw new Error('Benchmark invariant failed');
const result={schema:'photon-core-benchmark-v1',bases:count,
 node:process.version,platform:process.platform,metrics,
 counts:{enzymeSites:sites.length,motifHits:motif.length,proteinResidues:translated.length},
 heapUsedMiB:Number((process.memoryUsage().heapUsed/1048576).toFixed(2))};
process.stdout.write(JSON.stringify(result,null,2)+'\n');
