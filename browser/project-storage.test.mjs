import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium} from 'playwright';
import {savedState,faultProjectWrites,settled} from './storage-helpers.mjs';
const URL='http://127.0.0.1:8765/';
async function visit(page){
 await page.goto(URL,{waitUntil:'networkidle'});
 await page.evaluate(()=>window.closeModal?.());
}
const state=savedState;
const faultWrites=page=>faultProjectWrites(page);
async function recovery(page){
 const pending=page.waitForEvent('download');await page.locator('#photonStorageRecovery').click();
  await settled(page);
 return readFile(await (await pending).path(),'utf8');
}
for(const kind of ['malformed JSON','broken branch head'])test(kind+' startup preserves original data and supports explicit restore',async()=>{
 const browser=await chromium.launch();
 try{
  let page=await browser.newPage({acceptDownloads:true});await visit(page);
  const valid=JSON.parse((await state(page)).memory);
  const corrupt=structuredClone(valid);corrupt.repos[corrupt.cur].branches.main.head='missing';
  const raw=kind==='malformed JSON'?'{truncated original':JSON.stringify(corrupt);
  await page.context().close();page=await browser.newPage({acceptDownloads:true});
  await page.addInitScript(raw=>{localStorage.setItem('locusPro_v1',raw);localStorage.setItem('locusSeenTut','1');},raw);await visit(page);
  assert.match(await page.locator('#photonStorageNotice').innerText(),/Original storage was left untouched/);
  assert.equal(await page.locator('#photonBackup').isDisabled(),true);
  assert.equal(await page.evaluate(()=>localStorage.getItem(KEY)),raw);
  assert.equal(await recovery(page),raw);
  const originalDemo=await page.evaluate(()=>JSON.stringify(DB));
  await page.locator('#se').fill((await page.locator('#se').inputValue())+'A');
  await page.locator('#ap').click();
  await settled(page);
  assert.equal(await page.evaluate(()=>JSON.stringify(DB)),originalDemo);
  assert.equal(await page.evaluate(()=>localStorage.getItem(KEY)),raw);
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#photonRestoreInput').setInputFiles({name:'valid.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify({format:'photon/local-project-backup/1',data:valid}))});
  await page.waitForFunction(()=>!document.getElementById('photonStorageNotice'));
  assert.equal(await page.locator('#photonBackup').isEnabled(),true);
  await page.reload({waitUntil:'networkidle'});
  assert.deepEqual(JSON.parse((await state(page)).memory),valid);
 }finally{await browser.close();}
});

test('denied startup reads never overwrite existing projects',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();
  await page.addInitScript(()=>{
   localStorage.setItem('locusPro_v1','original data');
   const get=Storage.prototype.getItem,set=Storage.prototype.setItem;
   window.originalProjectData=()=>get.call(localStorage,'locusPro_v1');window.projectWrites=0;
   Storage.prototype.getItem=function(key){if(key==='locusPro_v1')throw new DOMException('access denied','SecurityError');return get.call(this,key);};
   Storage.prototype.setItem=function(key,value){if(key==='locusPro_v1')window.projectWrites++;return set.call(this,key,value);};
  });
  await visit(page);
  assert.match(await page.locator('#photonStorageNotice').innerText(),/access denied/);
  await page.locator('#se').fill((await page.locator('#se').inputValue())+'A');await page.locator('#ap').click();
  await settled(page);
  assert.deepEqual(await page.evaluate(()=>({raw:window.originalProjectData(),writes:window.projectWrites})),{raw:'original data',writes:0});
 }finally{await browser.close();}
});

test('failed Apply and Undo leave both saved projects and editor history intact',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({acceptDownloads:true});await visit(page);
  const original=await page.locator('#se').inputValue();
  await page.locator('#se').fill(original+'A');await page.locator('#ap').click();
  await settled(page);
  const edited=await state(page);await faultWrites(page);
  await page.locator('#ub').click();
  await settled(page);
  assert.deepEqual(await state(page),edited);
  assert.match(await page.locator('#photonStorageNotice').innerText(),/quota failure/);
  await page.evaluate(()=>window.failProjectWrites=false);await page.locator('#ub').click();
  await settled(page);
  assert.equal(await page.locator('#se').inputValue(),original);
  const undone=await state(page);await page.evaluate(()=>window.failProjectWrites=true);
  await page.locator('#se').fill(original+'C');await page.locator('#ap').click();
  await settled(page);
  assert.deepEqual(await state(page),undone);
  const attempted=JSON.parse(await recovery(page));
  assert.equal(attempted.data.repos[attempted.data.cur].working.seq,original+'C');
  await page.evaluate(()=>window.failProjectWrites=false);await page.locator('#rb').click();
  await settled(page);
  assert.equal(await page.locator('#se').inputValue(),original+'A');
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('#se').inputValue(),original+'A');
 }finally{await browser.close();}
});

test('failed Commit rolls back its head and recovers the attempted snapshot',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({acceptDownloads:true});await visit(page);
  await page.locator('#se').fill((await page.locator('#se').inputValue())+'A');await page.locator('#ap').click();
  await settled(page);
  const before=await state(page),data=JSON.parse(before.memory),count=Object.keys(data.repos[data.cur].commits).length;
  await faultWrites(page);
  page.once('dialog',d=>d.accept('quota commit'));await page.locator('#btnCommit').click();
  await settled(page);
  assert.deepEqual(await state(page),before);
  assert.match(await page.locator('#photonStorageNotice').innerText(),/quota failure/);
  assert.doesNotMatch(await page.title(),/^Committed:/);
  const attempted=JSON.parse(await recovery(page));
  assert.equal(Object.keys(attempted.data.repos[attempted.data.cur].commits).length,count+1);
  await page.evaluate(()=>window.failProjectWrites=false);
  page.once('dialog',d=>d.accept('retry commit'));await page.locator('#btnCommit').click();
  await settled(page);
  const committed=await state(page);assert.notEqual(committed.saved,before.saved);
  await page.reload({waitUntil:'networkidle'});
  assert.deepEqual(await state(page),committed);
 }finally{await browser.close();}
});

test('full legacy localStorage does not prevent 1 Mb IndexedDB editing',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();await visit(page);
  await page.evaluate(()=>window.PhotonEditorHistory.replaceConstruct({name:'large synthetic',seq:'ACGT'.repeat(250000),
   topology:'linear',features:[{name:'whole',type:'misc_feature',start:1,end:1000000,strand:1,qualifiers:{source:{ids:['test']}}}]}));
  const before=await state(page);
  await page.evaluate(()=>{
   let low=0,high=8_000_000;
   while(high-low>1){const mid=Math.floor((low+high)/2);
    try{localStorage.setItem('photon-test-quota-filler','x'.repeat(mid));low=mid;}
    catch(error){if(error.name!=='QuotaExceededError')throw error;high=mid;}
   }
   localStorage.setItem('photon-test-quota-filler','x'.repeat(low));
  });
  const sequence='ACGT'.repeat(250000)+'A'.repeat(4096);
  await page.locator('#se').fill(sequence);await page.locator('#ap').click();
  await settled(page);
  assert.notEqual((await state(page)).saved,before.saved);
  assert.equal((await state(page)).legacy,before.legacy);
  await page.evaluate(()=>localStorage.removeItem('photon-test-quota-filler'));
  await page.locator('#se').fill(sequence);await page.locator('#ap').click();
  await settled(page);
  assert.equal(await page.locator('#photonStorageNotice').count(),0);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('#se').inputValue(),sequence);
  assert.deepEqual(await page.evaluate(()=>W().features[0].qualifiers),{source:{ids:['test']}});
 }finally{await browser.close();}
});

test('failed single-record and collection imports roll back all repository changes',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({acceptDownloads:true});await visit(page);
  const before=await state(page);
  const records=[{name:'ImportedA',seq:'AACCGGTT',topology:'linear',features:[]},
   {name:'ImportedB',seq:'TTGGCCAA',topology:'linear',features:[]}];
  const {serializeGenbankCollection}=await import('../src/core/genbank-collection.mjs');
  await faultWrites(page);
  for(const button of ['#impApply','#impNew','#impCollection']){
   const text=serializeGenbankCollection(button==='#impCollection'?records:records.slice(0,1));
   await page.locator('#fileIn').setInputFiles({name:'test.gb',mimeType:'text/plain',buffer:Buffer.from(text)});
   await page.locator(button).click();
  await settled(page);
   assert.deepEqual(await state(page),before);
   assert.match(await page.locator('#photonStorageNotice').innerText(),/quota failure/);
   await page.evaluate(()=>window.closeModal());
   const attempted=JSON.parse(await recovery(page));
   assert.ok(Object.values(attempted.data.repos).some(r=>r.working.name==='ImportedA'));
  }
  page.once('dialog',d=>d.accept());await page.reload({waitUntil:'networkidle'});
  assert.deepEqual(await state(page),before);
 }finally{await browser.close();}
});

test('stale tabs refuse to overwrite newer saved DNA and can reload it',async()=>{
 const browser=await chromium.launch();
 try{
  const context=await browser.newContext(),a=await context.newPage(),b=await context.newPage();
  await visit(a);await visit(b);const before=await state(b),original=await b.locator('#se').inputValue();
  await a.locator('#se').fill(original+'A');await a.locator('#ap').click();const newer=await state(a);
  await settled(a);
  await b.locator('#se').fill(original+'C');await b.locator('#ap').click();
  await settled(b);
  assert.match(await b.locator('#photonStorageNotice').innerText(),/another tab/);
  assert.equal((await state(b)).memory,before.memory);
  assert.equal((await state(b)).saved,newer.saved);
  b.once('dialog',d=>d.accept());await b.reload({waitUntil:'networkidle'});
  assert.deepEqual(await state(b),newer);
 }finally{await browser.close();}
});

test('missing storage module leaves the original database untouched',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();await visit(page);const before=await state(page);
  await page.route('**/src/core/project-storage.mjs',route=>route.abort());
  await page.reload({waitUntil:'networkidle'});
  assert.match(await page.locator('#photonStorageNotice').innerText(),/modules could not load/);
  assert.equal(await page.evaluate(()=>localStorage.getItem(KEY)),before.legacy);
  assert.equal((await state(page)).saved,before.saved);
  assert.equal(await page.locator('#photonBackup').isDisabled(),true);
  await page.locator('#se').fill('ACGT');await page.locator('#ap').click();
  await settled(page);
  assert.equal(await page.evaluate(()=>localStorage.getItem(KEY)),before.legacy);
  assert.equal((await state(page)).saved,before.saved);
 }finally{await browser.close();}
});

test('saved DNA, nested annotations and commit heads survive a full browser restart',async()=>{
 const profile=await mkdtemp(join(tmpdir(),'photon-storage-'));
 let context;
 try{
  context=await chromium.launchPersistentContext(profile,{headless:true});
  const page=context.pages()[0];await visit(page);
  await page.evaluate(async()=>{
   W().features[0].qualifiers={source:{ids:['restart-regression']}};await save();
  });
  await page.locator('#se').fill((await page.locator('#se').inputValue())+'A');await page.locator('#ap').click();
  await settled(page);
  page.once('dialog',d=>d.accept('restart snapshot'));await page.locator('#btnCommit').click();
  await settled(page);
  const before=await state(page);await context.close();context=null;
  context=await chromium.launchPersistentContext(profile,{headless:true});
  const reopened=context.pages()[0];await visit(reopened);
  assert.deepEqual(await state(reopened),before);
 }finally{await context?.close();await rm(profile,{recursive:true,force:true});}
});
