import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {settled,faultProjectWrites} from './storage-helpers.mjs';
const APP_URL='http://127.0.0.1:8765/';
async function visit(page){await page.goto(APP_URL,{waitUntil:'networkidle'});await page.evaluate(()=>window.closeModal?.());}
async function archive(page){return page.evaluate(async()=>{
 const {createBrowserArchive}=await import('/src/core/project-archive.mjs');
 return JSON.stringify(await createBrowserArchive(await PhotonProjects.snapshotEntries()));
});}
async function review(page,text){
 await page.locator('#photonRecoveryCenter').click();
 await page.locator('#photonArchiveFile').setInputFiles({name:'archive.json',mimeType:'application/json',buffer:Buffer.from(text)});
 await page.locator('#photonArchiveAcknowledge').waitFor();
}
async function snapshot(page){await settled(page);return page.evaluate(()=>PhotonProjects.readSnapshot());}
async function restore(page){await page.locator('#photonArchiveAcknowledge').check();await page.locator('#photonRestoreArchive').click();await page.waitForFunction(()=>/Browser archive restored atomically|Archive restore rejected/.test(document.querySelector('#photonVaultStatus')?.textContent));await settled(page);}

test('reviewed archive restores projects and exact library bytes atomically, removes absent keys, preserves source and reloads',async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage();await visit(page);
  const key='photon.parts.2.7:archive',raw='# retain bytes\npart alpha ACGT\nassembly root alpha-\n';
  await page.evaluate(async({key,raw})=>PhotonLibraryStorage.setItem(key,raw),{key,raw});
  const expected=await snapshot(page),text=await archive(page);
  await page.evaluate(async key=>{
   await PhotonLibraryStorage.setItem(key,'part other TTTT');
   await PhotonLibraryStorage.setItem('photon.backbones.3.1:extra','{"format":"photon/backbones/1","entries":{}}');
   const next=structuredClone(PhotonEditorBridgeHost.working());next.name='after archive';await PhotonEditorHistory.replaceConstruct(next);
  },key);
  const before=await snapshot(page),legacy=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
  await review(page,text);
  assert.equal(await page.locator('#photonRestoreArchive').isDisabled(),true);
  assert.match(await page.locator('#photonArchiveReview').innerText(),/remove 1 current library/);
  assert.deepEqual(await snapshot(page),before);
  await restore(page);assert.match(await page.locator('#photonVaultStatus').innerText(),/restored atomically/);
  const after=await snapshot(page);assert.deepEqual(after.data,expected.data);assert.deepEqual(after.libraries,expected.libraries);
  assert.equal(after.revision,before.revision+1);
  assert.deepEqual(await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage))),legacy);
  const copy=await page.evaluate(async()=>{
   const {createRecoveryVault}=await import('/src/core/recovery-vault.mjs');const v=createRecoveryVault();
   const entries=await v.list('archive'),payload=await v.read(entries.find(e=>e.label==='Before archive restore').id);v.close();return payload;
  });
  assert.equal(copy.entries.find(e=>e.key==='locusPro_v1').raw,JSON.stringify(before.data));
  assert.equal(copy.entries.find(e=>e.key==='photon.backbones.3.1:extra').raw,before.libraries.find(e=>e.key==='photon.backbones.3.1:extra').raw);
  await page.reload({waitUntil:'networkidle'});await page.evaluate(()=>window.closeModal?.());
  const reloaded=await snapshot(page);assert.deepEqual(reloaded,after);
 }finally{await browser.close();}
});
test('archive transaction failure rolls back both library removals and project replacement',async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage();await visit(page);const text=await archive(page);
  await page.evaluate(async()=>PhotonLibraryStorage.setItem('photon.parts.2.7:extra','part extra ACGT'));
  const before=await snapshot(page);await review(page,text);await faultProjectWrites(page);
  await restore(page);
  assert.match(await page.locator('#photonVaultStatus').innerText(),/Archive restore rejected:.*quota/i);
  assert.deepEqual(await snapshot(page),before);
 }finally{await browser.close();}
});
test('stale archive review rejects changed active projects or retained source without replacement',async()=>{
 const browser=await chromium.launch();try{
  for(const change of ['active','source']){
   const page=await browser.newPage();await visit(page);const text=await archive(page);await review(page,text);
   await page.evaluate(async change=>{
    if(change==='active')await PhotonLibraryStorage.setItem('photon.parts.2.7:new','part new ACGT');
    else localStorage.setItem('photon.parts.2.7:legacy','part legacy TTTT');
   },change);
   const before=await snapshot(page);await restore(page);
   assert.match(await page.locator('#photonVaultStatus').innerText(),/changed after review/);
   assert.deepEqual(await snapshot(page),before);await page.close();
  }
 }finally{await browser.close();}
});
test('invalid library archive rejects before acknowledgement and cancellation leaves active data untouched',async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage();await visit(page);
  const bad=await page.evaluate(async()=>{
   const {createBrowserArchive}=await import('/src/core/project-archive.mjs');
   return JSON.stringify(await createBrowserArchive([...(await PhotonProjects.snapshotEntries()),{key:'photon.parts.2.7:bad',raw:'assembly A A+'}]));
  });
  const before=await snapshot(page);await page.locator('#photonRecoveryCenter').click();
  await page.locator('#photonArchiveFile').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(bad)});
  await page.waitForFunction(()=>document.querySelector('#photonVaultStatus').textContent.includes('Archive review rejected'));
  assert.equal(await page.locator('#photonRestoreArchive').count(),0);assert.deepEqual(await snapshot(page),before);
  await page.evaluate(()=>closeModal());await review(page,await archive(page));await page.evaluate(()=>closeModal());
  assert.deepEqual(await snapshot(page),before);
 }finally{await browser.close();}
});
test('full recovery vault prevents archive replacement without deleting existing recovery copies',async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage();await visit(page);const text=await archive(page);
  await page.evaluate(async text=>{
   const {createRecoveryVault}=await import('/src/core/recovery-vault.mjs');const v=createRecoveryVault();
   for(let i=0;i<5;i++)await v.put('archive',{...JSON.parse(text),createdAt:new Date(Date.UTC(2026,0,i+1)).toISOString()},{label:'retained '+i});v.close();
  },text);
  const before=await snapshot(page);await review(page,text);await restore(page);
  assert.match(await page.locator('#photonVaultStatus').innerText(),/Archive restore rejected:.*limit|Archive restore rejected:.*capacity/i);
  assert.deepEqual(await snapshot(page),before);
  const count=await page.evaluate(async()=>{const {createRecoveryVault}=await import('/src/core/recovery-vault.mjs');const v=createRecoveryVault();const count=(await v.list('archive')).length;v.close();return count;});assert.equal(count,5);
 }finally{await browser.close();}
});
