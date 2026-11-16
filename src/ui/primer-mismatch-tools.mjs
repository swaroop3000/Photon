/** Photon 1.9 — mismatch-aware binding preview. Read-only. */
import {mismatchPrimerPairScreen} from '../core/primer-mismatch.mjs';
export function renderMismatchPrimerPreview(){
 const host=globalThis.PhotonEditorBridgeHost,root=document.getElementById('tb');
 if(!host||!root||!document.querySelector('.tab.active[data-tool="primers"]')||
   document.getElementById('photonPrimerMismatchV19'))return;
 const section=document.createElement('section');section.id='photonPrimerMismatchV19';
 section.style.cssText='border-top:1px solid var(--line);margin-top:20px;padding-top:14px';
 const heading=document.createElement('h3');heading.textContent='Mismatch-aware binding screen · Photon 1.9';
 const note=document.createElement('div');note.className='mini';
 note.textContent='Ungapped, sequence-only screen. Select mismatches and a protected 3\u2032 terminal region; this is not PCR success prediction.';
 const f=document.createElement('input');f.setAttribute('aria-label','Mismatch-screen forward primer');
 f.placeholder='Forward primer (5\u2032→3\u2032)';f.style.marginTop='9px';
 const r=document.createElement('input');r.setAttribute('aria-label','Mismatch-screen reverse primer');
 r.placeholder='Reverse primer (5\u2032→3\u2032)';r.style.marginTop='7px';
 const fields=document.createElement('div');fields.style.cssText='display:flex;align-items:center;gap:8px;margin:9px 0;flex-wrap:wrap';
 const m=document.createElement('input');m.type='number';m.min='0';m.max='20';m.value='1';m.style.width='64px';
 m.setAttribute('aria-label','Maximum primer mismatches');
 const p=document.createElement('input');p.type='number';p.min='0';p.max='20';p.value='2';p.style.width='64px';
 p.setAttribute('aria-label','Protected 3 prime bases');
 const lm=document.createElement('label');lm.textContent='Max mismatches';const lp=document.createElement('label');lp.textContent='Protected 3\u2032 bases';
 fields.append(lm,m,lp,p);
 const button=document.createElement('button');button.type='button';button.className='btn sm primary';button.textContent='Screen binding sites';
 const out=document.createElement('pre');out.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;max-height:310px;overflow:auto;font-size:12px;margin-top:10px';
 button.onclick=()=>{
   try{
     const w=host.working();
     const result=mismatchPrimerPairScreen(w.seq,f.value,r.value,{
       circular:w.topology==='circular',maxMismatches:Number(m.value),
       protected3Prime:Number(p.value),maxHits:500
     });
     const summary=result.summary;
     const lines=[
       'Forward: '+summary.forwardCount+' sites ('+summary.forwardPerfect+' exact)',
       'Reverse: '+summary.reverseCount+' sites ('+summary.reversePerfect+' exact)',
       'Site coordinates: 1-based nucleotide starts',
     ];
     for(const [name,sites] of [['F',result.forwardSites],['R',result.reverseSites]]){
       for(const s of sites.slice(0,20))
         lines.push(name+' @ '+(s.start+1)+' | '+s.mismatches+' mismatch(es)'+
           (s.primerMismatchPositions.length?' | primer indices: '+s.primerMismatchPositions.map(x=>x+1).join(','):'')+
           (s.wrapsOrigin?' | wraps origin':''));
       if(sites.length>20)lines.push(name+': '+(sites.length-20)+' more sites omitted');
     }
     lines.push('This screen does not validate primer thermodynamics, amplicon yield or genomic off-target specificity.');
     out.textContent=lines.join('\n');
   }catch(error){out.textContent='Screen rejected: '+error.message;}
 };
 section.append(heading,note,f,r,fields,button,out);root.append(section);
}
globalThis.PhotonMismatchTools={render:renderMismatchPrimerPreview};
renderMismatchPrimerPreview();
