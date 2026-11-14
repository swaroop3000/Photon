import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium} from 'playwright';
import {parseBrowserArchive} from '../src/core/project-archive.mjs';
const URL='http://127.0.0.1:8765/';
async function visit(page){await page.goto(URL,{waitUntil:'networkidle'});await page.evaluate(()=>window.closeModal?.());}
async function downloaded(page,click){const pending=page.waitForEvent('download');await click();return readFile(await (await pending).path(),'utf8');}

test('archive preserves project and auxiliary library bytes across a browser restart',async()=>{
 const profile=await mkdtemp(join(tmpdir(),'photon-vault-'));let context;
 try{
  context=await chromium.launchPersistentContext(profile,{headless:true,acceptDownloads:true});
  const page=context.pages()[0];await visit(page);
  const before=await page.evaluate(()=>{
   localStorage.setItem('photon.parts.2.7:'+PhotonEditorBridgeHost.identity(),'part alpha ACGT\nassembly construct alpha+');
   localStorage.setItem('photon.backbones.3.1:'+PhotonEditorBridgeHost.identity(),'{"format":"photon/backbones/1","entries":{}}');
   localStorage.setItem('another-app-key','do not copy');
   return Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)]));
  });
  await page.locator('#photonRecoveryCenter').click();await page.locator('#photonCreateArchive').click();
  await page.waitForFunction(()=>document.getElementById('photonVaultStatus').textContent.includes('saved and verified'));
  const first=await downloaded(page,()=>page.locator('[data-vault-id^="archive:"]').getByRole('button',{name:'Download',exact:true}).click());
  const archive=await parseBrowserArchive(first);assert.equal(archive.entries.length,3);
  for(const entry of archive.entries)assert.equal(entry.raw,before[entry.key]);
  assert.equal(archive.entries.some(e=>e.key==='another-app-key'),false);
  assert.deepEqual(await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)]))),before);
  await context.close();context=null;
  context=await chromium.launchPersistentContext(profile,{headless:true,acceptDownloads:true});
  const reopened=context.pages()[0];await visit(reopened);await reopened.locator('#photonRecoveryCenter').click();
  const second=await downloaded(reopened,()=>reopened.locator('[data-vault-id^="archive:"]').getByRole('button',{name:'Download',exact:true}).click());
  assert.deepEqual(await parseBrowserArchive(second),archive);
 }finally{await context?.close();await rm(profile,{recursive:true,force:true});}
});

test('failed edit recovery survives restart and is never silently applied',async()=>{
 const profile=await mkdtemp(join(tmpdir(),'photon-recovery-'));let context;
 try{
  context=await chromium.launchPersistentContext(profile,{headless:true,acceptDownloads:true});
  const page=context.pages()[0];await visit(page);const original=await page.locator('#se').inputValue();
  await page.evaluate(()=>{
   const set=Storage.prototype.setItem;
   Storage.prototype.setItem=function(key,value){if(key==='locusPro_v1')throw new DOMException('recovery test quota','QuotaExceededError');return set.call(this,key,value);};
  });
  await page.locator('#se').fill(original+'A');await page.locator('#ap').click();
  await page.waitForFunction(()=>document.getElementById('photonRecoveryPersistence')?.textContent.includes('Recovery copy saved'));
  assert.equal(await page.locator('#se').inputValue(),original);
  await context.close();context=null;
  context=await chromium.launchPersistentContext(profile,{headless:true,acceptDownloads:true});
  const reopened=context.pages()[0];await visit(reopened);
  assert.equal(await reopened.locator('#se').inputValue(),original);
  assert.match(await reopened.locator('#photonPersistentRecoveryNotice').innerText(),/saved recovery/);
  await reopened.locator('#photonRecoveryCenter').click();
  const text=await downloaded(reopened,()=>reopened.locator('[data-vault-id^="recovery:"]').getByRole('button',{name:'Download',exact:true}).click());
  const backup=JSON.parse(text);assert.equal(backup.data.repos[backup.data.cur].working.seq,original+'A');
  await reopened.evaluate(()=>closeModal());reopened.once('dialog',d=>d.accept());
  await reopened.locator('#photonRestoreInput').setInputFiles({name:'recovered.json',mimeType:'application/json',buffer:Buffer.from(text)});
  await reopened.waitForFunction(expected=>W().seq===expected,original+'A');
 }finally{await context?.close();await rm(profile,{recursive:true,force:true});}
});

test('aborting after a payload write rolls back both payload and catalog',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();await visit(page);
  const result=await page.evaluate(async()=>{
   const {createRecoveryVault}=await import('/src/core/recovery-vault.mjs');
   const name='photon-aborted-vault',vault=createRecoveryVault({name});
   await vault.list();
   const put=IDBObjectStore.prototype.put;
   IDBObjectStore.prototype.put=function(...args){
    const request=put.apply(this,args);
    if(this.name==='payloads'&&this.transaction.db.name===name){const tx=this.transaction;request.addEventListener('success',()=>tx.abort(),{once:true});}
    return request;
   };
   let rejected=false;
   try{await vault.put('recovery',{synthetic:'must roll back'});}catch{rejected=true;}
   finally{IDBObjectStore.prototype.put=put;}
   const records=await vault.list();
   const db=await new Promise((resolve,reject)=>{const r=indexedDB.open(name);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
   const count=await new Promise((resolve,reject)=>{const tx=db.transaction('payloads');const r=tx.objectStore('payloads').count();tx.oncomplete=()=>resolve(r.result);tx.onabort=()=>reject(tx.error);});
   db.close();vault.close();return {rejected,records,count};
  });
  assert.deepEqual(result,{rejected:true,records:[],count:0});
 }finally{await browser.close();}
});

test('concurrent archive writes respect capacity without deleting prior records',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();await visit(page);
  const result=await page.evaluate(async()=>{
   const {createRecoveryVault}=await import('/src/core/recovery-vault.mjs');
   const vault=createRecoveryVault({name:'photon-capacity-vault'});
   const writes=await Promise.allSettled(Array.from({length:8},(_,n)=>vault.put('archive',{n})));
   const records=await vault.list('archive');const values=await Promise.all(records.map(r=>vault.read(r.id)));
   const first=records[0];await vault.put('archive',await vault.read(first.id));
   const unchanged=(await vault.list()).length;
   await vault.remove(first.id);const afterDelete=(await vault.list()).length;vault.close();
   return {succeeded:writes.filter(r=>r.status==='fulfilled').length,
    rejected:writes.filter(r=>r.status==='rejected').length,values,unchanged,afterDelete};
  });
  assert.equal(result.succeeded,5);assert.equal(result.rejected,3);
  assert.equal(new Set(result.values.map(v=>v.n)).size,5);
  assert.equal(result.unchanged,5);assert.equal(result.afterDelete,4);
 }finally{await browser.close();}
});

test('future vault schemas and corrupt payloads are rejected without resetting data',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();await visit(page);
  const result=await page.evaluate(async()=>{
   const {createRecoveryVault}=await import('/src/core/recovery-vault.mjs');
   const name='photon-future-vault',vault=createRecoveryVault({name});const meta=await vault.put('recovery',{preserve:'reference'});
   const db=await new Promise((resolve,reject)=>{const r=indexedDB.open(name,2);r.onupgradeneeded=()=>r.result.createObjectStore('future');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
   let futureRejected=false;try{await vault.list();}catch{futureRejected=true;}
   const original=await new Promise((resolve,reject)=>{const tx=db.transaction('payloads');const r=tx.objectStore('payloads').get(meta.id);tx.oncomplete=()=>resolve(r.result.text);tx.onabort=()=>reject(tx.error);});
   db.close();
   const current=createRecoveryVault({name:'photon-corrupt-vault'});const item=await current.put('recovery',{safe:true});
   const currentDb=await new Promise(resolve=>{const r=indexedDB.open('photon-corrupt-vault');r.onsuccess=()=>resolve(r.result);});
   await new Promise((resolve,reject)=>{const tx=currentDb.transaction('payloads','readwrite');tx.objectStore('payloads').put({id:item.id,text:'{"tampered":true}'});tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});
   let checksumRejected=false;try{await current.read(item.id);}catch(error){checksumRejected=error.message.includes('checksum');}
   const count=(await current.list()).length;currentDb.close();current.close();vault.close();
   return {futureRejected,original,checksumRejected,count};
  });
  assert.equal(result.futureRejected,true);assert.deepEqual(JSON.parse(result.original),{preserve:'reference'});
  assert.equal(result.checksumRejected,true);assert.equal(result.count,1);
 }finally{await browser.close();}
});

test('unavailable IndexedDB preserves primary save behavior and in-memory recovery',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({acceptDownloads:true});
  await page.addInitScript(()=>{IDBFactory.prototype.open=function(){throw new DOMException('vault denied','SecurityError');};});
  await visit(page);const original=await page.locator('#se').inputValue();
  await page.locator('#se').fill(original+'A');await page.locator('#ap').click();
  assert.equal(await page.locator('#se').inputValue(),original+'A');
  await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('primary quota','QuotaExceededError');};});
  await page.locator('#se').fill(original+'AC');await page.locator('#ap').click();
  await page.waitForFunction(()=>document.getElementById('photonRecoveryPersistence')?.textContent.includes('could not be saved'));
  const text=await downloaded(page,()=>page.locator('#photonStorageRecovery').click());
  const payload=JSON.parse(text);assert.equal(payload.data.repos[payload.data.cur].working.seq,original+'AC');
  assert.equal(await page.locator('#se').inputValue(),original+'A');
 }finally{await browser.close();}
});
