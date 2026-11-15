/** Photon 3.3 — interactive, non-destructive translation explorer.
 * Inspect six linearized reading frames and validated annotated CDS.
 * Report export refuses stale working constructs.
 */
import {translateConstructReport,serializeTranslationReport} from '../core/translation-analysis.mjs';
export function renderTranslationExplorer(){
 const container=document.getElementById('tb'),host=globalThis.PhotonEditorBridgeHost;
 if(!container||!host||!document.querySelector('.tab.active[data-tool="builder"]')||
    document.getElementById('photonTranslationV33'))return;
 const panel=document.createElement('section');panel.id='photonTranslationV33';
 panel.style.cssText='border-top:1px solid var(--line);margin-top:18px;padding-top:15px';
 const title=document.createElement('h3');title.textContent='Six-frame translation explorer · Photon 3.3';
 const help=document.createElement('div');help.className='mini';
 help.textContent='Inspect standard-code translations for all six linearized frames, complete ATG-to-stop ORF candidates, and annotated CDS sequences (tables 1/11 and codon_start). Original 1-based coordinates shown. Not a biological function prediction.';
 const controls=document.createElement('div');
 controls.style.cssText='display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:9px 0';
 const minLabel=document.createElement('label');minLabel.textContent='Minimum ORF length (aa)';
 minLabel.htmlFor='photonOrfMinV33';
 const min=document.createElement('input');min.type='number';min.id='photonOrfMinV33';
 min.min='1';min.max='1000';min.step='1';min.value='30';min.style.maxWidth='95px';
 const run=document.createElement('button');run.type='button';run.className='btn sm primary';run.textContent='Analyze translation';
 const download=document.createElement('button');download.type='button';download.className='btn sm';
 download.textContent='Download translation JSON';download.style.display='none';
 controls.append(minLabel,min,run,download);
 const details=document.createElement('div');details.id='photonTranslationSummary';
 details.style.cssText='white-space:pre-wrap;margin:9px 0';
 const frameLabel=document.createElement('label');frameLabel.textContent='Inspect reading frame';
 frameLabel.htmlFor='photonFrameSelectV33';
 const frame=document.createElement('select');frame.id='photonFrameSelectV33';
 for(const id of ['+1','+2','+3','-1','-2','-3']){
   const option=document.createElement('option');option.value=id;option.textContent=id;frame.append(option);
 }
 const frameArea=document.createElement('pre');frameArea.id='photonFrameViewV33';
 frameArea.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;max-height:240px;overflow:auto;font-size:12px;margin:9px 0';
 const cds=document.createElement('div');cds.id='photonCDSViewV33';
 cds.style.cssText='white-space:pre-wrap;max-height:240px;overflow:auto;font-size:12px';
 const orfs=document.createElement('div');orfs.id='photonORFViewV33';
 orfs.style.cssText='white-space:pre-wrap;max-height:240px;overflow:auto;font-size:12px';
 let report=null,snapshot=null;
 const signature=w=>JSON.stringify([host.identity(),w.name,w.seq,w.topology,w.features]);
 function invalid(message){
   report=null;snapshot=null;download.style.display='none';
   details.textContent=message;frameArea.textContent='';cds.textContent='';orfs.textContent='';
 }
 function selectFrame(){
   if(!report)return;
   if(snapshot!==signature(host.working())){
     invalid('Construct changed. Analyze translation again.');return;
   }
   const entry=report.frames.find(f=>f.id===frame.value);
   frameArea.textContent='Frame '+entry.id+' · '+entry.codonCount+' translated codons'+
     (entry.previewTruncated?' (first 500 shown)':'')+
     '\nProtein preview: '+entry.proteinPreview+
     '\n\nCodon and original reference coordinates:\n'+
     entry.codons.slice(0,100).map(c=>c.start+'..'+c.end+' '+c.codon+' → '+c.aminoAcid).join('\n')+
     (entry.codons.length>100?'\n… First 100 codons listed; JSON export includes up to 500.':'');
 }
 run.onclick=()=>{
   invalid('');
   try{
     const original=structuredClone(host.working());
     const size=Number(min.value);
     if(min.value.trim()==='')throw new RangeError('Enter a minimum ORF length');
     const result=translateConstructReport(original,{minimumAminoAcids:size});
     if(signature(original)!==signature(host.working()))throw new Error('Working DNA changed during analysis');
     report=result;snapshot=signature(original);
     details.textContent=result.name+' · '+result.length+' bp · '+result.topology+
       '\nSix reading frames · '+result.candidates.length+' complete ORF candidates ≥'+size+' aa'+
       (result.candidatesTruncated?' (candidate list capped)':'')+
       ' · '+result.annotatedCDS.length+' annotated CDS'+
       '\nReverse-strand coordinates refer to the original displayed DNA; linearized analysis excludes novel origin-spanning ORFs.';
     cds.textContent='Annotated CDS:\n'+(result.annotatedCDS.length?
       result.annotatedCDS.map(x=>x.name+': '+(x.valid?
       x.start+'..'+x.end+' ('+(x.strand===-1?'-':'+')+
       ') · table '+x.translationTable+' · codon_start '+x.codonStart+' · '+x.aminoAcidLength+' aa · '+(x.flags.join(', ')||'no heuristic flags')+
       '\n  Protein '+x.protein.slice(0,150)+(x.protein.length>150?'…':'')
       :'CDS not analyzed: '+x.error)).join('\n'):
       'None.');
     orfs.textContent='Complete candidate ORFs (first 50):\n'+
       (result.candidates.slice(0,50).map(x=>x.frame+' · '+x.start+'..'+x.end+
       ' · '+x.aminoAcids+' aa · '+x.protein.slice(0,90)).join('\n')||'None above threshold');
     download.style.display='inline-flex';
     selectFrame();
   }catch(error){invalid('Translation analysis rejected: '+error.message);}
 };
 frame.onchange=selectFrame;
 min.oninput=()=>{if(report)invalid('ORF threshold changed. Analyze translation again.');};
 download.onclick=()=>{
   if(!report||signature(host.working())!==snapshot){
     invalid('Construct changed. Analyze translation again before export.');return;
   }
   const blob=new Blob([serializeTranslationReport(report)],{type:'application/json'});
   const url=URL.createObjectURL(blob),link=document.createElement('a');
   link.href=url;link.download='photon-translation-'+report.name.replace(/[^a-z0-9_-]/gi,'_')+'.json';
   link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 panel.append(title,help,controls,details,frameLabel,frame,frameArea,cds,orfs);
 container.append(panel);
}
globalThis.PhotonTranslationExplorer={render:renderTranslationExplorer};
renderTranslationExplorer();
