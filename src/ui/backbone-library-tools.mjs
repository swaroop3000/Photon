/** Photon 3.1 — opt-in, browser-local reusable circular backbones.
 * Supports current working plasmid, saved validated snapshots and GenBank input.
 * Never overwrites the working DNA until the reviewed apply action.
 */
import {createBackboneLibrary,addBackbone,getBackbone,validateBackbone,
 serializeBackboneLibrary,parseBackboneLibrary} from '../core/backbone-library.mjs';
import {parseGenbank} from '../core/feature-io.mjs';
const PREFIX='photon.backbones.3.1:';
export function renderBackboneLibrary(){
 const panel=document.getElementById('photonCircularBackboneV30');
 const host=globalThis.PhotonEditorBridgeHost;
 if(!panel||!host||document.getElementById('photonBackboneLibraryV31'))return;
 const area=document.createElement('section');area.id='photonBackboneLibraryV31';
 area.style.cssText='margin:8px 0;padding:10px;border:1px solid var(--line);border-radius:7px';
 const headline=document.createElement('h4');headline.textContent='Backbone library · Photon 3.1';
 const hint=document.createElement('div');hint.className='mini';
 hint.textContent='Choose the current circular plasmid or a saved backbone snapshot. Stored locally for this repository and branch. Import supports the defined GenBank subset only; existing working DNA is not changed.';
 const selector=document.createElement('select');selector.id='photonBackboneSource';
 selector.setAttribute('aria-label','Backbone source');
 const idInput=document.createElement('input');idInput.id='photonBackboneSaveId';
 idInput.placeholder='Backbone ID (e.g. pBase)';idInput.setAttribute('aria-label','Backbone ID to save');
 idInput.style.maxWidth='180px';
 const buttons=document.createElement('div');buttons.style.cssText='display:flex;gap:7px;flex-wrap:wrap;margin-top:8px';
 function button(text){const b=document.createElement('button');b.type='button';b.className='btn sm';b.textContent=text;return b;}
 const save=button('Save current backbone'),remove=button('Remove selected backbone');
 const exportJson=button('Export backbones JSON');
 const importGb=document.createElement('label');importGb.className='btn sm';importGb.textContent='Import GenBank backbone';
 const gbInput=document.createElement('input');gbInput.type='file';gbInput.accept='.gb,.gbk,.txt';
 gbInput.style.display='none';importGb.append(gbInput);
 const importJson=document.createElement('label');importJson.className='btn sm';importJson.textContent='Import backbones JSON';
 const jsonInput=document.createElement('input');jsonInput.type='file';jsonInput.accept='.json';
 jsonInput.style.display='none';importJson.append(jsonInput);
 buttons.append(save,remove,importGb,importJson,exportJson);
 const status=document.createElement('div');status.id='photonBackboneLibraryStatus';status.className='mini';
 status.style.marginTop='8px';
 const storageKey=()=>PREFIX+host.identity();
 function read(){
   const raw=localStorage.getItem(storageKey());
   return raw?parseBackboneLibrary(raw):createBackboneLibrary();
 }
 function commit(library){
   // Verify before touching persistent storage.
   const canonical=serializeBackboneLibrary(library);
   localStorage.setItem(storageKey(),canonical);
 }
 function populate(preferred){
   const selected=preferred??selector.value;
   const library=read();
   selector.replaceChildren();
   const current=document.createElement('option');current.value='current';current.textContent='Current working plasmid';
   selector.append(current);
   for(const id of Object.keys(library.entries).sort()){
     const opt=document.createElement('option');opt.value=id;
     opt.textContent=id+' · '+library.entries[id].seq.length+' bp';
     selector.append(opt);
   }
   selector.value=[...selector.options].some(x=>x.value===selected)?selected:'current';
   remove.disabled=selector.value==='current';
   selector.dispatchEvent(new Event('change',{bubbles:true}));
 }
 function download(text,name){
   const link=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
   link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 save.onclick=()=>{
   try{
     const id=idInput.value.trim();
     const lib=addBackbone(read(),id,host.working());
     commit(lib);populate(id);status.textContent='Saved circular backbone '+id+' locally.';
   }catch(e){status.textContent='Save rejected: '+e.message;}
 };
 remove.onclick=()=>{
   if(selector.value==='current')return;
   try{
     const id=selector.value,lib=read();
     delete lib.entries[id];commit(lib);populate('current');
     status.textContent='Removed saved backbone '+id+'.';
   }catch(e){status.textContent='Remove rejected: '+e.message;}
 };
 exportJson.onclick=()=>{
   try{download(serializeBackboneLibrary(read()),'photon-backbones.json');}
   catch(e){status.textContent='Export rejected: '+e.message;}
 };
 gbInput.onchange=async()=>{
   const file=gbInput.files?.[0];if(!file)return;
   try{
     const backbone=parseGenbank(await file.text());
     const id=idInput.value.trim();
     const next=addBackbone(read(),id,backbone);
     commit(next);populate(id);status.textContent='Imported GenBank backbone '+id+'.';
   }catch(e){status.textContent='GenBank import rejected: '+e.message;}
   gbInput.value='';
 };
 jsonInput.onchange=async()=>{
   const file=jsonInput.files?.[0];if(!file)return;
   try{
     const imported=parseBackboneLibrary(await file.text()),current=read();
     for(const [id,backbone] of Object.entries(imported.entries)){
       if(Object.hasOwn(current.entries,id))throw new RangeError('Existing backbone ID: '+id);
       current.entries[id]=backbone;
     }
     commit(current);populate();status.textContent='Imported '+Object.keys(imported.entries).length+' saved backbone(s).';
   }catch(e){status.textContent='JSON import rejected: '+e.message;}
   jsonInput.value='';
 };
 selector.onchange=()=>{remove.disabled=selector.value==='current';};
 area.append(headline,hint,selector,idInput,buttons,status);
 // Keep the original insertion-position form and its confirmation controls intact.
 panel.insertBefore(area,panel.querySelector('#photonBackboneReview')?.previousSibling??panel.firstChild);
 globalThis.PhotonBackboneLibrary={
   getSelected:()=>selector.value==='current'?validateBackbone(host.working()):getBackbone(read(),selector.value),
   selectionSignature:()=>JSON.stringify([selector.value,read().entries]),
   selectedId:()=>selector.value,
   refresh:()=>populate(selector.value)
 };
 populate('current');
}
globalThis.PhotonBackboneLibraryUI={render:renderBackboneLibrary};
renderBackboneLibrary();
