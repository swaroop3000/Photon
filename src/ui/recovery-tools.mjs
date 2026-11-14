/** Local archive and persistent failed-attempt recovery; no active backend switch. */
import {createRecoveryVault} from '../core/recovery-vault.mjs';
import {captureProjectStorage,createBrowserArchive,parseBrowserArchive} from '../core/project-archive.mjs';
const host=globalThis.PhotonRecoveryHost;
const vault=createRecoveryVault();
const sessionId=globalThis.crypto?.randomUUID?.()??Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
let lastCapture;
const button=document.createElement('button');
button.id='photonRecoveryCenter';button.className='btn sm';button.textContent='Recovery';
button.title='Save local archives and download saved recovery copies';
document.getElementById('photonBackup').before(button);

function persistenceNote(text){
 const banner=document.getElementById('photonStorageNotice');
 if(!banner)return;
 let note=document.getElementById('photonRecoveryPersistence');
 if(!note){note=document.createElement('div');note.id='photonRecoveryPersistence';note.className='mini';banner.append(note);}
 note.textContent=text;
}
async function refreshNotice(){
 const copies=await vault.list('recovery');
 let notice=document.getElementById('photonPersistentRecoveryNotice');
 if(!copies.length){notice?.remove();return;}
 if(!notice){
  notice=document.createElement('section');notice.id='photonPersistentRecoveryNotice';notice.className='card';
  notice.style.cssText='margin:10px;padding:10px';notice.setAttribute('role','status');
  document.querySelector('.topbar').after(notice);
 }
 notice.replaceChildren();
 const text=document.createElement('span');text.textContent=copies.length+' saved recovery copy/copies are available on this device. ';
 const open=document.createElement('button');open.className='btn sm';open.textContent='Review recovery';open.onclick=()=>button.click();
 notice.append(text,open);
}
globalThis.PhotonRecovery={
 isPersisted(status){return !!lastCapture?.complete&&lastCapture.raw===status?.recoveryRaw&&lastCapture.kind===status?.recoveryKind;},
 async capture(status){
  if(!status?.issue||typeof status.recoveryRaw!=='string')return false;
  const raw=status.recoveryRaw,kind=status.recoveryKind;
  lastCapture={raw,kind,complete:false};
  persistenceNote('Saving a recovery copy on this device… Keep this tab open until it finishes.');
  try{
   const body={format:'photon/failed-project-save/1',sessionId,kind,raw};
   await vault.put('recovery',body,{label:kind==='original'?'Original stored data':'Unsaved project attempt'});
   if(lastCapture.raw===raw&&lastCapture.kind===kind){
    lastCapture.complete=true;
    persistenceNote('Recovery copy saved on this device. Open Recovery after reopening Photon.');
   }
   await refreshNotice();return true;
  }catch(error){
   if(lastCapture.raw===raw)persistenceNote('Local recovery could not be saved: '+error.message+'. Download recovery before closing.');
   return false;
  }
 }
};
function action(label,handler){const node=document.createElement('button');node.className='btn sm';node.textContent=label;node.onclick=handler;return node;}
button.onclick=async()=>{
 globalThis.modal('<h2 class="ph">Local recovery</h2><div class="sub">Saved copies remain on this browser and device. Export a file for a separate backup. Creating an archive leaves your current projects unchanged.</div><button class="btn sm" id="photonCreateArchive">Create local archive</button><div id="photonVaultStatus" role="status" class="mini" style="margin:10px 0"></div><div id="photonVaultList"></div><button class="btn" onclick="closeModal()">Close</button>');
 const status=document.getElementById('photonVaultStatus'),list=document.getElementById('photonVaultList');
 const archiveButton=document.getElementById('photonCreateArchive');
 async function populate(){
  const records=await vault.list();list.replaceChildren();
  for(const entry of records){
   const row=document.createElement('div');row.className='li';row.dataset.vaultId=entry.id;
   const label=document.createElement('div');label.textContent=entry.label+' · '+new Date(entry.createdAt).toLocaleString();
   const download=action('Download',async()=>{
    try{
     const value=await vault.read(entry.id);
     if(entry.category==='archive'){
      await parseBrowserArchive(JSON.stringify(value));
      host.download('photon-browser-archive.json',JSON.stringify(value,null,2));
     }else if(value.format==='photon/failed-project-save/1'&&typeof value.raw==='string'){
      host.download(value.kind==='original'?'photon-original-storage.json':'photon-unsaved-recovery.json',
       value.kind==='original'?value.raw:'{"format":"photon/local-project-backup/1","data":'+value.raw+'}');
     }else throw new Error('Unsupported saved recovery format');
    }catch(error){status.textContent='Recovery download rejected: '+error.message;}
   });
   const remove=action('Delete copy',async()=>{
    if(!confirm('Delete this saved recovery copy? Download it first if needed. Current projects will not be changed.'))return;
    try{await vault.remove(entry.id);await populate();await refreshNotice();status.textContent='Saved copy deleted.';}
    catch(error){status.textContent='Delete rejected: '+error.message;}
   });
   row.append(label,download,remove);list.append(row);
  }
  if(!records.length)list.textContent='No saved recovery copies.';
 }
 archiveButton.onclick=async()=>{
  archiveButton.disabled=true;status.textContent='Creating and verifying a local archive…';
  try{
   const entries=captureProjectStorage(localStorage),archive=await createBrowserArchive(entries);
   // Detect changes observed while hashing. This is a copy, not a cross-store move.
   if(JSON.stringify(captureProjectStorage(localStorage))!==JSON.stringify(entries))
    throw new Error('Browser projects changed while archiving; retry');
   const metadata=await vault.put('archive',archive,{label:'Project archive ('+entries.length+' storage entries)'});
   const verified=await parseBrowserArchive(JSON.stringify(await vault.read(metadata.id)));
   if(verified.sha256!==archive.sha256)throw new Error('Archive read-back mismatch');
   status.textContent='Local archive saved and verified, including '+(entries.length-1)+' part/backbone library entries. Current projects are unchanged.';
   await populate();
  }catch(error){status.textContent='Archive rejected: '+error.message;}
  finally{archiveButton.disabled=false;}
 };
 try{await populate();}catch(error){status.textContent='Local recovery unavailable: '+error.message;}
};
try{
 await refreshNotice();
 if(host.status()?.issue)await globalThis.PhotonRecovery.capture(host.status());
}catch(error){button.title='Local recovery unavailable: '+error.message;}
