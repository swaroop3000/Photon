/** Photon 2.2 — conservative circular feature liftover.
 * A contiguous edit may occur wholly within the unannotated gap between
 * two arms of every origin-spanning feature. Edits overlapping either arm,
 * or deleting the entire gap, are rejected without altering the construct.
 * Coordinates for legacy features: 1-based, inclusive.
 */
import {normalizeDNA,editSequence} from './dna.mjs';
import {validateFeature} from './feature-io.mjs';

export function applyCircularGapEdit(working,edit){
 if(working?.topology!=='circular')throw new RangeError('Circular topology required');
 const seq=normalizeDNA(working.seq),length=seq.length;
 if(!Array.isArray(working.features))throw new TypeError('Features must be an array');
 if(working.features.some(f=>Object.hasOwn(f,'segments')))throw new RangeError('Editing mixed compound and origin-spanning annotations requires reannotation');
 const {start,end,insert=''}=edit??{};
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<start||end>length)
   throw new RangeError('Invalid edit interval');
 const inserted=normalizeDNA(insert),delta=inserted.length-(end-start);
 const wrapped=working.features.filter(f=>f.start>f.end);
 if(!wrapped.length)throw new RangeError('Requires at least one origin-spanning feature');
 for(const f of working.features)validateFeature(f,length,{circular:true});
 for(const f of wrapped){
   // zero-based interbase coordinates of the interior between the two arms.
   const gapStart=f.end;
   const gapEnd=f.start-1;
   if(start<gapStart||end>gapEnd||start>gapEnd||end<gapStart)
     throw new RangeError('Edit overlaps an origin-spanning feature; reannotation required');
   if(gapEnd+delta<=gapStart)
     throw new RangeError('Edit removes the remaining unannotated gap; reannotation required');
 }
 const ordinary=working.features.filter(f=>f.start<=f.end)
   .map(f=>({...f,start:f.start-1}));
 const updated=editSequence(seq,ordinary,{start,end,insert:inserted});
 if(updated.features.some(f=>f.end<=f.start))
   throw new RangeError('Edit would erase an annotation; remove or reannotate it explicitly');
 const nextOrdinary=updated.features.map(f=>{
   const {affected,...rest}=f;
   return {...rest,start:f.start+1,...(affected?{affected:true}:{})};
 });
 const translated=working.features.map(f=>{
   if(f.start>f.end)return {...f,start:f.start+delta};
   return nextOrdinary.shift();
 });
 const nextSeq=updated.sequence;
 for(const f of translated)validateFeature(f,nextSeq.length,{circular:true});
 return {working:{...working,seq:nextSeq,features:translated},
   changed:seq!==nextSeq,affectedFeatures:translated.filter(f=>f.affected).map(f=>f.name??'(unnamed)'),
   edit:{start,end,insert:inserted}};
}
