/** Exact local exon liftover. Legacy positions are 1-based inclusive;
 * explicit edits and flattened intervals are 0-based half-open.
 * Intronic edits do not affect exon sequence; an erased/overlapping exon rejects
 * the complete batch. Mixed wrapped/compound editing remains conservative.
 */
import {normalizeDNA,editSequenceBatch} from './dna.mjs';
import {validateFeature} from './feature-io.mjs';
export function applyCompoundEdits(working,edits){
 const seq=normalizeDNA(working.seq),circular=working.topology==='circular';
 const originals=working.features.map(f=>{validateFeature(f,seq.length,{circular});return structuredClone(f);});
 const flat=[],groups=[];
 for(const f of originals){
   const pieces=f.segments??[{start:f.start,end:f.end}];
   groups.push({offset:flat.length,count:pieces.length});
   for(const part of pieces)flat.push({start:part.start-1,end:part.end,affected:!!f.affected});
 }
 if(originals.some(f=>f.start>f.end))throw new RangeError('Editing mixed compound and origin-spanning annotations requires reannotation');
 const result=editSequenceBatch(seq,flat,edits);
 if(result.sequence===seq)return {working:structuredClone(working),changed:false,affectedFeatures:[],edit:null,edits};
 const features=originals.map((f,index)=>{
   const {offset,count}=groups[index],parts=result.features.slice(offset,offset+count);
   const segments=parts.map(p=>({start:p.start+1,end:p.end}));
   const mapped={...f,start:segments[0].start,end:segments.at(-1).end};
   if(f.segments)mapped.segments=segments;
   if(parts.some(p=>p.affected))mapped.affected=true;
   validateFeature(mapped,result.sequence.length,{circular});
   return mapped;
 });
 return {working:{...structuredClone(working),seq:result.sequence,features},changed:true,
   affectedFeatures:features.filter(f=>f.affected).map(f=>f.name??'(unnamed)'),
   edit:edits.length===1?edits[0]:null,edits};
}
