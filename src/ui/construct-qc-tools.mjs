/** Photon 3.2 — non-destructive construct QC panel with JSON report export.
 * No background jobs, cloud transfer, or mutation of the working construct.
 */
import {analyzeConstructQC,serializeQCReport} from '../core/construct-qc.mjs';
export function renderConstructQC(){
 const root=document.getElementById('tb'),host=globalThis.PhotonEditorBridgeHost;
 if(!root||!host||!document.querySelector('.tab.active[data-tool="builder"]')||
    document.getElementById('photonConstructQCV32'))return;
 const panel=document.createElement('section');panel.id='photonConstructQCV32';
 panel.style.cssText='border-top:1px solid var(--line);padding-top:15px;margin-top:18px';
 const heading=document.createElement('h3');heading.textContent='Construct quality control · Photon 3.2';
 const subtitle=document.createElement('div');subtitle.className='mini';
 subtitle.textContent='Analyze the current working DNA for composition, homopolymer/tandem repeats, annotation integrity, and CDS/ORF heuristics. Results are advisory and do not change your construct.';
 const actions=document.createElement('div');
 actions.style.cssText='display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:9px 0';
 const run=document.createElement('button');run.className='btn sm primary';run.type='button';
 run.textContent='Run construct QC';
 const download=document.createElement('button');download.className='btn sm';download.type='button';
 download.textContent='Download QC JSON';download.style.display='none';
 const result=document.createElement('div');result.id='photonQCResult';result.style.whiteSpace='pre-wrap';
 const warningList=document.createElement('div');warningList.id='photonQCWarnings';
 warningList.style.cssText='max-height:280px;overflow:auto;margin-top:10px;font-size:12px';
 actions.append(run,download);
 let last=null,signature=null;
 const snap=w=>JSON.stringify([host.identity(),w.name,w.seq,w.topology,w.features]);
 function clear(){
   last=null;signature=null;download.disabled=true;download.style.display='none';
 }
 run.onclick=()=>{
   clear();warningList.replaceChildren();
   try{
     const before=structuredClone(host.working()),at=snap(before);
     const report=analyzeConstructQC(before);
     if(at!==snap(host.working()))throw new Error('Construct changed during analysis; rerun QC');
     last=report;signature=at;
     const errors=report.warnings.filter(w=>w.severity==='error').length;
     const warnings=report.warnings.filter(w=>w.severity==='warning').length;
     const infos=report.warnings.filter(w=>w.severity==='info').length;
     result.textContent=report.name+' · '+report.length+' bp · '+report.topology+
       '\nGC '+(100*report.gcFraction).toFixed(2)+'%'+
       ' · A '+report.baseCounts.A+' / C '+report.baseCounts.C+
       ' / G '+report.baseCounts.G+' / T '+report.baseCounts.T+
       '\nAnnotations '+report.featureCount+' · flagged errors '+errors+
       ' · warnings '+warnings+' · informational '+infos+
       '\nAdjacent annotation junctions '+report.annotationJunctions.length+
       '\nHomopolymer runs '+report.repeats.homopolymers.length+
       ' · tandem repeat candidates '+report.repeats.tandem.length+
       ' · complete ORFs (≥30 aa) '+report.predictedOrfs.length+
       '\nNote: ORF predictions do not infer coding function or origin-crossing unannotated ORFs.';
     if(!report.warnings.length){
       const p=document.createElement('p');p.textContent='No warnings found under these heuristic thresholds.';
       warningList.append(p);
     }else for(const w of report.warnings){
       const item=document.createElement('div');
       item.style.cssText='padding:5px 0;border-bottom:1px solid var(--line)';
       item.textContent='['+w.severity.toUpperCase()+'] '+w.code+' — '+w.message+
         (w.featureName?' ('+w.featureName+')':'');
       warningList.append(item);
     }
     download.disabled=false;download.style.display='inline-flex';
   }catch(error){result.textContent='QC rejected: '+error.message;}
 };
 download.onclick=()=>{
   if(!last||signature!==snap(host.working())){
     clear();result.textContent='Working construct changed. Run QC again before export.';return;
   }
   const blob=new Blob([serializeQCReport(last)],{type:'application/json'});
   const url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download='photon-qc-'+last.name.replace(/[^a-z0-9_-]/gi,'_')+'.json';
   a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 panel.append(heading,subtitle,actions,result,warningList);root.append(panel);
}
globalThis.PhotonConstructQC={render:renderConstructQC};
renderConstructQC();
