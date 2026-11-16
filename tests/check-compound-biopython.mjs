import {readFileSync} from 'node:fs';
import {parseGenbank,serializeGenbank,circularFeatureSequence} from '../src/core/feature-io.mjs';
import {applyExplicitEdits} from '../src/core/photon-adapter.mjs';
const input=JSON.parse(readFileSync(0,'utf8'));
process.stdout.write(JSON.stringify(input.cases.map(item=>{
 const w=parseGenbank(item.text),edited=applyExplicitEdits(w,item.edits).working;
 const result=working=>({exported:serializeGenbank(working),
  extracted:working.features.map(f=>circularFeatureSequence(working.seq,f,{circular:working.topology==='circular'}))});
 return {original:result(w),edited:result(edited)};
})));
