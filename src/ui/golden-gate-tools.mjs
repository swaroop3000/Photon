/** Photon 1.6 — non-destructive Golden Gate assembly preview. */
import {assembleGoldenGate, TYPE_IIS} from '../core/golden-gate.mjs';

export function renderGoldenGatePreview() {
 const host=globalThis.PhotonEditorBridgeHost;
 const root=document.getElementById('tb');
 if(!host||!root||!document.querySelector('.tab.active[data-tool="cloning"]'))return;
 if(document.getElementById('photonGoldenGateV16'))return;
 const pane=document.createElement('section');pane.id='photonGoldenGateV16';
 pane.style.cssText='border-top:1px solid var(--line);margin-top:20px;padding-top:14px';
 const heading=document.createElement('h3');heading.textContent='Golden Gate assembly · Photon 1.6';
 const help=document.createElement('div');help.className='mini';
 help.textContent='Paste prepared, ordered Type IIS parts (one sequence per line). Each part needs a forward and reverse recognition site, 1-nt spacers and 4-nt cohesive ends. Preview only; existing construct unchanged.';
 const enzyme=document.createElement('select');enzyme.style.cssText='margin:9px 0';
 for(const name of Object.keys(TYPE_IIS)){
   const opt=document.createElement('option');opt.value=name;opt.textContent=name;enzyme.append(opt);
 }
 const area=document.createElement('textarea');area.rows=5;
 area.placeholder='Part 1: GGTCTC…GAGACC\nPart 2: GGTCTC…GAGACC';
 const line=document.createElement('div');line.style.cssText='display:flex;gap:8px;align-items:center;margin:9px 0';
 const circular=document.createElement('input');circular.type='checkbox';circular.checked=true;
 circular.id='photonGoldenGateCircular';circular.style.width='auto';
 const label=document.createElement('label');label.htmlFor=circular.id;label.textContent='Circular construct';
 line.append(circular,label);
 const button=document.createElement('button');button.type='button';button.className='btn sm primary';
 button.textContent='Simulate Golden Gate';
 const output=document.createElement('pre');
 output.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;max-height:300px;overflow:auto;margin-top:10px;font-size:12px';
 button.onclick=()=>{
   try {
     const parts=area.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
     const r=assembleGoldenGate(parts,{enzyme:enzyme.value,circularize:circular.checked});
     output.textContent='Enzyme: '+r.enzyme+'\nProduct: '+r.length+' bp · '+(r.circular?'circular':'linear')+
       '\nJunctions: '+r.junctions.map(j=>j.from+' → '+j.to+' ['+j.overhang+']').join('; ')+
       '\nSequence: '+r.sequence.slice(0,900)+(r.sequence.length>900?'…':'')+
       '\n\nSequence-only simulation. Does not predict laboratory success.';
   }catch(err){output.textContent='Assembly rejected: '+err.message;}
 };
 pane.append(heading,help,enzyme,area,line,button,output);root.append(pane);
}
globalThis.PhotonGoldenGateTools={render:renderGoldenGatePreview};
renderGoldenGatePreview();
