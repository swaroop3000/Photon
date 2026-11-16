import {readFileSync} from 'node:fs';
import {parseGenbank,serializeGenbank,circularFeatureSequence} from '../src/core/feature-io.mjs';
import {analyzeAnnotatedCDS} from '../src/core/translation-analysis.mjs';
import {interpretCDS} from '../src/core/cds-semantics.mjs';
const input=JSON.parse(readFileSync(0,'utf8')),w=parseGenbank(input.genbank);
process.stdout.write(JSON.stringify({working:w,exported:serializeGenbank(w),
 extracted:w.features.map(f=>circularFeatureSequence(w.seq,f,{circular:true})),
 cds:analyzeAnnotatedCDS(w),vectors:input.vectors.map(v=>interpretCDS(v.seq,v.feature))}));
