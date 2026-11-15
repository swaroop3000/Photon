import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium} from 'playwright';
import {settled,savedState,faultProjectWrites} from './storage-helpers.mjs';
const URL='http://127.0.0.1:8765/';
function fixture(){
 const snap={name:'legacy plasmid',seq:'AACCGGTTAACC',topology:'circular',features:[{name:'ori',type:'rep_origin',start:1,end:3,strand:1,qualifiers:{source:{id:'legacy'}}}]};
 return {cur:'r1',tab:'code',repos:{r1:{id:'r1',name:'legacy plasmid',stars:0,created:1,protected:false,working:snap,
  branch:'main',branches:{main:{head:'c1'}},commits:{c1:{id:'c1',parents:[],branch:'main',msg:'initial',author:'you',time:1,snap}},
  tags:[],pulls:[],issues:[],wiki:[{title:'Home',body:'legacy'}]}}};
}
async function visit(page){await page.goto(URL,{waitUntil:'networkidle'});await page.evaluate(()=>closeModal());}
test('real legacy data and both libraries migrate once, retain exact source bytes, and persist new edits across restart',async()=>{
 const profile=await mkdtemp(join(tmpdir(),'photon-active-'));let context;
 try{
  context=await chromium.launchPersistentContext(profile,{headless:true,acceptDownloads:true});
  const page=context.pages()[0];
  const originals={'locusPro_v1':JSON.stringify(fixture(),null,2),'photon.parts.2.7:r1:main:c1':'part p ATGC\nassembly circuit p+',
   'photon.backbones.3.1:r1:main:c1':'{"format":"photon/backbones/1","entries":{}}'};
  await page.addInitScript(values=>{if(!localStorage.getItem('photon-test-seeded')){for(const [key,value] of Object.entries(values))localStorage.setItem(key,value);localStorage.setItem('photon-test-seeded','1');}},originals);
  await visit(page);
  assert.equal(await page.evaluate(()=>PhotonProjects.status.backend),'indexedDB');
  assert.equal(await page.locator('#photonMigrationNotice').count(),1);
  assert.deepEqual((await page.evaluate(()=>PhotonProjects.readSnapshot())).data,fixture());
  await page.locator('.tab[data-tool="builder"]').click();
  assert.equal(await page.locator('#photonPartsDefinitions').inputValue(),originals['photon.parts.2.7:r1:main:c1']);
  const updated='part p ATG\nassembly circuit p+';
  await page.locator('#photonPartsDefinitions').fill(updated);
  await page.getByRole('button',{name:'Save part library',exact:true}).click();await settled(page);
  assert.match(await page.locator('#photonPartsPreview').innerText(),/saved locally/);
  await page.locator('#photonBackboneSaveId').fill('savedB');
  await page.getByRole('button',{name:'Save current backbone',exact:true}).click();await settled(page);
  assert.match(await page.locator('#photonBackboneLibraryStatus').innerText(),/Saved circular backbone/);
  await page.locator('#se').fill(fixture().repos.r1.working.seq+'A');await page.locator('#ap').click();await settled(page);
  const saved=await page.evaluate(()=>PhotonProjects.readSnapshot());
  assert.equal(saved.data.repos.r1.working.seq,'AACCGGTTAACCA');
  assert.equal(saved.libraries.find(e=>e.key.startsWith('photon.parts')).raw,updated);
  assert.ok(JSON.parse(saved.libraries.find(e=>e.key.startsWith('photon.backbones')).raw).entries.savedB);
  assert.deepEqual(await page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),Object.keys(originals)),originals);
  await page.locator('#photonRecoveryCenter').click();
  const download=page.waitForEvent('download');await page.locator('#photonMigrationSource').click();
  const source=JSON.parse(await readFile(await (await download).path(),'utf8'));
  for(const [key,raw] of Object.entries(originals))assert.equal(source.entries.find(e=>e.key===key).raw,raw);
  await context.close();context=null;
  context=await chromium.launchPersistentContext(profile,{headless:true});const reopened=context.pages()[0];await visit(reopened);
  assert.deepEqual(await reopened.evaluate(()=>PhotonProjects.readSnapshot()),saved);
  assert.equal(await reopened.locator('#photonMigrationNotice').count(),0);
 }finally{await context?.close();await rm(profile,{recursive:true,force:true});}
});
test('library failure retains the editor, prior library and recoverable attempted bytes',async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage({acceptDownloads:true});await visit(page);
  await page.locator('.tab[data-tool="builder"]').click();
  const field=page.locator('#photonPartsDefinitions');await field.fill('part p ATG\nassembly circuit p+');
  await page.getByRole('button',{name:'Save part library',exact:true}).click();await settled(page);
  const before=await page.evaluate(()=>PhotonProjects.readSnapshot());await faultProjectWrites(page);
  const attempted='part p GCC\nassembly circuit p+';await field.fill(attempted);
  await page.getByRole('button',{name:'Save part library',exact:true}).click();await settled(page);
  assert.equal(await field.inputValue(),attempted);assert.match(await page.locator('#photonPartsPreview').innerText(),/rejected/);
  assert.deepEqual(await page.evaluate(()=>PhotonProjects.readSnapshot()),before);
  const download=page.waitForEvent('download');await page.locator('#photonStorageRecovery').click();
  const candidate=JSON.parse(await readFile(await (await download).path(),'utf8'));
  assert.equal(candidate.format,'photon/failed-library-save/1');assert.equal(candidate.raw,attempted);
  await page.evaluate(()=>window.failProjectWrites=false);
  await page.getByRole('button',{name:'Save part library',exact:true}).click();await settled(page);
  const after=await page.evaluate(()=>PhotonProjects.readSnapshot());assert.equal(after.revision,before.revision+1);
  assert.equal(after.libraries.find(e=>e.key===candidate.key).raw,attempted);
 }finally{await browser.close();}
});
test('commit success waits for transaction completion and concurrent DNA APIs refuse overlapping actions',async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage();await visit(page);
  await page.locator('#se').fill((await page.locator('#se').inputValue())+'A');await page.locator('#ap').click();await settled(page);
  const before=await page.evaluate(()=>PhotonProjects.status.revision);
  const pending=await page.evaluate(()=>{commit('deferred commit');return {title:document.title,busy:PhotonProjects.status.busy,inert:document.body.inert,revision:PhotonProjects.status.revision};});
  assert.equal(pending.busy,true);assert.equal(pending.inert,true);assert.equal(pending.revision,before);assert.doesNotMatch(pending.title,/Committed: deferred/);
  await settled(page);assert.match(await page.title(),/Committed: deferred commit/);
  const result=await page.evaluate(async()=>{
   const old=W().seq;const results=await Promise.allSettled([
    PhotonEditorHistory.applyEdits([{start:old.length,end:old.length,insert:'T'}]),
    PhotonEditorHistory.applyEdits([{start:0,end:0,insert:'C'}])]);
   return {results:results.map(r=>r.status),old,current:W().seq,saved:(await PhotonProjects.readSnapshot()).data.repos[DB.cur].working.seq};
  });
  assert.deepEqual(result.results,['fulfilled','rejected']);assert.equal(result.current,result.old+'T');assert.equal(result.saved,result.current);
 }finally{await browser.close();}
});
test('unavailable active IndexedDB never falls back to the retained older localStorage copy',async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage();const legacy=JSON.stringify(fixture());
  await page.addInitScript(raw=>{if(!localStorage.getItem('photon-test-seeded')){localStorage.setItem('locusPro_v1',raw);localStorage.setItem('photon-test-seeded','1');}},legacy);
  await visit(page);await page.locator('#se').fill('AACCGGTTAACCA');await page.locator('#ap').click();await settled(page);
  const current=await savedState(page);
  await page.addInitScript(()=>{
   const open=IDBFactory.prototype.open;window.blockActiveOpen=sessionStorage.getItem('photon-test-allow-active')!=='yes';
   IDBFactory.prototype.open=function(name,...args){if(name==='photon-projects'&&window.blockActiveOpen)throw new DOMException('active storage denied','SecurityError');return open.call(this,name,...args);};
  });
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('#photonBackup').isDisabled(),true);
  assert.match(await page.locator('#photonStorageNotice').innerText(),/active storage denied/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('locusPro_v1')),legacy);
  await page.evaluate(()=>{window.blockActiveOpen=false;});
  const preserved=await savedState(page);assert.equal(preserved.saved,current.saved);assert.equal(preserved.revision,current.revision);
  await page.evaluate(()=>sessionStorage.setItem('photon-test-allow-active','yes'));await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('#se').inputValue(),'AACCGGTTAACCA');
 }finally{await browser.close();}
});
test('missing active data cannot silently reopen the retained older source',async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage();const legacy=JSON.stringify(fixture());
  await page.addInitScript(raw=>{if(!localStorage.getItem('photon-test-seeded')){localStorage.setItem('locusPro_v1',raw);localStorage.setItem('photon-test-seeded','1');}},legacy);
  await visit(page);await page.locator('#se').fill('AACCGGTTAACCA');await page.locator('#ap').click();await settled(page);
  const latest=JSON.parse((await savedState(page)).saved);
  await page.evaluate(async()=>{
   const db=await new Promise(resolve=>{const r=indexedDB.open('photon-projects');r.onsuccess=()=>resolve(r.result);});
   await new Promise((resolve,reject)=>{const tx=db.transaction(['state','libraries','migrations'],'readwrite');for(const name of ['state','libraries','migrations'])tx.objectStore(name).clear();tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});db.close();
  });
  await page.reload({waitUntil:'networkidle'});
  assert.match(await page.locator('#photonStorageNotice').innerText(),/Active project data is missing/);
  assert.equal(await page.locator('#photonBackup').isDisabled(),true);
  assert.equal((await savedState(page)).saved,null);
  assert.equal(await page.evaluate(()=>localStorage.getItem('locusPro_v1')),legacy);
  page.once('dialog',d=>d.accept());
  await page.locator('#photonRestoreInput').setInputFiles({name:'reviewed-latest.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'photon/local-project-backup/1',data:latest}))});
  await page.waitForFunction(()=>document.title.startsWith('Restored '));await settled(page);
  assert.equal(await page.locator('#se').inputValue(),'AACCGGTTAACCA');
 }finally{await browser.close();}
});
test('interrupted migration can retry retained projects and libraries only after explicit review',async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage();const legacy=JSON.stringify(fixture());
  await page.addInitScript(raw=>{
   localStorage.setItem('locusPro_v1',raw);localStorage.setItem('photon.parts.2.7:r1:main:c1','part p ATGC');
   const put=IDBObjectStore.prototype.put;window.failInitialMigration=true;
   IDBObjectStore.prototype.put=function(...args){if(this.name==='state'&&this.transaction.db.name==='photon-projects'&&window.failInitialMigration)throw new DOMException('migration interrupted','AbortError');return put.apply(this,args);};
  },legacy);
  await visit(page);assert.equal((await savedState(page)).saved,null);
  await page.locator('#photonRecoveryCenter').click();page.once('dialog',d=>d.dismiss());
  await page.locator('#photonReviewRetainedSource').click();assert.equal((await savedState(page)).saved,null);
  await page.evaluate(()=>window.failInitialMigration=false);page.once('dialog',d=>d.accept());
  await page.locator('#photonReviewRetainedSource').click();await settled(page);
  await page.waitForFunction(()=>document.getElementById('photonVaultStatus').textContent.includes('restored after explicit review'));
  const saved=await page.evaluate(()=>PhotonProjects.readSnapshot());assert.deepEqual(saved.data,fixture());
  assert.equal(saved.libraries[0].raw,'part p ATGC');assert.equal(await page.evaluate(()=>localStorage.getItem('locusPro_v1')),legacy);
 }finally{await browser.close();}
});
