import {readFileSync} from 'node:fs';
import {CURATED_ENZYMES,curatedDigest} from '../src/core/curated-digest.mjs';
const input=JSON.parse(readFileSync(0,'utf8'));
const ui=JSON.parse(readFileSync('index.html','utf8').match(/const ENZYMES=(\[.*?\]);/)[1]);
process.stdout.write(JSON.stringify({registry:CURATED_ENZYMES,ui,
 vectors:input.vectors.map(v=>curatedDigest(v.sequence,[v.enzyme],{circular:v.circular}))}));
