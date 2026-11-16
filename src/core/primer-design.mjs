/** Photon 1.8 — bounded exact-match primer-pair candidate selection.
 * Screening only, NOT Primer3. 0-based half-open coordinates.
 * Linear templates only; no genome-wide specificity or buffer-adjusted thermodynamics.
 */
import {normalizeDNA,reverseComplement} from './dna.mjs';
import {primerMetrics,primerBindingSites,virtualPCRProducts} from './primers.mjs';
function integer(x,name){if(!Number.isSafeInteger(x))throw new TypeError(name+' must be an integer');}
export function designPrimerPairs(template,options={}){
 const seq=normalizeDNA(template,{allowAmbiguous:false}),n=seq.length;
 const {minLength=18,maxLength=24,window=80,minProduct=80,maxProduct=1500,
   minGC=30,maxGC=70,maxTmDifference=6,maxPairs=12}=options;
 for(const [name,val] of Object.entries({minLength,maxLength,window,minProduct,maxProduct,maxPairs}))integer(val,name);
 if(minLength<8||maxLength>40||maxLength<minLength||window<1||window>500||
    minProduct<1||maxProduct<minProduct||maxPairs<1||maxPairs>100||
    !Number.isFinite(minGC)||!Number.isFinite(maxGC)||minGC<0||maxGC>100||minGC>maxGC||
    !Number.isFinite(maxTmDifference)||maxTmDifference<0)
   throw new RangeError('Invalid primer design constraints');
 if(n<minProduct||n<2*minLength)return [];
 const forward=[],reverse=[];
 const fStartMax=Math.min(window,n-minLength+1);
 for(let pos=0;pos<fStartMax;pos++)for(let len=minLength;len<=maxLength&&pos+len<=n;len++){
   const s=seq.slice(pos,pos+len),m=primerMetrics(s);
   if(m.gcPercent<minGC||m.gcPercent>maxGC)continue;
   if(primerBindingSites(seq,s,{strand:'forward'}).length!==1)continue;
   forward.push({sequence:s,start:pos,end:pos+len,metrics:m});
 }
 const startMin=Math.max(0,n-window-maxLength);
 for(let pos=startMin;pos<n;pos++)for(let len=minLength;len<=maxLength&&pos+len<=n;len++){
   if(pos+len<n-window)continue;
   const s=reverseComplement(seq.slice(pos,pos+len)),m=primerMetrics(s);
   if(m.gcPercent<minGC||m.gcPercent>maxGC)continue;
   if(primerBindingSites(seq,s,{strand:'reverse'}).length!==1)continue;
   reverse.push({sequence:s,start:pos,end:pos+len,metrics:m});
 }
 const quality=p=>Math.abs(p.metrics.approxTmC-60)+Math.abs(p.metrics.gcPercent-50)/10+
   (p.metrics.possibleSelfDimer?6:0)+(p.metrics.possibleHairpin?6:0);
 forward.sort((a,b)=>quality(a)-quality(b)||a.start-b.start||a.sequence.localeCompare(b.sequence));
 reverse.sort((a,b)=>quality(a)-quality(b)||b.end-a.end||a.sequence.localeCompare(b.sequence));
 const results=[];
 for(const f of forward.slice(0,24))for(const r of reverse.slice(0,24)){
   const size=r.end-f.start,dtm=Math.abs(f.metrics.approxTmC-r.metrics.approxTmC);
   if(r.start<f.end||size<minProduct||size>maxProduct||dtm>maxTmDifference)continue;
   const p=virtualPCRProducts(seq,f.sequence,r.sequence,{maxProducts:2});
   if(p.length!==1||p[0].start!==f.start||p[0].length!==size)continue;
   const score=quality(f)+quality(r)+dtm+Math.abs(size-(minProduct+maxProduct)/2)/1000;
   results.push({forward:f,reverse:r,amplicon:p[0],score:Math.round(score*100)/100,
     warnings:[...(f.metrics.possibleSelfDimer||r.metrics.possibleSelfDimer?['Potential self-complementarity']:[]),
       ...(f.metrics.possibleHairpin||r.metrics.possibleHairpin?['Potential hairpin']:[])]});
 }
 results.sort((a,b)=>a.score-b.score||a.forward.start-b.forward.start||a.reverse.start-b.reverse.start);
 return results.slice(0,maxPairs);
}
