/** All 28 legacy UI enzymes, with explicit both-strand interbase offsets.
 * Exact ACGT mapping only. Linear sites require both cuts within the molecule.
 * Top-strand fragment lengths do not model methylation, chemistry or yields.
 */
import {normalizeDNA,reverseComplement} from './dna.mjs';
export const CURATED_ENZYMES=Object.freeze({
 EcoRI:Object.freeze({"recognition":"GAATTC","topCut":1,"bottomCut":5}),
 BamHI:Object.freeze({"recognition":"GGATCC","topCut":1,"bottomCut":5}),
 HindIII:Object.freeze({"recognition":"AAGCTT","topCut":1,"bottomCut":5}),
 NotI:Object.freeze({"recognition":"GCGGCCGC","topCut":2,"bottomCut":6}),
 XhoI:Object.freeze({"recognition":"CTCGAG","topCut":1,"bottomCut":5}),
 XbaI:Object.freeze({"recognition":"TCTAGA","topCut":1,"bottomCut":5}),
 PstI:Object.freeze({"recognition":"CTGCAG","topCut":5,"bottomCut":1}),
 SalI:Object.freeze({"recognition":"GTCGAC","topCut":1,"bottomCut":5}),
 NcoI:Object.freeze({"recognition":"CCATGG","topCut":1,"bottomCut":5}),
 NdeI:Object.freeze({"recognition":"CATATG","topCut":2,"bottomCut":4}),
 KpnI:Object.freeze({"recognition":"GGTACC","topCut":5,"bottomCut":1}),
 SacI:Object.freeze({"recognition":"GAGCTC","topCut":5,"bottomCut":1}),
 SpeI:Object.freeze({"recognition":"ACTAGT","topCut":1,"bottomCut":5}),
 SmaI:Object.freeze({"recognition":"CCCGGG","topCut":3,"bottomCut":3}),
 EcoRV:Object.freeze({"recognition":"GATATC","topCut":3,"bottomCut":3}),
 BsaI:Object.freeze({"recognition":"GGTCTC","topCut":7,"bottomCut":11}),
 BsmBI:Object.freeze({"recognition":"CGTCTC","topCut":7,"bottomCut":11}),
 ClaI:Object.freeze({"recognition":"ATCGAT","topCut":2,"bottomCut":4}),
 MluI:Object.freeze({"recognition":"ACGCGT","topCut":1,"bottomCut":5}),
 NheI:Object.freeze({"recognition":"GCTAGC","topCut":1,"bottomCut":5}),
 AflII:Object.freeze({"recognition":"CTTAAG","topCut":1,"bottomCut":5}),
 ApaI:Object.freeze({"recognition":"GGGCCC","topCut":5,"bottomCut":1}),
 BglII:Object.freeze({"recognition":"AGATCT","topCut":1,"bottomCut":5}),
 DraI:Object.freeze({"recognition":"TTTAAA","topCut":3,"bottomCut":3}),
 HpaI:Object.freeze({"recognition":"GTTAAC","topCut":3,"bottomCut":3}),
 PvuII:Object.freeze({"recognition":"CAGCTG","topCut":3,"bottomCut":3}),
 ScaI:Object.freeze({"recognition":"AGTACT","topCut":3,"bottomCut":3}),
 StuI:Object.freeze({"recognition":"AGGCCT","topCut":3,"bottomCut":3}),
});
export function curatedRestrictionSites(sequence,names,{circular=false}={}){
 const seq=normalizeDNA(sequence,{allowAmbiguous:false}),n=seq.length;
 if(!Array.isArray(names))throw new TypeError('Enzymes must be an array');
 const hits=[];
 for(const name of new Set(names)){
  if(!Object.hasOwn(CURATED_ENZYMES,name))throw new RangeError('Unknown curated enzyme: '+name);
  const e=CURATED_ENZYMES[name],m=e.recognition.length,reverse=reverseComplement(e.recognition);
  if(m>n)continue;
  const hay=circular?seq+seq.slice(0,m-1):seq;
  for(const [pattern,strand] of reverse===e.recognition?[[e.recognition,1]]:[[e.recognition,1],[reverse,-1]]){
   let start=hay.indexOf(pattern);
   while(start!==-1&&start<n){
    let topCut=start+(strand===1?e.topCut:m-e.bottomCut),bottomCut=start+(strand===1?e.bottomCut:m-e.topCut);
    if(circular||(topCut>0&&bottomCut>0&&topCut<n&&bottomCut<n)){
     if(circular){topCut=((topCut%n)+n)%n;bottomCut=((bottomCut%n)+n)%n;}
     hits.push({enzyme:name,start,strand,topCut,bottomCut,
      overhangLength:Math.abs(e.topCut-e.bottomCut),
      overhangType:e.topCut===e.bottomCut?'blunt':e.topCut<e.bottomCut?'5-prime':'3-prime'});
    }
    start=hay.indexOf(pattern,start+1);
   }
  }
 }
 return hits.sort((a,b)=>a.topCut-b.topCut||a.enzyme.localeCompare(b.enzyme)||a.start-b.start);
}
export function curatedDigest(sequence,names,{circular=false}={}){
 const n=normalizeDNA(sequence,{allowAmbiguous:false}).length;
 const sites=curatedRestrictionSites(sequence,names,{circular}),cuts=[...new Set(sites.map(s=>s.topCut))].sort((a,b)=>a-b);
 const points=[0,...cuts,n];
 const fragments=!n?[]:circular?(cuts.length?cuts.map((c,i)=>(cuts[(i+1)%cuts.length]-c+n)%n||n):[n]):points.slice(1).map((p,i)=>p-points[i]).filter(v=>v>0);
 if(fragments.reduce((a,b)=>a+b,0)!==n)throw new Error('Curated digest length invariant failed');
 return {sites,cuts,fragments:fragments.sort((a,b)=>b-a),length:n};
}
