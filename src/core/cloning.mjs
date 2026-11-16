/** Photon 1.4 — explicit cut-end and restriction-ligation simulation.
 * Educational in-silico model for the curated palindromic Type II enzyme set.
 * Coordinates are zero-based interbase positions. Models top-strand sequence
 * reconstruction, not phosphorylation, reaction chemistry or yields.
 */
import {normalizeDNA,reverseComplement} from './dna.mjs';
import {restrictionSites,TYPE_II_ENZYMES} from './restriction.mjs';

export function cutEnds(sequence,site,{circular=false}={}) {
  const seq=normalizeDNA(sequence,{allowAmbiguous:false}),n=seq.length;
  if(!site||!Object.hasOwn(TYPE_II_ENZYMES,site.enzyme))
    throw new RangeError('Unsupported site/enzyme');
  if(!n)throw new RangeError('A cut site requires nonempty DNA');
  const enzyme=TYPE_II_ENZYMES[site.enzyme];
  const {topCut,bottomCut}=enzyme;
  const lo=Math.min(topCut,bottomCut),hi=Math.max(topCut,bottomCut);
  let overhang='';
  for(let i=lo;i<hi;i++){
    const index=site.start+i;
    if(!circular&&(index<0||index>=n))throw new RangeError('Overhang crosses linear sequence boundary');
    overhang+=seq[((index%n)+n)%n];
  }
  const kind=topCut===bottomCut?'blunt':topCut<bottomCut?'5-prime':'3-prime';
  // Protruding strand is different at the two sides of an endonuclease cut.
  const rightEnd={kind,overhang,protruding:kind==='blunt'?null:kind==='5-prime'?'bottom':'top'};
  const leftEnd={kind,overhang,protruding:kind==='blunt'?null:kind==='5-prime'?'top':'bottom'};
  return {rightEnd,leftEnd};
}
export function compatibleEnds(right,left) {
  if(!right||!left||!['blunt','5-prime','3-prime'].includes(right.kind)||
    !['blunt','5-prime','3-prime'].includes(left.kind))return false;
  if(right.kind!==left.kind)return false;
  if(right.kind==='blunt')return true;
  if(!right.overhang||right.overhang!==left.overhang||
     !['top','bottom'].includes(right.protruding)||
     !['top','bottom'].includes(left.protruding))return false;
  return right.protruding!==left.protruding;
}
/** Returns top-strand fragments. The natural ends of linear DNA are NOT
 * assumed to be enzyme-compatible blunt ends. One fragment for uncut circle
 * retains circular=true and has no ligatable ends.
 */
export function digestFragments(sequence,enzymes=['EcoRI'],{circular=false}={}) {
  const seq=normalizeDNA(sequence,{allowAmbiguous:false}),n=seq.length;
  if(!n)return [];
  const sites=restrictionSites(seq,enzymes,{circular});
  const byCut=new Map();
  for(const site of sites){
    const existing=byCut.get(site.topCut);
    if(existing&&
        (existing.bottomCut!==site.bottomCut||existing.enzyme!==site.enzyme))
      throw new RangeError('Multiple enzymes produce conflicting cut-end annotations');
    byCut.set(site.topCut,site);
  }
  const cuts=[...byCut.keys()].sort((a,b)=>a-b);
  const endFor=(cut,side)=>cutEnds(seq,byCut.get(cut),{circular})[side];
  if(circular){
    if(!cuts.length)return [{sequence:seq,length:n,circular:true,leftEnd:null,rightEnd:null}];
    return cuts.map((start,i)=>{
      const next=cuts[(i+1)%cuts.length];
      const length=(next-start+n)%n||n;
      const text=(seq+seq).slice(start,start+length);
      return {sequence:text,length,circular:false,leftEnd:endFor(start,'leftEnd'),
        rightEnd:endFor(next,'rightEnd'),start,end:(start+length)%n};
    });
  }
  const points=[0,...cuts.filter(c=>c>0&&c<n),n].sort((a,b)=>a-b);
  return points.slice(0,-1).map((start,i)=>{
    const end=points[i+1];
    return {sequence:seq.slice(start,end),length:end-start,circular:false,
      leftEnd:start===0?null:endFor(start,'leftEnd'),
      rightEnd:end===n?null:endFor(end,'rightEnd'),start,end};
  });
}
export function ligateFragments(left,right,{circularize=false}={}) {
  if(!left||!right||typeof left.sequence!=='string'||typeof right.sequence!=='string')
    throw new TypeError('Two fragments are required');
  if(left.circular||right.circular)throw new RangeError('Cannot ligate already circular DNA');
  if(!compatibleEnds(left.rightEnd,right.leftEnd))
    throw new RangeError('Incompatible ligation ends');
  const seq=normalizeDNA(left.sequence,{allowAmbiguous:false})+
            normalizeDNA(right.sequence,{allowAmbiguous:false});
  const joined={sequence:seq,length:seq.length,circular:false,
    leftEnd:left.leftEnd??null,rightEnd:right.rightEnd??null};
  if(circularize){
    if(!compatibleEnds(joined.rightEnd,joined.leftEnd))
      throw new RangeError('Outer ends cannot circularize');
    joined.circular=true;joined.leftEnd=null;joined.rightEnd=null;
  }
  return joined;
}
/** Safe two-fragment reconstitution of a single-cut linear substrate. */
export function rejoinSingleCut(sequence,enzyme='EcoRI') {
  const fragments=digestFragments(sequence,[enzyme],{circular:false});
  if(fragments.length!==2)throw new RangeError('Expected exactly one internal cut');
  return ligateFragments(fragments[0],fragments[1]);
}
