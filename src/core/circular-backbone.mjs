/** Photon 3.0 — conservative in-silico circular backbone + circuit insertion.
 * A supplied circular working construct is the backbone. The circuit is inserted
 * at a zero-based interbase boundary (0..backbone length). Insertion strictly
 * inside any existing annotation is refused rather than silently splitting it.
 * No restriction digest, ligase, origin biology or wet-lab success is modeled.
 */
import {normalizeDNA} from './dna.mjs';
import {validateFeature} from './feature-io.mjs';
import {circuitToConstruct} from './circuit-construct.mjs';

function boundaryInsideFeature(feature,boundary,length){
 // For a standard feature the insertion point is internal if it falls
 // between two bases belonging to that feature.
 if(feature.start<=feature.end)
   return boundary>=feature.start&&boundary<feature.end;
 // Origin-spanning feature joins [start,length] and [1,end].
 // Boundary 0 and length are the same circular origin junction, inside it.
 return boundary>=feature.start || boundary<feature.end ||
   boundary===0 || boundary===length;
}
/** Combine circuit and circular backbone with lossless legacy feature
 * coordinate liftover. Preserves old feature metadata and assembly notes.
 */
export function circuitIntoCircularBackbone(library,rootID,working,{
 boundary,name
}={}){
 if(!working||working.topology!=='circular'||!Array.isArray(working.features))
   throw new RangeError('Circular backbone with features required');
 const backbone=normalizeDNA(working.seq,{allowAmbiguous:false}),n=backbone.length;
 if(!n)throw new RangeError('Backbone sequence is empty');
 if(!Number.isSafeInteger(boundary)||boundary<0||boundary>n)
   throw new RangeError('Insertion boundary must be an integer from 0 to backbone length');
 const circuit=circuitToConstruct(library,rootID,working);
 const insertion=circuit.seq,m=insertion.length;
 if(m+n>1000000)throw new RangeError('Combined construct exceeds 1,000,000 bp');
 const old=working.features.map(f=>{
   validateFeature(f,n,{circular:true});
   if(boundaryInsideFeature(f,boundary,n))
     throw new RangeError('Insertion would split backbone feature: '+(f.name||'(unnamed)'));
   return structuredClone(f);
 });
 const shifted=old.map(f=>({
   ...f,start:f.start>boundary?f.start+m:f.start,
   end:f.end>boundary?f.end+m:f.end
 }));
 const inserted=circuit.features.map(f=>({
   ...structuredClone(f),start:f.start+boundary,end:f.end+boundary
 }));
 const result={
   name:name??working.name,
   topology:'circular',
   seq:backbone.slice(0,boundary)+insertion+backbone.slice(boundary),
   features:[...shifted,...inserted]
 };
 if(typeof result.name!=='string'||!result.name.trim()||result.name.length>120)
   throw new RangeError('Invalid plasmid name');
 result.name=result.name.trim();
 for(const f of result.features)validateFeature(f,result.seq.length,{circular:true});
 return result;
}
