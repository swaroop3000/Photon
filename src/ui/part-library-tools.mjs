/** Photon 2.7 — editable reusable DNA library and nested design Builder.
 * Library is scoped by the active Photon repository/branch and saved locally.
 * Builder never mutates the current construct. No chemical assembly model.
 */
import {createPartLibrary,addLibraryPart,addLibraryAssembly,
 resolveLibraryAssembly,serializePartLibrary,parsePartLibrary} from '../core/part-library.mjs';
import {serializeHierarchicalSbol3} from '../core/sbol3-hierarchy.mjs';
const KEY='photon.parts.2.7:';
const demo='part promoter ATGCCGTAA\npart reporter AAGTCCGTA\npart terminator TTAACG\nassembly cassette promoter+ reporter-\nassembly circuit cassette+ terminator+ cassette-';
function parseEditor(value){
 let library=createPartLibrary();
 const rows=value.split(/\r?\n/).map(l=>l.trim()).filter(l=>l&&!l.startsWith('#'));
 for(const [i,line] of rows.entries()){
   const p=line.split(/\s+/);
   if(p[0]==='part'&&p.length===3)
     library=addLibraryPart(library,{id:p[1],sequence:p[2]});
   else if(p[0]==='assembly'&&p.length>=3){
     const placements=p.slice(2).map(ref=>{
       if(!/[+-]$/.test(ref))throw new RangeError('Placement must end with + or -');
       return {ref:ref.slice(0,-1),strand:ref.endsWith('-')?-1:1};
     });
     library=addLibraryAssembly(library,{id:p[1],placements});
   }else throw new RangeError('Invalid library definition at line '+(i+1));
 }
 // Resolve every assembly, not only the selected root, before storing.
 for(const id of Object.keys(library.assemblies))resolveLibraryAssembly(library,id);
 return library;
}
function editorText(library){
 const lines=[];
 for(const p of Object.values(library.parts))lines.push('part '+p.id+' '+p.sequence);
 for(const a of Object.values(library.assemblies))
   lines.push('assembly '+a.id+' '+a.placements.map(p=>p.ref+(p.strand===-1?'-':'+')).join(' '));
 return lines.join('\n');
}
function downloadText(content,filename,type){
 const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download=filename;link.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function renderPartLibrary(){
 const root=document.getElementById('tb'),host=globalThis.PhotonEditorBridgeHost;
 if(!root||!host||!document.querySelector('.tab.active[data-tool="builder"]')||
    document.getElementById('photonPartsV27'))return;
 const panel=document.createElement('section');panel.id='photonPartsV27';
 panel.style.cssText='border-top:1px solid var(--line);margin-top:20px;padding-top:15px';
 const heading=document.createElement('h3');heading.textContent='Reusable part library · Photon 2.7';
 const note=document.createElement('div');note.className='mini';
 note.textContent='Define reusable DNA parts and assemblies. A trailing + or - sets each placement orientation. Reuse or nest assemblies freely; cyclic references are rejected. Preview only, no changes to your working DNA.';
 const field=document.createElement('textarea');field.id='photonPartsDefinitions';field.rows=7;
 field.setAttribute('aria-label','Reusable part library definitions');
 const key=KEY+host.identity();
 let saved=demo;
 try{saved=localStorage.getItem(key)??demo;}catch{}
 field.value=saved;
 field.style.marginTop='10px';
 const rootRow=document.createElement('div');rootRow.style.cssText='display:flex;align-items:center;gap:9px;margin:9px 0;flex-wrap:wrap';
 const rootLabel=document.createElement('label');rootLabel.textContent='Root assembly';
 const selected=document.createElement('input');selected.value='circuit';
 selected.setAttribute('aria-label','Root assembly ID');selected.style.maxWidth='180px';
 rootRow.append(rootLabel,selected);
 const buttons=document.createElement('div');buttons.style.cssText='display:flex;gap:7px;flex-wrap:wrap;margin:8px 0';
 const preview=document.createElement('button');preview.type='button';preview.className='btn sm primary';preview.textContent='Preview hierarchy';
 const save=document.createElement('button');save.type='button';save.className='btn sm';save.textContent='Save part library';
 const exportJSON=document.createElement('button');exportJSON.type='button';exportJSON.className='btn sm';exportJSON.textContent='Export library JSON';
 const exportRDF=document.createElement('button');exportRDF.type='button';exportRDF.className='btn sm';exportRDF.textContent='Export hierarchy SBOL 3';
 exportRDF.hidden=true;
 const importLabel=document.createElement('label');importLabel.className='btn sm';importLabel.textContent='Import library JSON';
 const importFile=document.createElement('input');importFile.type='file';importFile.accept='.json,application/json';
 importFile.style.display='none';importLabel.append(importFile);
 buttons.append(preview,save,exportJSON,exportRDF,importLabel);
 const result=document.createElement('div');result.id='photonPartsPreview';result.style.marginTop='10px';
 let latest=null;
 function getLibrary(){return parseEditor(field.value);}
 function renderPreview(){
   result.replaceChildren();exportRDF.hidden=true;latest=null;
   try{
     const library=getLibrary(),name=selected.value.trim();
     if(!Object.hasOwn(library.assemblies,name))throw new RangeError('Select an assembly definition, not a leaf part');
     const design=resolveLibraryAssembly(library,name);
     const rdf=serializeHierarchicalSbol3(library,name);
     latest={library,design,rdf};
     const title=document.createElement('div');title.style.fontWeight='600';
     title.textContent=design.name+' · '+design.length+' bp · '+design.parts.length+' placed parts';
     const track=document.createElement('div');
     track.style.cssText='display:flex;width:100%;height:25px;overflow:hidden;border-radius:5px;margin:10px 0;background:var(--bd)';
     for(const [i,part] of design.parts.entries()){
       const block=document.createElement('div');
       block.style.cssText='flex:'+part.sequence.length+' 1 0;min-width:0;background:'+
         (i%4===0?'#0f8f79':i%4===1?'#3b82f6':i%4===2?'#a855f7':'#f59e0b')+';border-right:1px solid white';
       block.title=part.path.join(' / ')+' '+part.start+'..'+part.end;
       track.append(block);
     }
     const list=document.createElement('div');list.className='mini';
     list.style.whiteSpace='pre-wrap';
     list.textContent=design.parts.map(p=>p.start+'..'+p.end+'  '+p.path.join(' / ')+
       (p.strand===-1?'  (reverse)':'')).join('\n')+
       '\n\nSequence: '+design.sequence.slice(0,500)+(design.sequence.length>500?'…':'');
     result.append(title,track,list);exportRDF.hidden=false;
   }catch(error){result.textContent='Library rejected: '+error.message;}
 }
 preview.onclick=renderPreview;
 save.onclick=()=>{
   try{
     const lib=getLibrary();localStorage.setItem(key,editorText(lib));
     result.textContent='Part library saved locally for this repository and branch.';
     exportRDF.hidden=true;latest=null;
   }catch(error){result.textContent='Save rejected: '+error.message;}
 };
 exportJSON.onclick=()=>{
   try{downloadText(serializePartLibrary(getLibrary()),'photon-parts.json','application/json');}
   catch(e){result.textContent='Export rejected: '+e.message;}
 };
 exportRDF.onclick=()=>{
   if(!latest)return;
   downloadText(latest.rdf,latest.design.id+'.hierarchy.sbol3.nt','application/n-triples');
 };
 importFile.onchange=async()=>{
   const file=importFile.files?.[0];if(!file)return;
   try{
     const library=parsePartLibrary(await file.text());
     field.value=editorText(library);
     const roots=Object.keys(library.assemblies);
     selected.value=roots.at(-1)??'';
     result.textContent='Library JSON loaded into editor. Review and save to persist it.';
     latest=null;exportRDF.hidden=true;
   }catch(error){result.textContent='Import rejected: '+error.message;}
   importFile.value='';
 };
 panel.append(heading,note,field,rootRow,buttons,result);root.append(panel);
}
globalThis.PhotonPartLibraryUI={render:renderPartLibrary,parseEditor,editorText};
renderPartLibrary();
