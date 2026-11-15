/** Bounded display projection of an already validated legacy construct.
 * No full-genome normalization or per-base array allocation; work is bounded by
 * window size + annotation count. Editing remains a separate full-construct API.
 */
import {validateFeature} from './feature-io.mjs';
export function sequenceWindow(working,{start=1,size=6000}={}){
 if(!working||typeof working.seq!=='string'||!Array.isArray(working.features)||
    !['linear','circular'].includes(working.topology))throw new RangeError('Invalid display construct');
 if(!Number.isSafeInteger(size)||size<1||size>6000)throw new RangeError('Window size must be 1..6000');
 const total=working.seq.length;
 if(!Number.isSafeInteger(start)||start<1||start>Math.max(1,total))
   throw new RangeError('Window start must be a 1-based coordinate within sequence');
 const end=Math.min(total,start+size-1),annotations=[];
 for(let index=0;index<working.features.length;index++){
   const f=validateFeature(working.features[index],total,{circular:working.topology==='circular'});
   const spans=f.start<=f.end?[[f.start,f.end]]:[[f.start,total],[1,f.end]];
   for(const [left,right] of spans){
     const a=Math.max(start,left),b=Math.min(end,right);
     if(a<=b)annotations.push({index,start:a-start,end:b-start+1,type:f.type});
   }
 }
 return {start,end,total,sequence:working.seq.slice(start-1,end),annotations,
   previousStart:start>1?Math.max(1,start-size):null,
   nextStart:end<total?end+1:null};
}
