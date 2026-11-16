let depth=0;const root=document.getElementById('view');
const note=document.createElement('div');note.id='photonDropHint';note.textContent='Drop one DNA or Photon file to review its import';note.hidden=true;root.before(note);
const isFile=e=>Array.from(e.dataTransfer?.types??[]).includes('Files');
document.addEventListener('dragenter',e=>{if(isFile(e)){e.preventDefault();depth++;note.hidden=false;}});
document.addEventListener('dragover',e=>{if(isFile(e)){e.preventDefault();e.dataTransfer.dropEffect='copy';}});
document.addEventListener('dragleave',e=>{if(isFile(e)&&--depth<=0){depth=0;note.hidden=true;}});
document.addEventListener('drop',e=>{
 if(!isFile(e))return;e.preventDefault();depth=0;note.hidden=true;
 const files=Array.from(e.dataTransfer.files??[]);
 if(files.length!==1){globalThis.flash('Drop one file at a time. No projects were changed.');return;}
 if(files[0].size>32_000_000){globalThis.flash('File exceeds the 32 MB import limit. No projects were changed.');return;}
 if(globalThis.PhotonProjects.status.busy){globalThis.flash('Wait for the current save before importing.');return;}
 const input=document.getElementById('fileIn'),transfer=new DataTransfer();transfer.items.add(files[0]);input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
});
