/** Photon 3.1: non-predictive junction/restriction change report.
 * Junction strings describe the resultant top strand only, not enzyme chemistry.
 */
import {normalizeDNA} from './dna.mjs';
import {restrictionSites,TYPE_II_ENZYMES} from './restriction.mjs';
export function inspectCircularInsertion(backbone,inserted,boundary,{
  enzymes=Object.keys(TYPE_II_ENZYMES),flank=12
}={}){
 const before=normalizeDNA(backbone,{allowAmbiguous:false});
 const after=normalizeDNA(inserted,{allowAmbiguous:false});
 const n=before.length,m=after.length;
 if(!n||!m)throw new RangeError('Backbone and insertion require nonempty DNA');
 if(!Number.isSafeInteger(boundary)||boundary<0||boundary>n)
   throw new RangeError('Invalid insertion boundary');
 if(!Number.isSafeInteger(flank)||flank<1||flank>100)
   throw new RangeError('Invalid flank length');
 const combined=before.slice(0,boundary)+after+before.slice(boundary);
 const junctions=[
   {name:'backbone → insert',position:boundary},
   {name:'insert → backbone',position:boundary+m}
 ].map(j=>{
   const left=Array.from({length:Math.min(flank,combined.length)},(_,i)=>
     combined[(j.position-1-i+combined.length*2)%combined.length]).reverse().join('');
   const right=Array.from({length:Math.min(flank,combined.length)},(_,i)=>
     combined[(j.position+i)%combined.length]).join('');
   return {...j,left,right,sequence:left+'|'+right};
 });
 const original=restrictionSites(before,enzymes,{circular:true});
 const resulting=restrictionSites(combined,enzymes,{circular:true});
 // A site is newly introduced across a junction if its motif spans that
 // interbase boundary. This does NOT establish a compatible cleavage overhang.
 const spans=(site,j,n)=>{
   const start=site.start%n;
   const span=site.end-site.start;
   const distance=(j-start+n)%n;
   return distance>0&&distance<span;
 };
 const gained=resulting.filter(site=>junctions.some(j=>spans(site,j.position,combined.length)));
 const counts=list=>Object.fromEntries(enzymes.map(name=>[name,list.filter(x=>x.enzyme===name).length]));
 return {
   sequence:combined,junctions,enzymes:[...enzymes],siteCountsBefore:counts(original),
   siteCountsAfter:counts(resulting),junctionSpanningSites:gained.map(s=>({
     enzyme:s.enzyme,start:s.start,topCut:s.topCut,wrapsOrigin:s.wrapsOrigin
   })),
   warnings:[
     ...(gained.length?[gained.length+' recognition site(s) span the new junctions; inspect carefully.']:[]),
     'Sequence-only junction report; no ligation, reading-frame or construct viability prediction.'
   ]
 };
}
