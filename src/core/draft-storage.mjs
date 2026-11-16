/** Independent, revision-checked text drafts; never writes active projects. */
export function createDraftStorage(factory=globalThis.indexedDB,name='photon-editor-drafts'){
 let opened;
 async function db(){return opened??=new Promise((resolve,reject)=>{if(!factory)return reject(Error('Draft recovery storage is unavailable'));const r=factory.open(name,1);r.onupgradeneeded=()=>r.result.createObjectStore('drafts',{keyPath:'key'});r.onsuccess=()=>{r.result.onversionchange=()=>r.result.close();resolve(r.result);};r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Close older Photon tabs to enable draft recovery'));});}
 async function transact(mode,action){const d=await db();return new Promise((resolve,reject)=>{let result,error;const tx=d.transaction('drafts',mode),store=tx.objectStore('drafts');tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(error||tx.error||Error('Draft transaction failed'));tx.onerror=()=>{};try{action(store,value=>result=value,e=>{error=e;tx.abort();});}catch(e){error=e;tx.abort();}});}
 return {
  read(key){return transact('readonly',(s,done,fail)=>{const r=s.get(key);r.onsuccess=()=>{try{const v=r.result;if(v&&(v.format!=='photon/text-draft/1'||v.key!==key||typeof v.text!=='string'||v.text.length>10_000_000||typeof v.base!=='string'||!/^[a-f0-9]{64}$/.test(v.base)||typeof v.identity!=='string'||typeof v.revision!=='string'||!v.revision))throw Error('Stored draft is invalid; it was left untouched');done(v??null);}catch(e){fail(e);}};});},
  write(value,expected=null){
   if(!value||typeof value.key!=='string'||typeof value.text!=='string'||value.text.length>10_000_000||typeof value.base!=='string'||!/^[a-f0-9]{64}$/.test(value.base)||typeof value.identity!=='string')return Promise.reject(Error('Invalid or oversized text draft'));
   return transact('readwrite',(s,done,fail)=>{const r=s.get(value.key);r.onsuccess=()=>{try{const old=r.result;if((old?.revision??null)!==expected)return fail(Error('Another tab saved this draft. Download your text before continuing.'));const record={...value,format:'photon/text-draft/1',revision:crypto.randomUUID(),savedAt:Date.now()};s.put(record);done(record);}catch(e){fail(e);}};});
  },
  remove(key,expected){return transact('readwrite',(s,done,fail)=>{const r=s.get(key);r.onsuccess=()=>{if((r.result?.revision??null)!==expected)return fail(Error('Draft changed in another tab; reopen the project to review it'));s.delete(key);done(null);};});}
 };
}
export async function draftFingerprint(context){
 const bytes=new TextEncoder().encode(JSON.stringify([context.identity,context.working]));
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
}
