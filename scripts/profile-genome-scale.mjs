/** Multiple sizes in independent Node processes for observational performance profiling.
 * Invoke: node scripts/profile-genome-scale.mjs [comma-separated sizes]
 * Output schema is stable; timing is NOT a performance acceptance threshold.
 */
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const defaultSizes=[100000,1000000,10000000];
const sizes=process.argv[2]?
 process.argv[2].split(',').map(Number):defaultSizes;
if(sizes.length<1||sizes.length>6||sizes.some(n=>!Number.isSafeInteger(n)||n<1||n>10000000))
 throw new RangeError('Expected 1-6 sizes from 1 to 10,000,000 bases');
const script=fileURLToPath(new URL('./benchmark-core.mjs',import.meta.url));
const runs=sizes.map(n=>{
 const result=execFileSync(process.execPath,[script,String(n)],{
  encoding:'utf8',timeout:180000,maxBuffer:4*1024*1024
 });
 const parsed=JSON.parse(result);
 if(parsed.bases!==n||parsed.schema!=='photon-core-benchmark-v1')
  throw new Error('Unexpected benchmark result');
 return parsed;
});
process.stdout.write(JSON.stringify({schema:'photon-genome-profile-v1',runs},null,2)+'\n');
