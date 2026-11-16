import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readFileSync as readSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {settled,faultProjectWrites} from './storage-helpers.mjs';
const APP_URL='http://127.0.0.1:8765/';
const source=readSync(new URL('../tests/fixtures/genbank/V00499.1.gb',import.meta.url));
async function visit(page){await page.goto(APP_URL,{waitUntil:'networkidle'});await page.evaluate(()=>window.closeModal?.());}
const synthetic={name:'compound',seq:'AATGCCCCAAACCTAAA',topology:'linear',features:[
 {name:'spliced CDS',type:'CDS',start:2,end:16,strand:1,segments:[{start:2,end:4},{start:9,end:11},{start:14,end:16}],
 qualifiers:{note:['one','two'],evidence:{source:'synthetic'}}}]};
async function state(page){await settled(page);return page.evaluate(async()=>{
 const snapshot=await PhotonProjects.readSnapshot();
 const record=await new Promise((resolve,reject)=>{const r=indexedDB.open('photon-projects');r.onsuccess=()=>{const db=r.result,tx=db.transaction('state'),q=tx.objectStore('state').get('active');tx.oncomplete=()=>{db.close();resolve(q.result);};tx.onabort=()=>reject(tx.error);};r.onerror=()=>reject(r.error);});
 return {snapshot,format:record.format,working:structuredClone(PhotonEditorBridgeHost.working())};
});}
test('public exon join import persists, renders three segments and reports its spliced peptide in legacy inspector',async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await visit(page);
  await page.locator('#fileIn').setInputFiles({name:'V00499.1.gb',mimeType:'text/plain',buffer:source});
  await page.locator('#impApply').click();await settled(page);
  const before=await state(page);assert.equal(before.format,'photon/active-project-store/2');
  assert.equal(await page.locator('[data-compound-feature="2"]').count(),3);
  assert.equal(await page.locator('.arc[data-f="2"]').getAttribute('visibility'),'hidden');
  await page.locator('[data-compound-feature="2"]').first().click();
  assert.match(await page.locator('#inspector').innerText(),/length 444 bp/);
  assert.match(await page.locator('#inspector').innerText(),/protein \(147 aa\)/);
  await page.locator('#inspEdit').click();assert.equal(await page.locator('#efs').isDisabled(),true);assert.equal(await page.locator('#efe').isDisabled(),true);
  await page.locator('#efn').fill('three-exon globin');await page.locator('#efv').click();await settled(page);
  const edited=(await state(page)).working;assert.deepEqual(edited.features[2].segments,before.working.features[2].segments);
  await page.locator('.tab[data-tool="analyze"]').click();await settled(page);
  assert.equal(await page.locator('#copt').isVisible(),false);
  await page.reload({waitUntil:'networkidle'});await page.evaluate(()=>closeModal());
  assert.deepEqual((await state(page)).working,edited);assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
test('compound intronic edit, undo, export and invalid exon deletion preserve geometry and nested metadata',async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage({acceptDownloads:true});await visit(page);
  await page.evaluate(w=>PhotonEditorHistory.replaceConstruct(w),synthetic);await settled(page);
  assert.equal(await page.locator('#sv .b').count(),9);
  assert.equal(await page.locator('[data-compound-feature="0"]').count(),3);
  await page.evaluate(()=>PhotonEditorHistory.applyEdits([{start:6,end:6,insert:'GG'}]));await settled(page);
  const edited=await state(page);assert.deepEqual(edited.working.features[0].segments,[{start:2,end:4},{start:11,end:13},{start:16,end:18}]);
  const rejected=await page.evaluate(async()=>{try{await PhotonEditorHistory.applyEdits([{start:1,end:4,insert:''}]);return false;}catch{return true;}});
  assert.equal(rejected,true);assert.deepEqual(await state(page),edited);
  const pending=page.waitForEvent('download');await page.locator('#photonBackup').click();
  const backup=JSON.parse(await readFile(await (await pending).path(),'utf8'));
  assert.equal(backup.format,'photon/local-project-backup/2');
  await page.locator('#ub').click();await settled(page);assert.deepEqual((await state(page)).working,synthetic);
  assert.equal((await state(page)).format,'photon/active-project-store/2');
 }finally{await browser.close();}
});
test('failed compound import/upgrade leaves original version-1 projects and annotations unchanged',async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage();await visit(page);const before=await state(page);assert.equal(before.format,'photon/active-project-store/1');
  await faultProjectWrites(page);
  await page.locator('#fileIn').setInputFiles({name:'V00499.1.gb',mimeType:'text/plain',buffer:source});await page.locator('#impApply').click();await settled(page);
  assert.deepEqual(await state(page),before);
 }finally{await browser.close();}
});
test('historical version-1 backend refuses compound-fenced data and cannot overwrite it',async()=>{
 const legacyPath=new URL('../tests/fixtures/storage-v1/indexed-project-storage.mjs.txt',import.meta.url);
 const legacy=await readFile(legacyPath,'utf8'),manifest=JSON.parse(await readFile(new URL('../tests/fixtures/storage-v1/manifest.json',import.meta.url),'utf8'));
 assert.equal(createHash('sha256').update(legacy).digest('hex'),manifest.sha256);
 const browser=await chromium.launch();try{
  const page=await browser.newPage();await visit(page);
  await page.evaluate(w=>PhotonEditorHistory.replaceConstruct(w),synthetic);await settled(page);
  const before=await state(page);
  const result=await page.evaluate(async legacy=>{
   const code=legacy.replace(/from '(\.\/[^']+)'/g,(_,path)=>"from '"+new URL('/src/core/'+path.slice(2),location.origin).href+"'");
   const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));
   const {createIndexedProjectStorage}=await import(url);URL.revokeObjectURL(url);
   const old=createIndexedProjectStorage(),demo=structuredClone(DB),opened=await old.open({create:()=>demo,migrate:()=>{}});
   let refused=false;try{await old.save(demo);}catch{refused=true;}
   const result={refused,issue:opened.issue?.message,blocked:old.status.blocked};old.close();return result;
  },legacy);
  assert.equal(result.refused,true);assert.equal(result.blocked,true);assert.match(result.issue,/Unsupported or corrupt/);
  assert.deepEqual(await state(page),before);
 }finally{await browser.close();}
});
test('compound saved backbones fence a store even when working DNA has no compound annotations',async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage();await visit(page);
  await page.evaluate(async w=>{
   const {createBackboneLibrary,addBackbone,serializeBackboneLibrary}=await import('/src/core/backbone-library.mjs');
   const library=addBackbone(createBackboneLibrary(),'spliced',{...w,topology:'circular'});
   await PhotonLibraryStorage.setItem('photon.backbones.3.1:compound',serializeBackboneLibrary(library));
  },synthetic);
  assert.equal((await state(page)).format,'photon/active-project-store/2');
 }finally{await browser.close();}
});
test('version-2 browser archives restore exact compound annotations after further edits',async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage();await visit(page);await page.evaluate(w=>PhotonEditorHistory.replaceConstruct(w),synthetic);await settled(page);
  const original=await state(page);
  const archive=await page.evaluate(async()=>{
   const {createBrowserArchive}=await import('/src/core/project-archive.mjs');return createBrowserArchive(await PhotonProjects.snapshotEntries());
  });assert.equal(archive.format,'photon/browser-storage-archive/2');
  await page.evaluate(()=>PhotonEditorHistory.applyEdits([{start:6,end:6,insert:'GG'}]));await settled(page);
  await page.locator('#photonRecoveryCenter').click();
  await page.locator('#photonArchiveFile').setInputFiles({name:'compound-archive.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(archive))});
  await page.locator('#photonArchiveAcknowledge').check();await page.locator('#photonRestoreArchive').click();
  await page.waitForFunction(()=>document.querySelector('#photonVaultStatus').textContent.includes('restored atomically'));
  const restored=await state(page);assert.deepEqual(restored.snapshot.data,original.snapshot.data);assert.equal(restored.format,'photon/active-project-store/2');
 }finally{await browser.close();}
});
test('single-record megabase GenBank remains importable without collection-only sequence caps',async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage();await visit(page);
  const text=await page.evaluate(()=>PhotonFeatureIO.serialize({name:'LargeGenBank',seq:'ACGT'.repeat(250000),topology:'linear',features:[]}));
  await page.locator('#fileIn').setInputFiles({name:'large.gb',mimeType:'text/plain',buffer:Buffer.from(text)});
  await page.locator('#impApply').click();await settled(page);
  assert.equal(await page.evaluate(()=>PhotonEditorBridgeHost.working().seq.length),1000000);
 }finally{await browser.close();}
});
test('single-record compound annotation budgets reject before offering project replacement',async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage();await visit(page);const before=await state(page);
  const text=await page.evaluate(()=>{
   const segments=Array.from({length:1000},(_,i)=>({start:i+1,end:i+1}));
   return PhotonFeatureIO.serialize({name:'TooManyParts',seq:'A'.repeat(1000),topology:'linear',features:
    Array.from({length:21},(_,i)=>({name:'feature'+i,type:'misc_feature',start:1,end:1000,strand:1,segments}))});
  });
  await page.locator('#fileIn').setInputFiles({name:'parts.gb',mimeType:'text/plain',buffer:Buffer.from(text)});
  await page.getByText('Import rejected',{exact:true}).waitFor();
  assert.match(await page.locator('#modal').innerText(),/annotation-part limit/);assert.equal(await page.locator('#impApply').count(),0);
  assert.deepEqual(await state(page),before);
 }finally{await browser.close();}
});
