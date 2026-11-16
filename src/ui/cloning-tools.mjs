/** Photon 1.4 — non-destructive restriction-ligation preview.
 * This panel is separate from legacy simplified cloning workflows.
 * Outputs simulations only; it does not modify the current construct.
 */
import {digestFragments,ligateFragments} from '../core/cloning.mjs';
import {TYPE_II_ENZYMES} from '../core/restriction.mjs';

export function renderCloningPreview(){
 const host=globalThis.PhotonEditorBridgeHost;
 const panelRoot=document.getElementById('tb');
 if(!host||!panelRoot||!document.querySelector('.tab.active[data-tool="cloning"]'))return;
 if(document.getElementById('photonCloningV14'))return;
 const pane=document.createElement('section');
 pane.id='photonCloningV14';
 pane.style.cssText='border-top:1px solid var(--line);margin-top:20px;padding-top:14px';
 const heading=document.createElement('h3');heading.textContent='Validated-core restriction ligation · Photon 1.4';
 const note=document.createElement('div');note.className='mini';
 note.textContent='Simulates curated Type II cut ends, top-strand fragments and compatible ligation. No reaction chemistry or yields.';
 const chooser=document.createElement('select');chooser.style.cssText='margin:9px 0';
 for(const name of Object.keys(TYPE_II_ENZYMES)){
   const opt=document.createElement('option');opt.value=name;opt.textContent=name;chooser.append(opt);
 }
 const run=document.createElement('button');run.type='button';run.className='btn sm primary';
 run.textContent='Simulate digest and ligation';
 const out=document.createElement('pre');
 out.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;margin-top:10px;max-height:320px;overflow:auto';
 run.addEventListener('click',()=>{
   try{
     const w=host.working();
     const frags=digestFragments(w.seq,[chooser.value],{circular:w.topology==='circular'});
     const lines=['Input: '+w.seq.length+' bp · '+w.topology,'Fragments: '+frags.length];
     frags.forEach((f,i)=>{
       const end=x=>!x?'natural / no modeled ligation end':x.kind+
         (x.overhang?' '+x.overhang:'');
       lines.push((i+1)+'. '+f.length+' bp | 5\u2032 end: '+end(f.leftEnd)+
         ' | 3\u2032 end: '+end(f.rightEnd));
     });
     if(frags.length===2&&!frags.some(f=>f.circular)){
       try{
         const joined=ligateFragments(frags[0],frags[1]);
         lines.push('Compatible ligation product: '+joined.length+' bp');
         lines.push('Sequence: '+joined.sequence.slice(0,240)+(joined.sequence.length>240?'\u2026':''));
       }catch(err){lines.push('Ligation not supported: '+err.message);}
     }else{
       lines.push('Two-fragment linear ligation preview requires exactly two cut fragments.');
     }
     out.textContent=lines.join('\n');
   }catch(err){out.textContent='Simulation unavailable: '+err.message;}
 });
 pane.append(heading,note,chooser,run,out);panelRoot.append(pane);
}
globalThis.PhotonCloningTools={render:renderCloningPreview};
renderCloningPreview();
