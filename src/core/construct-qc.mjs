/** Photon 3.2 — deterministic, advisory sequence/annotation QC.
 * No clinical or laboratory predictions. Feature coords are 1-based inclusive.
 * Circular origin-spanning features use start>end as two sequential intervals.
 */
import {normalizeDNA,gcContent,reverseComplement,translate} from './dna.mjs';
import {validateFeature,featureIntervals} from './feature-io.mjs';
import {interpretCDS} from './cds-semantics.mjs';
const STOPS=new Set(['TAA','TAG','TGA']);
function warning(code,severity,message,extra={}){
 return {code,severity,message,...extra};
}
function runWindows(seq,{circular,minRun}){
 const n=seq.length,results=[];
 let last='';let start=0;
 for(let i=0;i<=n;i++){
   const base=seq[i]??'';
   if(base!==last){
     if(last&&i-start>=minRun)
       results.push({start:start+1,end:i,base:last,length:i-start});
     last=base;start=i;
   }
 }
 if(circular&&results.length>1&&results[0].base===results.at(-1).base){
   const first=results.shift(),end=results.pop(),length=end.length+first.length;
   if(length>=minRun)results.unshift({start:end.start,end:first.end,base:first.base,length,wrapsOrigin:true});
 }
 return results;
}
function tandemRepeats(seq,{circular,minUnits,maxMotif,limit}){
 const n=seq.length,out=[];
 for(let unit=2;unit<=maxMotif;unit++){
   if(n<unit*minUnits)continue;
   for(let i=0;i<n;i++){
     // In circular mode motif can wrap origin, but report each run only
     // once at its earliest coordinate in an explicitly bounded scan.
     if(!circular&&i+unit*minUnits>n)break;
     const motif=Array.from({length:unit},(_,j)=>seq[(i+j)%n]).join('');
     // Skip later starts within the same repeated tract BEFORE counting.
     // Otherwise homopolymers can trigger O(n²) work on long plasmids.
     if(i>=unit||circular){
       if(!(circular&&i===0)){
         let isContinuation=true;
         for(let j=0;j<unit;j++){
           if(seq[(i-unit+j+n)%n]!==motif[j]){isContinuation=false;break;}
         }
         if(isContinuation)continue;
       }
     }
     let copies=1;
     while(copies<Math.floor(n/unit)){
       if(!circular&&i+(copies+1)*unit>n)break;
       let equal=true;
       for(let j=0;j<unit;j++){
         const pos=i+copies*unit+j;
         if(seq[pos%n]!==motif[j]){equal=false;break;}
       }
       if(!equal)break;
       copies++;
     }
     if(copies>=minUnits){
       const span=copies*unit;
       out.push({start:i+1,end:((i+span-1)%n)+1,unit,motif,copies,length:span,
         wrapsOrigin:i+span>n});
       if(out.length>=limit)return {items:out,truncated:true};
     }
   }
 }
 return {items:out,truncated:false};
}
/** A 6-frame ATG-to-stop scan, limited to complete ORFs. Coordinates are
 * on a linear orientation of the provided sequence; origin-crossing novel
 * ORFs are not inferred automatically.
 */
function predictedOrfs(seq,{minimumAminoAcids=30,limit=100}={}){
 const found=[],n=seq.length;
 for(const strand of [1,-1]){
   const oriented=strand===1?seq:reverseComplement(seq);
   for(let frame=0;frame<3;frame++){
     let active=-1;
     for(let i=frame;i+2<n;i+=3){
       const triplet=oriented.slice(i,i+3);
       if(active===-1&&triplet==='ATG')active=i;
       if(active!==-1&&STOPS.has(triplet)){
         const aa=(i-active)/3;
         if(aa>=minimumAminoAcids){
           const start=strand===1?active+1:n-(i+2);
           const end=strand===1?i+3:n-active;
           found.push({start,end,strand,frame,aminoAcids:aa});
           if(found.length>=limit)return {items:found,truncated:true};
         }
         active=-1;
       }
     }
   }
 }
 return {items:found,truncated:false};
}
export function analyzeConstructQC(working,{homopolymerMin=8,tandemMinUnits=4,
  tandemMaxMotif=6,repeatLimit=100,orfMinAminoAcids=30}={}){
 if(!working||typeof working!=='object'||!Array.isArray(working.features)||
 !['circular','linear'].includes(working.topology))
   throw new RangeError('Working construct with topology and features required');
 const sequence=normalizeDNA(working.seq,{allowAmbiguous:false}),n=sequence.length;
 if(!n)throw new RangeError('Cannot analyze empty DNA');
 if(n>1000000)throw new RangeError('QC supports up to 1,000,000 bases');
 if(working.features.length>2000)throw new RangeError('QC supports up to 2,000 annotations per report');
 for(const [key,value,min,max] of [
  ['homopolymerMin',homopolymerMin,2,100],
  ['tandemMinUnits',tandemMinUnits,2,20],
  ['tandemMaxMotif',tandemMaxMotif,2,12],
  ['repeatLimit',repeatLimit,1,1000],
  ['orfMinAminoAcids',orfMinAminoAcids,1,1000]
 ]){
   if(!Number.isSafeInteger(value)||value<min||value>max)
     throw new RangeError('Invalid QC option: '+key);
 }
 const circular=working.topology==='circular';
 const counts=Object.fromEntries('ACGT'.split('').map(base=>[base,0]));
 for(const base of sequence)counts[base]++;
 const gc=gcContent(sequence);
 const warnings=[];
 const features=working.features.map((f,index)=>{
   try{
     validateFeature(f,n,{circular});
   }catch(error){
     warnings.push(warning('INVALID_FEATURE','error',error.message,{featureIndex:index,
       featureName:String(f?.name??'unnamed')}));
     return {index,name:String(f?.name??'unnamed'),type:String(f?.type??''),
       valid:false,problems:['INVALID_FEATURE']};
   }
   const problems=[],cds=String(f.type??'').toLowerCase()==='cds';
   const length=featureIntervals(f,n,{circular}).reduce((sum,p)=>sum+p.end-p.start+1,0);
   if(f.affected){
     problems.push('AFFECTED_ANNOTATION');
     warnings.push(warning('AFFECTED_ANNOTATION','warning',
       'Sequence edit affected this annotation; review coordinates.',{featureIndex:index,featureName:f.name}));
   }
   if(cds){
    try{
     const coding=interpretCDS(sequence,f,{circular}),dna=coding.dna;
     if(coding.codonStart!==1){
       problems.push('CDS_PARTIAL_CODON_START');
       warnings.push(warning('CDS_PARTIAL_CODON_START','info',
         'CDS translation skips bases according to /codon_start.',{featureIndex:index,featureName:f.name}));
     }
     if(coding.translationMatches===false){
       problems.push('CDS_TRANSLATION_MISMATCH');
       warnings.push(warning('CDS_TRANSLATION_MISMATCH','warning',
         'Computed peptide differs from annotated /translation.',{featureIndex:index,featureName:f.name}));
     }
     if(dna.length%3!==0){
       problems.push('CDS_FRAME');
       warnings.push(warning('CDS_FRAME','warning',
         'Annotated CDS length is not divisible by three.',{featureIndex:index,featureName:f.name,length}));
     }
     if(dna.slice(0,3)!=='ATG'){
       problems.push('CDS_START');
       warnings.push(warning('CDS_START','info',
         'Annotated CDS does not begin with ATG (alternative starts may be valid).',
         {featureIndex:index,featureName:f.name}));
     }
     if(!STOPS.has(dna.slice(-3))){
       problems.push('CDS_STOP');
       warnings.push(warning('CDS_STOP','info',
         'Annotated CDS has no terminal standard stop codon.',{featureIndex:index,featureName:f.name}));
     }
     const protein=coding.protein;
     if(protein.slice(0,-1).includes('*')){
       problems.push('CDS_INTERNAL_STOP');
       warnings.push(warning('CDS_INTERNAL_STOP','warning',
         'Annotated CDS contains an in-frame internal stop codon.',{featureIndex:index,featureName:f.name}));
     }
    }catch(error){
      problems.push('CDS_UNSUPPORTED_SEMANTICS');
      warnings.push(warning('CDS_UNSUPPORTED_SEMANTICS','warning',error.message,
        {featureIndex:index,featureName:f.name}));
    }
   }
   return {index,name:String(f.name??'unnamed'),type:String(f.type??''),
     start:f.start,end:f.end,...(f.segments?{segments:structuredClone(f.segments)}:{}),strand:f.strand??1,length,valid:true,problems};
 });
 // Annotation overlaps are descriptive; intentional nested biology is common.
 if(features.some(f=>f.segments))warnings.push(warning('COMPOUND_STATISTICS_EXCLUDED','info','Compound CDS use spliced sequence. Compound features are excluded from contiguous overlap and adjacent-boundary statistics.'));
 const occupied=features.filter(f=>f.valid&&!f.segments&&f.start<=f.end);
 let overlaps=0;
 for(let i=0;i<occupied.length;i++)for(let j=i+1;j<occupied.length;j++){
   if(occupied[i].start<=occupied[j].end&&occupied[j].start<=occupied[i].end)overlaps++;
 }
 if(overlaps)warnings.push(warning('ANNOTATION_OVERLAP','info',
   overlaps+' pair(s) of contiguous annotations overlap (may be intentional).',{pairs:overlaps}));
 // Adjacent feature boundaries are inspection points, not verified
 // cloning junctions. This report has no source-template evidence.
 const annotationJunctions=[];
 const sorted=[...occupied].sort((a,b)=>a.start-b.start||a.end-b.end);
 for(let i=0;i<sorted.length;i++){
   const left=sorted[i],right=sorted[(i+1)%sorted.length];
   const adjacent=(i<sorted.length-1&&left.end+1===right.start)||
     (circular&&i===sorted.length-1&&left.end===n&&right.start===1);
   if(!adjacent)continue;
   const position=left.end%n;
   const flank=Math.min(6,n);
   const upstream=Array.from({length:flank},(_,j)=>sequence[(position-flank+j+n)%n]).join('');
   const downstream=Array.from({length:flank},(_,j)=>sequence[(position+j)%n]).join('');
   annotationJunctions.push({leftFeature:left.name,rightFeature:right.name,
     boundary:position,flanks:upstream+'|'+downstream,
     assessment:'sequence context only; reference junction not supplied'});
 }
 const runs=runWindows(sequence,{circular,minRun:homopolymerMin});
 const tandem=tandemRepeats(sequence,{circular,minUnits:tandemMinUnits,maxMotif:tandemMaxMotif,limit:repeatLimit});
 const orfs=predictedOrfs(sequence,{minimumAminoAcids:orfMinAminoAcids,limit:100});
 if(runs.length)warnings.push(warning('HOMOPOLYMER','info',runs.length+' homopolymer run(s) meet the threshold.'));
 if(tandem.items.length)warnings.push(warning('TANDEM_REPEAT','info',tandem.items.length+' tandem-repeat candidate(s) found.'));
 if(tandem.truncated)warnings.push(warning('REPEAT_TRUNCATED','info','Tandem-repeat list reached its reporting limit.'));
 if(!working.features.length)warnings.push(warning('UNANNOTATED','info','No features are annotated.'));
 return {
   format:'photon/construct-qc/1',name:String(working.name??'Unnamed'),topology:working.topology,
   length:n,baseCounts:counts,gcFraction:gc,featureCount:working.features.length,
   features,warnings,annotationJunctions,
   repeats:{homopolymers:runs,tandem:tandem.items,truncated:tandem.truncated},
   predictedOrfs:orfs.items,orfListTruncated:orfs.truncated,
   methodology:{
     coordinates:'1-based inclusive features; predicted ORFs on linearized strands',
     CDS:'CDS tables 1 and 11 with codon_start; unsupported biological instructions are reported, not translated. ORF scans use standard code and an ATG heuristic',
     restrictions:'No enzyme or wet-lab validation',
     junctions:'Adjacent contiguous annotation boundaries only; compound/wrapped features excluded. No sequence-source verification',
     overlaps:'Contiguous non-wrapped annotation pairs only; compound/wrapped features excluded',
     coverage:'Advisory sequence analysis only; does not establish construct viability'
   }
 };
}
export function serializeQCReport(report){
 if(!report||report.format!=='photon/construct-qc/1')throw new RangeError('Unsupported QC report');
 return JSON.stringify(report,null,2)+'\n';
}
