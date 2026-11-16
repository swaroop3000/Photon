/** Photon 3.4 — explicit offline Primer3 request/results exchange.
 * This module does NOT run Primer3. The real engine runs locally through the
 * accompanying Python runner. Refuses unverified primer result coordinates.
 */
import {normalizeDNA,reverseComplement} from './dna.mjs';
export const PRIMER3_REQUEST_FORMAT='photon/primer3-request/1';
export const PRIMER3_RESULT_FORMAT='photon/primer3-result/1';
const int=(v,name,min,max)=>{if(!Number.isSafeInteger(v)||v<min||v>max)throw new RangeError('Invalid '+name);return v;};
export function preparePrimer3Request(working,{
 minProduct=80,maxProduct=300,maxPairs=5,minSize=18,optSize=20,maxSize=25,
 minTm=57,optTm=60,maxTm=63
}={}){
 if(!working||working.topology!=='linear')throw new RangeError('Primer3 integration requires a linear working template');
 const seq=normalizeDNA(working.seq,{allowAmbiguous:false});
 if(seq.length<40||seq.length>1000000)throw new RangeError('Template length must be 40–1,000,000 bp');
 int(minProduct,'minimum product length',30,1000000);
 int(maxProduct,'maximum product length',minProduct,1000000);
 int(maxPairs,'number of primer pairs',1,20);
 int(minSize,'minimum primer length',15,35);
 int(optSize,'optimal primer length',minSize,35);
 int(maxSize,'maximum primer length',optSize,40);
 for(const [name,v] of [['minimum Tm',minTm],['optimal Tm',optTm],['maximum Tm',maxTm]])
   if(typeof v!=='number'||!Number.isFinite(v)||v<40||v>80)throw new RangeError('Invalid '+name);
 if(!(minTm<=optTm&&optTm<=maxTm))throw new RangeError('Tm constraints must be ordered');
 if(maxProduct>seq.length)throw new RangeError('Maximum product size exceeds template');
 return {format:PRIMER3_REQUEST_FORMAT,engine:'primer3-py-local',
  name:String(working.name??'Photon'),sequence:seq,
  options:{minProduct,maxProduct,maxPairs,minSize,optSize,maxSize,minTm,optTm,maxTm}};
}
export function parsePrimer3Result(text,working){
 if(typeof text!=='string'||text.length>4000000)throw new RangeError('Invalid Primer3 result file');
 let result;
 try{result=JSON.parse(text);}catch{throw new RangeError('Invalid Primer3 JSON');}
 if(!result||result.format!==PRIMER3_RESULT_FORMAT||result.engine!=='primer3-py'||
   typeof result.template!=='string'||!Array.isArray(result.pairs))
   throw new RangeError('Unsupported Primer3 result schema');
 const template=normalizeDNA(result.template,{allowAmbiguous:false});
 const current=normalizeDNA(working?.seq,{allowAmbiguous:false});
 if(working?.topology!=='linear'||template!==current)
   throw new RangeError('Primer3 result template differs from current linear construct');
 if(result.pairs.length>20)throw new RangeError('Too many primer pairs');
 if(typeof result.engineVersion!=='string'||!result.engineVersion)
   throw new RangeError('Missing Primer3 engine version');
 const pairs=result.pairs.map((p,index)=>{
   if(!p||typeof p!=='object')throw new RangeError('Invalid pair '+index);
   const forward=normalizeDNA(p.forward?.sequence,{allowAmbiguous:false});
   const reverse=normalizeDNA(p.reverse?.sequence,{allowAmbiguous:false});
   const fs=int(p.forward?.start,'forward start',0,template.length-1);
   const rs=int(p.reverse?.start,'reverse start',0,template.length-1);
   if(!forward||!reverse||fs+forward.length>template.length||rs+reverse.length>template.length)
     throw new RangeError('Invalid primer coordinates');
   if(template.slice(fs,fs+forward.length)!==forward||
      reverseComplement(template.slice(rs,rs+reverse.length))!==reverse)
     throw new RangeError('Primer sequence does not match template coordinates');
   const product=rs+reverse.length-fs;
   if(fs+forward.length>rs||p.productSize!==product)
     throw new RangeError('Primer3 product coordinates are inconsistent');
   for(const val of [p.forward.tm,p.reverse.tm,p.pairPenalty]){
     if(typeof val!=='number'||!Number.isFinite(val))throw new RangeError('Invalid Primer3 thermodynamic value');
   }
   return {
     forward:{sequence:forward,start:fs,end:fs+forward.length,tm:p.forward.tm},
     reverse:{sequence:reverse,start:rs,end:rs+reverse.length,tm:p.reverse.tm},
     productSize:product,pairPenalty:p.pairPenalty
   };
 });
 return {format:PRIMER3_RESULT_FORMAT,engineVersion:result.engineVersion,
  name:String(result.name??''),pairs,explain:typeof result.explain==='string'?result.explain:''};
}
