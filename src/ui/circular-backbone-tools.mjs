/** Photon 3.0 — explicit circular-backbone selection from the current plasmid.
 * This operation modifies the working construct only on reviewed confirmation.
 * No chemistry, ligation efficiency or biological viability is inferred.
 */
import {circuitIntoCircularBackbone} from '../core/circular-backbone.mjs';

export function renderCircularBackboneApply(){
 const panel=document.getElementById('photonPartsV27');
 const host=globalThis.PhotonEditorBridgeHost;
 const api=globalThis.PhotonPartLibraryUI;
 if(!panel||!host||!api||document.getElementById('photonCircularBackboneV30'))return;
 const definitions=panel.querySelector('#photonPartsDefinitions');
 const root=panel.querySelector('input[aria-label="Root assembly ID"]');
 if(!definitions||!root)return;
 const container=document.createElement('section');container.id='photonCircularBackboneV30';
 container.style.cssText='border-top:1px solid var(--line);padding-top:15px;margin-top:17px';
 const title=document.createElement('h3');title.textContent='Circular plasmid backbone + circuit · Photon 3.0';
 const help=document.createElement('div');help.className='mini';
 help.textContent='Backbone source: current circular working plasmid. Choose how many backbone bases precede the insertion (0…length). Locations that would split an existing annotation are rejected. In-silico sequence insertion only — no ligation or cloning prediction.';
 const row=document.createElement('div');row.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0';
 const label=document.createElement('label');label.textContent='Insertion boundary (0-based interbase)';
 label.htmlFor='photonBackboneBoundary';
 const boundary=document.createElement('input');boundary.type='number';boundary.id='photonBackboneBoundary';
 boundary.min='0';boundary.step='1';boundary.value='0';boundary.style.maxWidth='110px';
 row.append(label,boundary);
 const review=document.createElement('button');review.type='button';review.className='btn sm';
 review.textContent='Review circular plasmid assembly';
 const details=document.createElement('div');details.id='photonBackboneReview';
 details.style.cssText='white-space:pre-wrap;margin:9px 0';
 const consent=document.createElement('label');consent.style.cssText='display:none;align-items:center;gap:8px;margin:10px 0';
 const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.id='photonBackboneConfirm';
 const consentText=document.createElement('span');
 consentText.textContent='I agree to insert this circuit into the current circular plasmid and update its annotations.';
 consent.append(checkbox,consentText);
 const apply=document.createElement('button');apply.type='button';apply.className='btn sm primary';
 apply.textContent='Apply reviewed circular assembly';
 apply.disabled=true;apply.style.display='none';
 const signature=w=>JSON.stringify([w.name,w.seq,w.topology,w.features]);
 let pending=null;
 function invalidate(message){
   pending=null;checkbox.checked=false;
   consent.style.display='none';apply.style.display='none';apply.disabled=true;
   if(message)details.textContent=message;
 }
 review.onclick=()=>{
   invalidate();
   try{
     const current=structuredClone(host.working());
     const library=api.parseEditor(definitions.value);
     const rootID=root.value.trim();
     const at=Number(boundary.value);
     if(boundary.value.trim()==='')throw new RangeError('Enter an insertion boundary');
     const candidate=circuitIntoCircularBackbone(library,rootID,current,{boundary:at});
     pending={
       identity:host.identity(),definitions:definitions.value,root:rootID,
       boundary:boundary.value,before:signature(current),replacement:candidate
     };
     details.textContent='Backbone: '+current.name+' · '+current.seq.length+' bp · '+
       current.features.length+' annotations · circular'+
       '\nCircuit: '+(candidate.seq.length-current.seq.length)+' bp · '+
       (candidate.features.length-current.features.length)+' new annotations'+
       '\nInsertion: after '+at+' backbone bases'+
       '\nResult: '+candidate.name+' · '+candidate.seq.length+' bp · '+
       candidate.features.length+' annotations · circular'+
       '\n\nOriginal backbone annotations and their metadata are preserved. New component annotations occupy the inserted sequence.'+
       '\nThis is an in-silico concatenation, NOT validated enzymatic cloning. No Git commit will be created.';
     consent.style.display='flex';apply.style.display='inline-flex';
   }catch(error){details.textContent='Review rejected: '+error.message;}
 };
 checkbox.onchange=()=>{apply.disabled=!(checkbox.checked&&pending);};
 for(const input of [definitions,root,boundary])
   input.addEventListener('input',()=>{if(pending)invalidate('Input changed. Review again before applying.');});
 apply.onclick=()=>{
   if(!pending||!checkbox.checked)return;
   const token=pending;
   if(token.identity!==host.identity()||token.definitions!==definitions.value||
     token.root!==root.value.trim()||token.boundary!==boundary.value||
     token.before!==signature(host.working())){
     invalidate('Working construct or assembly changed. Review again.');return;
   }
   try{
     if(!globalThis.PhotonEditorHistory?.replaceConstruct)
       throw new Error('Undoable editor integration is unavailable');
     const changed=globalThis.PhotonEditorHistory.replaceConstruct(token.replacement);
     invalidate();
     if(changed)host.message('Circular circuit assembled in working plasmid. Undo available; Commit separately.');
     else details.textContent='No changes to apply.';
   }catch(error){invalidate('Apply rejected: '+error.message);}
 };
 container.append(title,help,row,review,details,consent,apply);panel.append(container);
}
globalThis.PhotonCircularBackbone={render:renderCircularBackboneApply};
renderCircularBackboneApply();
