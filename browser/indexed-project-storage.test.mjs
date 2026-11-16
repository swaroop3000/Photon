import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const URL='http://127.0.0.1:8765/';
async function setup(page){
 await page.goto(URL,{waitUntil:'networkidle'});await page.evaluate(()=>closeModal());
 await page.evaluate(async()=>{
  const {createIndexedProjectStorage}=await import('/src/core/indexed-project-storage.mjs');
  window.makeStore=name=>createIndexedProjectStorage({name,legacyStorage:{get length(){return source.size;},key:i=>[...source.keys()][i]??null,getItem:key=>source.get(key)??null}});
  window.initial=structuredClone(DB);window.source=new Map([['locusPro_v1',JSON.stringify(initial,null,2)],
   ['photon.parts.2.7:fixture','part A ACGT'],['photon.backbones.3.1:fixture','{"format":"photon/backbones/1","entries":{}}']]);
  window.openStore=driver=>driver.open({create:()=>structuredClone(initial)});
 });
}
test('migration copies projects and both library namespaces atomically without touching source bytes',async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage();await setup(page);
  const result=await page.evaluate(async()=>{
   const before=[...source],driver=makeStore('migration-copy'),opened=await openStore(driver);
   const saved=await driver.readSnapshot(),original=await driver.migrationSource();
   const result={opened:opened.data,saved,original,before,after:[...source],backend:driver.status.backend};driver.close();return result;
  });
  assert.equal(result.backend,'indexedDB');assert.equal(result.saved.revision,1);
  assert.deepEqual(result.saved.data,result.opened);assert.deepEqual(result.before,result.after);
  assert.equal(result.saved.libraries.length,2);
  for(const [key,raw] of result.before)assert.equal(result.original.entries.find(e=>e.key===key).raw,raw);
 }finally{await browser.close();}
});
test('aborted migration leaves every store empty and source unchanged, then retries safely',async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage();await setup(page);
  const result=await page.evaluate(async()=>{
   const before=[...source],driver=makeStore('migration-abort');const put=IDBObjectStore.prototype.put;
   IDBObjectStore.prototype.put=function(...args){const r=put.apply(this,args);if(this.name==='state'&&this.transaction.db.name==='migration-abort'){const tx=this.transaction;r.addEventListener('success',()=>tx.abort(),{once:true});}return r;};
   const opened=await openStore(driver);IDBObjectStore.prototype.put=put;driver.close();
   const db=await new Promise(resolve=>{const r=indexedDB.open('migration-abort');r.onsuccess=()=>resolve(r.result);});
   const counts=await new Promise(resolve=>{const tx=db.transaction(['state','libraries','migrations']);const reads=['state','libraries','migrations'].map(n=>tx.objectStore(n).count());tx.oncomplete=()=>resolve(reads.map(r=>r.result));});db.close();
   const retry=makeStore('migration-abort');const resumed=await openStore(retry);
   if(!resumed.issue)throw new Error('Interrupted migration must require reviewed recovery');
   await retry.save(initial,{restore:true});const saved=await retry.readSnapshot();retry.close();
   return {blocked:!!opened.issue,counts,before,after:[...source],saved};
  });
  assert.equal(result.blocked,true);assert.deepEqual(result.counts,[0,0,0]);assert.deepEqual(result.before,result.after);
  assert.equal(result.saved.revision,1);assert.equal(result.saved.libraries.length,2);
 }finally{await browser.close();}
});
test('revision compare-and-swap rejects simultaneous stale writers across projects and libraries',async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage();await setup(page);
  const result=await page.evaluate(async()=>{
   const a=makeStore('migration-concurrent'),b=makeStore('migration-concurrent');
   const [aa,bb]=await Promise.all([openStore(a),openStore(b)]);
   if(aa.issue||bb.issue)throw new Error('Concurrent normal migration must adopt the committed winner');
   const one=aa.data,two=bb.data;one.repos[one.cur].name='writer A';two.repos[two.cur].name='writer B';
   const outcomes=await Promise.allSettled([a.save(one,{libraries:[{key:'photon.parts.2.7:atomic',raw:'part winner ACGT'}]}),b.save(two)]);
   const saved=await a.readSnapshot();let staleLibrary=false;
   const loser=outcomes[0].status==='rejected'?a:b;
   try{await loser.saveLibrary('photon.parts.2.7:stale','part lost TT');}catch{staleLibrary=true;}
   const after=await a.readSnapshot();a.close();b.close();
   const c=makeStore('migration-one-client');await openStore(c);const p=c.rollback(),q=c.rollback();p.repos[p.cur].name='p';q.repos[q.cur].name='q';
   const sameClient=await Promise.allSettled([c.save(p),c.save(q)]),single=await c.readSnapshot();c.close();
   return {outcomes:outcomes.map(o=>o.status),saved,after,staleLibrary,sameClient:sameClient.map(o=>o.status),singleRevision:single.revision};
  });
  assert.deepEqual(result.outcomes.sort(),['fulfilled','rejected']);assert.equal(result.staleLibrary,true);
  assert.equal(result.saved.revision,2);assert.deepEqual(result.after,result.saved);
  assert.equal(result.saved.libraries.some(e=>e.key.endsWith(':stale')),false);
  assert.deepEqual(result.sameClient.sort(),['fulfilled','rejected']);assert.equal(result.singleRevision,2);
 }finally{await browser.close();}
});
test('a failed combined project/library transaction preserves revision, data, libraries and recovery intent',async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage();await setup(page);
  const result=await page.evaluate(async()=>{
   const driver=makeStore('migration-combined');await openStore(driver);const before=await driver.readSnapshot(),data=driver.rollback();data.repos[data.cur].name='candidate';
   const put=IDBObjectStore.prototype.put;
   IDBObjectStore.prototype.put=function(...args){const r=put.apply(this,args);if(this.name==='state'&&this.transaction.db.name==='migration-combined'){const tx=this.transaction;r.addEventListener('success',()=>tx.abort(),{once:true});}return r;};
   let rejected=false;try{await driver.save(data,{libraries:[{key:'photon.parts.2.7:new',raw:'part B TTT'}]});}catch{rejected=true;}
   IDBObjectStore.prototype.put=put;
   const after=await driver.readSnapshot(),recovery=driver.status;driver.close();return {before,after,rejected,kind:recovery.recoveryKind,intent:JSON.parse(recovery.recoveryRaw)};
  });
  assert.equal(result.rejected,true);assert.deepEqual(result.after,result.before);
  assert.equal(result.kind,'command');assert.equal(result.intent.libraries[0].raw,'part B TTT');
  assert.equal(result.intent.data.repos[result.intent.data.cur].name,'candidate');
 }finally{await browser.close();}
});
test('legacy drift blocks writes until confirmed restore captures the new source without deleting either version',async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage();await setup(page);
  const result=await page.evaluate(async()=>{
   const driver=makeStore('migration-drift');await openStore(driver);const data=driver.rollback(),reviewed=(await driver.migrationSource()).id;
   const newer=JSON.parse(source.get('locusPro_v1'));newer.repos[newer.cur].name='old app edited';source.set('locusPro_v1',JSON.stringify(newer));
   let rejected=false;try{await driver.save(data);}catch{rejected=true;}
   let staleReview=false;try{await driver.save(data,{restore:true,reviewedLegacyHash:reviewed});}catch{staleReview=true;}
   await driver.save(data,{restore:true});const captured=await driver.migrationSource(),saved=await driver.readSnapshot();driver.close();
   return {rejected,staleReview,captured,saved,legacy:source.get('locusPro_v1')};
  });
  assert.equal(result.rejected,true);assert.equal(result.staleReview,true);assert.equal(result.saved.revision,2);
  assert.equal(result.captured.entries.find(e=>e.key==='locusPro_v1').raw,result.legacy);
  assert.notEqual(result.saved.data.repos[result.saved.data.cur].name,'old app edited');
 }finally{await browser.close();}
});
test('unknown future project schemas fail closed without resetting their data',async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage();await setup(page);
  const result=await page.evaluate(async()=>{
   const old=makeStore('migration-future');await openStore(old);const before=await old.readSnapshot();
   const future=await new Promise((resolve,reject)=>{const r=indexedDB.open('migration-future',2);r.onupgradeneeded=()=>r.result.createObjectStore('future');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});future.close();
   const client=makeStore('migration-future');const opened=await openStore(client);let refused=false;try{await client.save(initial);}catch{refused=true;}
   const db=await new Promise(resolve=>{const r=indexedDB.open('migration-future');r.onsuccess=()=>resolve(r.result);});
   const after=await new Promise(resolve=>{const tx=db.transaction('state');const r=tx.objectStore('state').get('active');tx.oncomplete=()=>resolve(r.result);});db.close();old.close();client.close();
   return {blocked:!!opened.issue,refused,before,after};
  });
  assert.equal(result.blocked,true);assert.equal(result.refused,true);
  assert.deepEqual(result.after.data,result.before.data);assert.equal(result.after.revision,result.before.revision);
 }finally{await browser.close();}
});
test('same-client writes after archive review invalidate the reviewed revision before replacement',async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage();await setup(page);
  const result=await page.evaluate(async()=>{
   const driver=makeStore('reviewed-revision'),opened=await openStore(driver),reviewed=await driver.readSnapshot();
   await driver.saveLibrary('photon.parts.2.7:later','part later ACGT');
   const before=await driver.readSnapshot();let message;
   try{await driver.save(opened.data,{restore:true,reviewedRevision:reviewed.revision,libraries:[{key:'photon.parts.2.7:later',raw:null}]});}
   catch(error){message=error.message;}
   const after=await driver.readSnapshot();driver.close();return{message,before,after};
  });
  assert.match(result.message,/changed after archive review/);assert.deepEqual(result.after,result.before);
 }finally{await browser.close();}
});
