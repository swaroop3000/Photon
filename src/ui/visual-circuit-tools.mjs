/** Photon 2.8 — visual direct-placement editor for existing reusable library.
 * All changes operate on library text only. The working DNA is untouched until
 * a future explicit commit workflow; automatic persistence is intentionally off.
 */
import {editCircuitPlacements} from '../core/circuit-editor.mjs';
import {resolveLibraryAssembly} from '../core/part-library.mjs';
import {serializeHierarchicalSbol3} from '../core/sbol3-hierarchy.mjs';

export function renderVisualCircuitEditor(){
 const panel=document.getElementById('photonPartsV27');
 const api=globalThis.PhotonPartLibraryUI;
 if(!panel||!api||document.getElementById('photonCircuitVisualV28'))return;
 const source=panel.querySelector('#photonPartsDefinitions');
 const root=panel.querySelector('input[aria-label="Root assembly ID"]');
 if(!source||!root)return;
 const container=document.createElement('section');
 container.id='photonCircuitVisualV28';
 container.style.cssText='border-top:1px solid var(--line);padding-top:14px;margin-top:15px';
 const title=document.createElement('h3');title.textContent='Visual circuit designer · Photon 2.8';
 const note=document.createElement('div');note.className='mini';
 note.textContent='Drag placements to reorder; use arrows for keyboard-friendly ordering. Reverse orientation, insert reusable parts, or remove placements. Changes update the library editor, but do not save or change your working construct until you choose Save part library.';
 const tools=document.createElement('div');
 tools.style.cssText='display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:10px 0';
 const picker=document.createElement('select');picker.id='photonCircuitPartPicker';
 picker.setAttribute('aria-label','Component to insert');
 const add=document.createElement('button');add.type='button';add.className='btn sm';add.textContent='Insert component';
 const refresh=document.createElement('button');refresh.type='button';refresh.className='btn sm';refresh.textContent='Refresh circuit';
 tools.append(picker,add,refresh);
 const track=document.createElement('div');track.id='photonCircuitTrack';
 track.style.cssText='display:flex;gap:8px;align-items:stretch;overflow-x:auto;margin:9px 0;padding:8px 0';
 const info=document.createElement('div');info.id='photonCircuitInfo';info.className='mini';
 info.style.whiteSpace='pre-wrap';
 const colors=['#0f8f79','#3b82f6','#a855f7','#f59e0b','#ec4899','#14b8a6'];
 let dragging=null;
 function load(){
   const library=api.parseEditor(source.value),id=root.value.trim();
   if(!Object.hasOwn(library.assemblies,id))
     throw new RangeError('Choose an assembly from the Root assembly field');
   return {library,id,assembly:library.assemblies[id]};
 }
 function apply(op){
   try{
     const {library,id}=load();
     const next=editCircuitPlacements(library,id,op);
     // Ensure RDF structure is representable before replacing the text.
     serializeHierarchicalSbol3(next,id);
     source.value=api.editorText(next);
     draw();
   }catch(error){info.textContent='Edit rejected: '+error.message;}
 }
 function button(label,onClick,tooltip){
   const b=document.createElement('button');b.type='button';b.className='btn sm';
   b.textContent=label;b.title=tooltip;b.setAttribute('aria-label',tooltip);
   b.onclick=onClick;return b;
 }
 function draw(){
   track.replaceChildren();picker.replaceChildren();
   try{
     const {library,id,assembly}=load();
     for(const key of [...Object.keys(library.parts),...Object.keys(library.assemblies)].sort()){
       if(key===id)continue;
       const option=document.createElement('option');option.value=key;
       option.textContent=key+(library.assemblies[key]?' (assembly)':' (part)');
       picker.append(option);
     }
     const resolved=resolveLibraryAssembly(library,id);
     let offset=1;
     for(const [index,placement] of assembly.placements.entries()){
       const length=library.parts[placement.ref]?.sequence.length??
         resolveLibraryAssembly(library,placement.ref).length;
       const card=document.createElement('div');
       card.draggable=true;card.dataset.index=String(index);
       card.style.cssText='min-width:145px;max-width:220px;flex:1 0 auto;border:1px solid var(--line);border-top:5px solid '+
         colors[index%colors.length]+';border-radius:7px;padding:8px;background:var(--panel)';
       const name=document.createElement('div');name.style.fontWeight='600';name.textContent=placement.ref;
       const meta=document.createElement('div');meta.className='mini';
       meta.textContent=offset+'..'+(offset+length-1)+' · '+length+' bp · '+(placement.strand===1?'forward →':'reverse ←');
       offset+=length;
       const controls=document.createElement('div');
       controls.style.cssText='display:flex;gap:4px;flex-wrap:wrap;margin-top:7px';
       controls.append(
         button('←',()=>apply({type:'move',index,to:index-1}),'Move '+placement.ref+' left'),
         button('→',()=>apply({type:'move',index,to:index+1}),'Move '+placement.ref+' right'),
         button('↔',()=>apply({type:'reverse',index}),'Reverse '+placement.ref),
         button('×',()=>apply({type:'remove',index}),'Remove '+placement.ref)
       );
       controls.children[0].disabled=index===0;
       controls.children[1].disabled=index===assembly.placements.length-1;
       card.append(name,meta,controls);
       card.ondragstart=event=>{
         dragging=index;
         event.dataTransfer?.setData('text/plain',String(index));
         if(event.dataTransfer)event.dataTransfer.effectAllowed='move';
       };
       card.ondragover=event=>{event.preventDefault();if(event.dataTransfer)event.dataTransfer.dropEffect='move';};
       card.ondrop=event=>{
         event.preventDefault();
         const from=dragging??Number(event.dataTransfer?.getData('text/plain'));
         dragging=null;
         if(Number.isSafeInteger(from)&&from!==index)apply({type:'move',index:from,to:index});
       };
       card.ondragend=()=>{dragging=null;};
       track.append(card);
     }
     info.textContent='Preview: '+resolved.length+' bp · '+resolved.parts.length+
       ' resolved leaf parts\nDNA: '+resolved.sequence.slice(0,180)+
       (resolved.sequence.length>180?'…':'')+
       '\nDrag a card onto another to reorder. Use Save part library above to persist edits.';
   }catch(error){info.textContent='Circuit unavailable: '+error.message;}
 }
 add.onclick=()=>{
   if(!picker.value){info.textContent='No reusable component available';return;}
   try{const {assembly}=load();apply({type:'insert',index:assembly.placements.length,
      placement:{ref:picker.value,strand:1}});}
   catch(error){info.textContent='Insert rejected: '+error.message;}
 };
 refresh.onclick=draw;
 root.addEventListener('change',draw);
 source.addEventListener('change',draw);
 container.append(title,note,tools,track,info);
 panel.append(container);
 draw();
}
globalThis.PhotonVisualCircuit={render:renderVisualCircuitEditor};
renderVisualCircuitEditor();
