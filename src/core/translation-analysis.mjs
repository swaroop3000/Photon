/** Photon 3.3 — inspectable six-frame DNA translation and annotated CDS.
 * Coordinates are 1-based inclusive on the displayed DNA strand.
 * For minus frames, codons are mapped back to original forward coordinates.
 * Linearized reference only; novel origin-spanning ORFs are not inferred.
 */
import {normalizeDNA,reverseComplement,translate} from './dna.mjs';
import {validateFeature,circularFeatureSequence} from './feature-io.mjs';
const STOP=new Set(['TAA','TAG','TGA']);
const DISPLAY_LIMIT=500;
const ORF_LIMIT=250;
function check(w){
 if(!w||!['linear','circular'].includes(w.topology)||!Array.isArray(w.features))
   throw new RangeError('Valid construct topology and feature list required');
 const seq=normalizeDNA(w.seq,{allowAmbiguous:false});
 if(!seq.length||seq.length>1000000)throw new RangeError('Sequence length must be 1..1,000,000');
 return seq;
}
function frameLabel(strand,offset){return (strand===1?'+':'-')+(offset+1);}
export function sixFrameTranslation(working,{minimumAminoAcids=30}={}){
 const seq=check(working),n=seq.length;
 if(!Number.isSafeInteger(minimumAminoAcids)||minimumAminoAcids<1||minimumAminoAcids>1000)
   throw new RangeError('Invalid minimum ORF amino acids');
 const frames=[],candidates=[];
 let truncated=false;
 for(const strand of [1,-1]){
   const oriented=strand===1?seq:reverseComplement(seq);
   for(let frame=0;frame<3;frame++){
     let start=-1;
     const protein=translate(oriented,{frame});
     const codonCount=protein.length;
     const codons=[];
     for(let i=frame;i+2<n;i+=3){
       const codon=oriented.slice(i,i+3),index=(i-frame)/3;
       if(codons.length<DISPLAY_LIMIT)codons.push({
         codon,aminoAcid:protein[index],
         start:strand===1?i+1:n-i-2,
         end:strand===1?i+3:n-i,
         orientedStart:i+1
       });
       if(start<0&&codon==='ATG')start=i;
       if(start>=0&&STOP.has(codon)){
         const length=(i-start)/3;
         if(length>=minimumAminoAcids){
           if(candidates.length<ORF_LIMIT){
             candidates.push({
               frame:frameLabel(strand,frame),strand,
               start:strand===1?start+1:n-i-2,
               end:strand===1?i+3:n-start,
               aminoAcids:length,protein:translate(oriented.slice(start,i),{partial:'error'})
             });
           }else truncated=true;
         }
         start=-1;
       }
     }
     frames.push({id:frameLabel(strand,frame),strand,offset:frame,
       codonCount,proteinPreview:protein.slice(0,DISPLAY_LIMIT),
       previewTruncated:codonCount>DISPLAY_LIMIT,
       codons});
   }
 }
 return {format:'photon/translation/1',name:String(working.name??'Unnamed'),
   topology:working.topology,length:n,frames,
   candidates,candidatesTruncated:truncated,
   minimumAminoAcids,methodology:'Six linearized frames, standard genetic code, complete ATG-to-stop ORFs only. No circular-origin ORF discovery or biological expression inference.'};
}
export function analyzeAnnotatedCDS(working){
 const seq=check(working),circular=working.topology==='circular';
 return working.features.map((feature,index)=>{
   if(String(feature?.type??'').toLowerCase()!=='cds')return null;
   try{
     validateFeature(feature,seq.length,{circular});
     const nucleotides=circularFeatureSequence(seq,feature,{circular});
     const aa=translate(nucleotides,{partial:'ignore'});
     const divisible=nucleotides.length%3===0;
     const terminalStop=aa.endsWith('*');
     const stopCount=[...aa.slice(0,-1)].filter(c=>c==='*').length;
     return {index,name:String(feature.name??'CDS '+(index+1)),valid:true,
       start:feature.start,end:feature.end,strand:feature.strand??1,
       nucleotideLength:nucleotides.length,
       aminoAcidLength:aa.replace(/\*$/,'').length,
       startCodon:nucleotides.slice(0,3),
       terminalStop,internalStops:stopCount,
       protein:aa,
       flags:[
         ...(!divisible?['LENGTH_NOT_DIVISIBLE_BY_3']:[]),
         ...(nucleotides.slice(0,3)!=='ATG'?['NON_ATG_START']:[]),
         ...(!terminalStop?['NO_TERMINAL_STOP']:[]),
         ...(stopCount?['INTERNAL_STOP']:[])
       ]};
   }catch(error){
     return {index,name:String(feature?.name??'CDS '+(index+1)),
       valid:false,error:error.message};
   }
 }).filter(Boolean);
}
export function translateConstructReport(working,options={}){
 const frames=sixFrameTranslation(working,options);
 return {...frames,annotatedCDS:analyzeAnnotatedCDS(working)};
}
export function serializeTranslationReport(report){
 if(!report||report.format!=='photon/translation/1')throw new RangeError('Unsupported translation report');
 return JSON.stringify(report,null,2)+'\n';
}
