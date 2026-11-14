/** Photon 2.9 — explicit circuit-to-plasmid review and replacement.
 * Does not auto-commit; the existing editor's undo/redo remains authoritative.
 */
import {circuitToConstruct} from '../core/circuit-construct.mjs';
export function renderCircuitApply(){
 const panel=document.getElementById('photonPartsV27');
 const host=globalThis.PhotonEditorBridgeHost;
 const api=globalThis.PhotonPartLibraryUI;
 if(!panel||!host||!api||document.getElementById('photonCircuitApplyV29'))return;
 const definitions=panel.querySelector('#photonPartsDefinitions');
 const root=panel.querySelector('input[aria-label="Root assembly ID"]');
 if(!definitions||!root)return;
 const wrapper=document.createElement('section');wrapper.id='photonCircuitApplyV29';
 wrapper.style.cssText='border-top:1px solid var(--line);margin-top:16px;padding-top:14px';
 const heading=document.createElement('h3');heading.textContent='Apply circuit to plasmid · Photon 2.9';
 const desc=document.createElement('div');desc.className='mini';
 desc.textContent='Review and explicitly replace the current working construct with the resolved linear circuit. This changes working DNA and features, but does NOT create a Git commit. Undo/redo is available through the sequence editor.';
 const review=document.createElement('button');review.className='btn sm';review.type='button';
 review.textContent='Review plasmid replacement';
 const details=document.createElement('div');details.id='photonCircuitApplyReview';details.style.cssText='margin-top:10px;white-space:pre-wrap';
 const acknowledge=document.createElement('label');acknowledge.style.cssText='display:flex;gap:8px;align-items:center;margin:10px 0';
 const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.id='photonCircuitApplyConfirm';
 const agree=document.createElement('span');agree.textContent='I understand this will replace the working plasmid sequence and annotations.';
 acknowledge.append(checkbox,agree);acknowledge.hidden=true;
 const apply=document.createElement('button');apply.className='btn sm primary';apply.type='button';
 apply.textContent='Apply reviewed circuit';apply.disabled=true;apply.hidden=true;
 let pending=null;
 const signature=w=>JSON.stringify([w.name,w.seq,w.topology,w.features]);
 function invalidate(){
   pending=null;checkbox.checked=false;acknowledge.hidden=true;
   apply.hidden=true;apply.disabled=true;
 }
 review.onclick=()=>{
   invalidate();
   try{
     const library=api.parseEditor(definitions.value);
     const rootID=root.value.trim(),current=structuredClone(host.working());
     const replacement=circuitToConstruct(library,rootID,current);
     pending={
       definitions:definitions.value,root:rootID,identity:host.identity(),
       before:signature(current),replacement
     };
     details.textContent='Current: '+current.name+' · '+current.seq.length+' bp · '+
       current.features.length+' annotations · '+current.topology+
       '\nReplacement: '+replacement.name+' · '+replacement.seq.length+' bp · '+
       replacement.features.length+' annotations · linear'+
       '\n\nAnnotations are regenerated from each resolved leaf part with 1-based coordinates and strand orientation.'+
       '\nExisting annotations will be replaced. No Git commit is created.';
     acknowledge.hidden=false;apply.hidden=false;
   }catch(error){details.textContent='Review rejected: '+error.message;}
 };
 checkbox.onchange=()=>{apply.disabled=!checkbox.checked||!pending;};
 definitions.addEventListener('input',()=>{if(pending){invalidate();details.textContent='Circuit changed. Review again before applying.';}});
 root.addEventListener('input',()=>{if(pending){invalidate();details.textContent='Root changed. Review again before applying.';}});
 apply.onclick=()=>{
   if(!pending||!checkbox.checked)return;
   const token=pending;
   if(token.definitions!==definitions.value||token.root!==root.value.trim()||
     token.identity!==host.identity()||token.before!==signature(host.working())){
     invalidate();details.textContent='Working plasmid or circuit changed. Review again.';return;
   }
   try{
     if(!globalThis.PhotonEditorHistory?.replaceConstruct)
       throw new Error('Undoable editor integration is not loaded');
     const applied=globalThis.PhotonEditorHistory.replaceConstruct(token.replacement);
     invalidate();
     if(!applied){details.textContent='Circuit already matches current construct.';return;}
     // Host.render replaces DOM, so feedback goes through the editor host.
     host.message('Circuit applied. Use Undo to restore previous plasmid; Commit separately to version this change.');
   }catch(error){invalidate();details.textContent='Apply rejected: '+error.message;}
 };
 wrapper.append(heading,desc,review,details,acknowledge,apply);
 panel.append(wrapper);
}
globalThis.PhotonCircuitApply={render:renderCircuitApply};
renderCircuitApply();
