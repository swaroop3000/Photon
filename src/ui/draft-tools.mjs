import {createDraftStorage,draftFingerprint} from '../core/draft-storage.mjs';
const store=createDraftStorage(),host=globalThis.PhotonMVPHost;
let context=null,record=null,base=null,timer,queue=Promise.resolve(),pending=0,problem='',epoch=0;
const revisions=new Map(),failedDrafts=new Map();
function notice(message){problem=message;renderNotice();renderFailures();}
function renderFailures(){
 let panel=document.getElementById('photonDraftFailure');if(!failedDrafts.size){panel?.remove();return;}
 if(!panel){panel=document.createElement('section');panel.id='photonDraftFailure';panel.className='draft-notice';panel.setAttribute('role','alert');document.querySelector('.topbar').after(panel);}
 panel.replaceChildren();const text=document.createElement('span');text.textContent='Text drafts could not be saved. Download recovery before closing this tab. ';panel.append(text);
 for(const [key,value] of failedDrafts){const b=document.createElement('button');b.className='btn sm';b.textContent='Download unsaved draft: '+value.name;b.onclick=()=>globalThis.download('photon-unsaved-draft.txt',value.text);panel.append(b);}
}
function renderNotice(){
 const editor=document.getElementById('se');if(!editor)return;
 let panel=document.getElementById('photonDraftNotice');if(!panel){panel=document.createElement('section');panel.id='photonDraftNotice';panel.className='draft-notice';panel.setAttribute('role','status');editor.before(panel);}
 panel.replaceChildren();const text=document.createElement('span');
 const currentText=editor.value;
 text.textContent=problem||pending?'':record?'Unapplied text draft saved locally.':'Text drafts are saved locally as you type.';
 if(pending)text.textContent='Saving text draft…';if(problem)text.textContent='Draft recovery needs attention: '+problem;
 panel.append(text);
 if(record&&record.text!==currentText){
  const compatible=record.base===base&&record.identity===context?.identity;
  text.textContent=compatible?'An unapplied text draft is available. Restore it to the editor, then review and Apply.':'A draft from another revision is available. Download it; it cannot safely replace this editor.';
  if(compatible){const restore=document.createElement('button');restore.className='btn sm';restore.textContent='Restore draft';restore.id='photonRestoreDraft';restore.onclick=()=>{editor.value=record.text;editor.dispatchEvent(new Event('input',{bubbles:true}));};panel.append(restore);}
 }
 if(record||problem){const download=document.createElement('button');download.className='btn sm';download.textContent='Download draft';download.onclick=()=>globalThis.download('photon-text-draft.txt',problem?editor.value:record?.text??editor.value);panel.append(download);}
 if(record){const discard=document.createElement('button');discard.className='btn sm';discard.textContent='Discard saved draft';discard.onclick=async()=>{try{await store.remove(context.key,record.revision);revisions.set(context.key,null);record=null;renderNotice();}catch(e){notice(e.message);}};panel.append(discard);}
}
function enqueue(action){pending++;renderNotice();const result=queue.then(action);queue=result.catch(e=>notice(e.message)).finally(()=>{pending--;renderNotice();});return queue;}
function capture(){const editor=document.getElementById('se');if(!editor||!context)return;const captured={context:structuredClone(context),text:editor.value};clearTimeout(timer);timer=null;return enqueue(async()=>{try{
 const fingerprint=await draftFingerprint(captured.context),key=captured.context.key;
 if(captured.text===captured.context.working.seq){return;}
 if(!revisions.has(key))revisions.set(key,(await store.read(key))?.revision??null);
 let saved;try{saved=await store.write({key,text:captured.text,base:fingerprint,identity:captured.context.identity},revisions.get(key));failedDrafts.delete(key);renderFailures();}catch(e){failedDrafts.set(key,{text:captured.text,name:captured.context.working.name});throw e;}revisions.set(key,saved.revision);
 if(context?.identity===captured.context.identity&&JSON.stringify(context.working)===JSON.stringify(captured.context.working)){record=saved;problem='';}
 }catch(error){failedDrafts.set(captured.context.key,{text:captured.text,name:captured.context.working.name});throw error;}
 });}
async function sync(){
 const editor=document.getElementById('se');if(!editor)return;const next=host.context(),nextSignature=JSON.stringify([next.identity,next.working]);
 if(context&&JSON.stringify([context.identity,context.working])===nextSignature){renderNotice();return;}
 const mine=++epoch;context=next;record=null;base=null;
 await queue;
 try{const [stored,fingerprint]=await Promise.all([store.read(next.key),draftFingerprint(next)]);if(mine!==epoch)return;
  base=fingerprint;record=stored;revisions.set(next.key,stored?.revision??null);
  // An applied draft is redundant, but never delete a stale or different draft.
  if(record&&record.text===next.working.seq){await store.remove(next.key,record.revision);if(mine!==epoch)return;record=null;revisions.set(next.key,null);}
  problem='';renderNotice();
 }catch(e){if(mine===epoch)notice(e.message);}
}
document.addEventListener('input',e=>{if(e.target.id==='se'){clearTimeout(timer);timer=setTimeout(capture,350);}});
// Flush before a click can rerender, navigate, commit or replace the editor.
document.addEventListener('click',()=>{if(timer){clearTimeout(timer);timer=null;capture();}},true);
window.addEventListener('pagehide',()=>{if(timer)capture();});
window.addEventListener('beforeunload',e=>{if(timer||pending||failedDrafts.size||problem&&document.getElementById('se')&&document.getElementById('se').value!==context?.working.seq){e.preventDefault();e.returnValue='';}});
new MutationObserver(()=>sync()).observe(document.getElementById('view'),{childList:true});
globalThis.PhotonDrafts={async flush(){if(timer){clearTimeout(timer);timer=null;capture();}await queue;if(problem||failedDrafts.size)throw Error(problem||'Download unsaved text drafts before switching projects');},sync};
await sync();
