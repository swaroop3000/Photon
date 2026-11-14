/** Photon 1.6: sequence-based Type IIS Golden Gate assembly model.
 * Supports BsaI/BsmBI in the prepared-part architecture:
 * forward site, 1-nt spacer, 4-nt left overhang, payload,
 * 4-nt right overhang, 1-nt spacer, reverse site.
 * No kinetics, enzyme star activity, methylation, or experimental yield.
 */
import { normalizeDNA } from './dna.mjs';
export const TYPE_IIS=Object.freeze({
 BsaI:Object.freeze({forward:'GGTCTC',reverse:'GAGACC',gap:1,overhang:4}),
 BsmBI:Object.freeze({forward:'CGTCTC',reverse:'GAGACG',gap:1,overhang:4})
});
function occurrences(seq,pattern){
 const positions=[];
 for(let i=0;i<=seq.length-pattern.length;i++)
   if(seq.slice(i,i+pattern.length)===pattern)positions.push(i);
 return positions;
}
function enzymeConfig(name){
 if(!Object.hasOwn(TYPE_IIS,name))throw new RangeError('Unsupported Type IIS enzyme: '+name);
 return TYPE_IIS[name];
}
/** Cut coordinates are zero-based interbase. Part sequences are oriented 5'->3'. */
export function extractGoldenGatePart(sequence,{enzyme='BsaI',id='part'}={}){
 const dna=normalizeDNA(sequence,{allowAmbiguous:false});
 const e=enzymeConfig(enzyme),fwd=occurrences(dna,e.forward),rev=occurrences(dna,e.reverse);
 if(fwd.length!==1||rev.length!==1)
   throw new RangeError('Each part requires exactly one forward and one reverse recognition site');
 const f=fwd[0],r=rev[0];
 const leftCut=f+e.forward.length+e.gap,rightCut=r-e.gap-e.overhang;
 const leftBottom=leftCut+e.overhang,rightBottom=r-e.gap;
 if(f>=r||leftBottom>=rightCut||rightBottom>dna.length||leftBottom>dna.length)
   throw new RangeError('Recognition site positions cannot produce a retained insert with an internal payload');
 const retained=dna.slice(leftCut,rightCut);
 if(occurrences(retained,e.forward).length||occurrences(retained,e.reverse).length)
   throw new RangeError('Internal Type IIS site would cleave the retained insert');
 return {id:String(id),enzyme,sequence:retained,length:retained.length,
   leftOverhang:dna.slice(leftCut,leftBottom),
   rightOverhang:dna.slice(rightCut,rightBottom),leftCut,rightCut,sourceLength:dna.length};
}
/** Ordered, directional assembly; no automatic fragment ordering or orientation. */
export function assembleGoldenGate(parts,{enzyme='BsaI',circularize=true}={}){
 enzymeConfig(enzyme);
 if(!Array.isArray(parts)||parts.length<2)
   throw new RangeError('At least two ordered parts are required');
 const extracted=parts.map((p,i)=>extractGoldenGatePart(
   typeof p==='string'?p:p?.sequence,
   {enzyme,id:typeof p==='string'?'part-'+(i+1):p?.id??'part-'+(i+1)}));
 const junctions=[];
 for(let i=1;i<extracted.length;i++){
   const a=extracted[i-1],b=extracted[i];
   if(a.rightOverhang!==b.leftOverhang)
     throw new RangeError('Incompatible overhang between '+a.id+' and '+b.id+': '+a.rightOverhang+' vs '+b.leftOverhang);
   junctions.push({from:a.id,to:b.id,overhang:a.rightOverhang});
 }
 if(circularize){
   const a=extracted.at(-1),b=extracted[0];
   if(a.rightOverhang!==b.leftOverhang)
     throw new RangeError('Incompatible circular junction between '+a.id+' and '+b.id);
   junctions.push({from:a.id,to:b.id,overhang:a.rightOverhang,circular:true});
 }
 const sequence=extracted.map(p=>p.sequence).join('');
 return {enzyme,sequence,length:sequence.length,circular:Boolean(circularize),
   parts:extracted,junctions,
   note:'In-silico directional Type IIS sequence model; no experimental success claim.'};
}
