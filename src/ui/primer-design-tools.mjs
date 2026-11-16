/** Photon 1.8 — non-destructive, heuristic primer pair candidate list. */
import {designPrimerPairs} from '../core/primer-design.mjs';
export function renderPrimerDesigner(){
 const host=globalThis.PhotonEditorBridgeHost,root=document.getElementById('tb');
 if(!host||!root||!document.querySelector('.tab.active[data-tool="primers"]'))return;
 if(document.getElementById('photonPrimerDesignV18'))return;
 const section=document.createElement('section');section.id='photonPrimerDesignV18';
 section.style.cssText='border-top:1px solid var(--line);margin-top:20px;padding-top:14px';
 const title=document.createElement('h3');title.textContent='Primer pair candidates · Photon 1.8';
 const help=document.createElement('div');help.className='mini';
 help.textContent='Exact unique-template binding; approximate Tm and secondary-structure flags. Linear-template screening only. Not Primer3 or a lab-ready design.';
 const field=document.createElement('div');field.style.cssText='display:flex;gap:8px;margin:10px 0;align-items:center';
 const minInput=document.createElement('input');minInput.type='number';minInput.min='1';minInput.value='80';
 minInput.style.width='90px';minInput.setAttribute('aria-label','Minimum amplicon size');
 const maxInput=document.createElement('input');maxInput.type='number';maxInput.min='1';maxInput.value='1500';
 maxInput.style.width='90px';maxInput.setAttribute('aria-label','Maximum amplicon size');
 const label=document.createElement('span');label.className='mini';label.textContent='Product bp min / max';
 field.append(label,minInput,maxInput);
 const button=document.createElement('button');button.type='button';button.className='btn sm primary';button.textContent='Find candidate pairs';
 const results=document.createElement('div');results.style.marginTop='10px';
 button.onclick=()=>{
   results.replaceChildren();
   try{
     const w=host.working();
     if(w.topology==='circular')throw new RangeError('This candidate selector currently requires a linear construct; use Virtual PCR for circular templates.');
     const pairs=designPrimerPairs(w.seq,{minProduct:Number(minInput.value),maxProduct:Number(maxInput.value),maxPairs:10});
     if(!pairs.length){results.textContent='No candidate pairs meet the current constraints.';return;}
     pairs.forEach((p,i)=>{
       const card=document.createElement('div');card.className='li';card.style.marginBottom='8px';
       const heading=document.createElement('div');heading.textContent=(i+1)+'. Amplicon '+p.amplicon.length+' bp | score '+p.score;
       heading.style.fontWeight='600';
       const details=document.createElement('div');details.className='mono mini';
       details.textContent='F 5\u2032 '+p.forward.sequence+' 3\u2032 (Tm ≈ '+p.forward.metrics.approxTmC+' °C)\n'+
         'R 5\u2032 '+p.reverse.sequence+' 3\u2032 (Tm ≈ '+p.reverse.metrics.approxTmC+' °C)\n'+
         'Template: '+(p.forward.start+1)+' to '+p.reverse.end+
         (p.warnings.length?'\nFlags: '+p.warnings.join(', '):'');
       details.style.whiteSpace='pre-wrap';
       const show=document.createElement('button');show.className='btn sm';show.textContent='Show binding sites on map';
       show.onclick=()=>globalThis.PhotonPrimerMap?.show?.({
         forward:p.forward,reverse:p.reverse,templateLength:w.seq.length
       });
       card.append(heading,details,show);results.append(card);
     });
   }catch(e){results.textContent='Design unavailable: '+e.message;}
 };
 section.append(title,help,field,button,results);root.append(section);
}
globalThis.PhotonPrimerDesigner={render:renderPrimerDesigner};
renderPrimerDesigner();
