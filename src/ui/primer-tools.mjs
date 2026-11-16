/** Photon 1.7 — independent primer screening and virtual PCR panel.
 * Read-only analysis; does not mutate existing sequence or primer UI.
 */
import { primerMetrics, primerBindingSites, virtualPCRProducts } from '../core/primers.mjs';
export function renderPrimerPreview() {
 const host=globalThis.PhotonEditorBridgeHost;
 const root=document.getElementById('tb');
 if(!host||!root||!document.querySelector('.tab.active[data-tool="primers"]'))return;
 if(document.getElementById('photonPrimersV17'))return;
 const pane=document.createElement('section');pane.id='photonPrimersV17';
 pane.style.cssText='border-top:1px solid var(--line);margin-top:20px;padding-top:14px';
 const title=document.createElement('h3');title.textContent='Primer screening and virtual PCR · Photon 1.7';
 const note=document.createElement('div');note.className='mini';
 note.textContent='Exact-match binding and heuristic Tm/hairpin screening. Results are not lab-validated.';
 const forward=document.createElement('input');forward.placeholder='Forward primer (5\u2032→3\u2032)';
 forward.setAttribute('aria-label','Forward primer');
 const reverse=document.createElement('input');reverse.placeholder='Reverse primer (5\u2032→3\u2032)';
 reverse.setAttribute('aria-label','Reverse primer');
 forward.style.marginTop='9px';reverse.style.marginTop='7px';
 const button=document.createElement('button');button.type='button';button.className='btn sm primary';
 button.textContent='Screen primers and predict PCR';button.style.marginTop='8px';
 const out=document.createElement('pre');out.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;max-height:300px;overflow:auto;margin-top:9px;font-size:12px';
 button.onclick=()=>{
   try{
     const w=host.working(),circular=w.topology==='circular';
     const f=primerMetrics(forward.value),r=primerMetrics(reverse.value);
     const fmt=(label,p)=>label+' '+p.sequence+'\n  Tm ≈ '+p.approxTmC+' °C, GC '+p.gcPercent.toFixed(1)+'%, dimer flag '+(p.possibleSelfDimer?'yes':'no')+', hairpin flag '+(p.possibleHairpin?'yes':'no');
     const fSites=primerBindingSites(w.seq,f.sequence,{circular,strand:'forward'});
     const rSites=primerBindingSites(w.seq,r.sequence,{circular,strand:'reverse'});
     const products=virtualPCRProducts(w.seq,f.sequence,r.sequence,{circular});
     const lines=[fmt('Forward:',f),fmt('Reverse:',r),
       'Forward binding sites: '+fSites.length+', reverse binding sites: '+rSites.length,
       'Potential products: '+products.length];
     products.slice(0,25).forEach((p,i)=>lines.push((i+1)+'. '+p.length+' bp @ '+(p.start+1)+' to '+p.end+(p.wrapsOrigin?' (wraps origin)':'')));
     if(products.length>25)lines.push('... '+(products.length-25)+' additional products not shown');
     lines.push('Exact binding only; mismatch tolerance, thermodynamics and off-target genomic specificity not modeled.');
     out.textContent=lines.join('\n');
   }catch(error){out.textContent='Primer analysis rejected: '+error.message;}
 };
 pane.append(title,note,forward,reverse,button,out);root.append(pane);
}
globalThis.PhotonPrimerTools={render:renderPrimerPreview};
renderPrimerPreview();
