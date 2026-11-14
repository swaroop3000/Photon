/** Photon 1.5 — independent sequence-only Gibson assembly preview.
 * Non-destructive: does not mutate the working construct.
 */
import { assembleOverlaps } from '../core/assembly.mjs';

export function renderGibsonPreview() {
  const host=globalThis.PhotonEditorBridgeHost;
  const root=document.getElementById('tb');
  if(!root||!host||!document.querySelector('.tab.active[data-tool="cloning"]'))return;
  if(document.getElementById('photonGibsonV15'))return;
  const pane=document.createElement('section');
  pane.id='photonGibsonV15';
  pane.style.cssText='border-top:1px solid var(--line);margin-top:20px;padding-top:14px';
  const heading=document.createElement('h3');heading.textContent='Gibson overlap assembly · Photon 1.5';
  const note=document.createElement('div');note.className='mini';
  note.textContent='Current sequence is fragment 1. Paste one additional prepared, oriented fragment per line. Exact overlaps ≥15 bp required. Preview only.';
  const area=document.createElement('textarea');area.rows=4;area.placeholder='Fragment 2 (5\u2032→3\u2032)\nFragment 3 (optional)';
  area.style.marginTop='9px';
  const options=document.createElement('div');options.style.cssText='display:flex;gap:8px;align-items:center;margin:10px 0;flex-wrap:wrap';
  const circ=document.createElement('input');circ.type='checkbox';circ.id='photonGibsonCircular';circ.style.width='auto';
  const cl=document.createElement('label');cl.htmlFor=circ.id;cl.textContent='Circularize';
  const button=document.createElement('button');button.type='button';button.className='btn sm primary';button.textContent='Simulate assembly';
  const out=document.createElement('pre');out.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;max-height:280px;overflow:auto;margin-top:9px';
  button.onclick=()=>{
    try{
      const additional=area.value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
      const r=assembleOverlaps([host.working().seq,...additional],{circularize:circ.checked});
      out.textContent='Result: '+r.length+' bp · '+(r.circular?'circular':'linear')+
        '\nJunctions: '+r.junctions.map(j=>j.overlap+' bp').join(', ')+
        '\nSequence: '+r.sequence.slice(0,800)+(r.sequence.length>800?'…':'')+
        '\n\nSimulation only — does not predict reaction success.';
    }catch(e){out.textContent='Assembly rejected: '+e.message;}
  };
  options.append(circ,cl);pane.append(heading,note,area,options,button,out);root.append(pane);
}
globalThis.PhotonGibsonTools={render:renderGibsonPreview};
renderGibsonPreview();
