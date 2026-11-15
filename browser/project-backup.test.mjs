import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {savedState,faultProjectWrites,settled} from './storage-helpers.mjs';
const URL='http://127.0.0.1:8765/';
test('full local project backup round-trips through explicit restore',async()=>{
 const browser=await chromium.launch({headless:true,acceptDownloads:true});
 try{
  const page=await browser.newPage({acceptDownloads:true});
  await page.goto(URL,{waitUntil:'networkidle'});
  await page.evaluate(()=>window.closeModal?.());
  const before=await page.evaluate(()=>JSON.stringify(DB));
  const [download]=await Promise.all([
   page.waitForEvent('download'),page.locator('#photonBackup').click()
  ]);
  const file=await download.path();
  const bytes=await readFile(file);
  const payload=JSON.parse(bytes.toString());
  assert.equal(payload.format,'photon/local-project-backup/1');
  assert.deepEqual(payload.data,JSON.parse(before));
  await page.evaluate(async()=>{DB.repos[DB.cur].name='TEMP_RENAMED';await save();});
  page.once('dialog',d=>d.accept());
  await page.locator('#photonRestoreInput').setInputFiles({
   name:'photon-projects-backup.json',mimeType:'application/json',buffer:bytes
  });
  await page.waitForFunction(expected=>JSON.stringify(DB)===expected,before);
  assert.equal(await page.evaluate(()=>JSON.stringify(DB)),before);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.evaluate(()=>JSON.stringify(DB)),before);
 }finally{await browser.close();}
});

test('corrupt history and quota failures leave saved and working projects untouched',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  await page.goto(URL,{waitUntil:'networkidle'});
  await page.evaluate(()=>window.closeModal?.());
  const before=await savedState(page);
  const payload=JSON.parse(before.memory);
  const r=payload.repos[payload.cur];
  r.branches[r.branch].head='missing';
  let confirmations=0;
  page.on('dialog',async d=>{confirmations++;await d.accept();});
  const upload=data=>page.locator('#photonRestoreInput').setInputFiles({name:'backup.json',
   mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'photon/local-project-backup/1',data}))});
  await upload(payload);
  await page.waitForFunction(()=>document.title.includes('Backup restore rejected'));
  assert.equal(confirmations,0,'invalid history must not even reach the replacement prompt');
  await faultProjectWrites(page,'quota test');
  await upload(JSON.parse(before.memory));
  await page.waitForFunction(()=>document.title.includes('quota test'));
  assert.equal(confirmations,1);
  assert.deepEqual(await savedState(page),before);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.evaluate(()=>JSON.stringify(DB)),before.memory);
 }finally{await browser.close();}
});

test('cancelling a valid restore does not write storage',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  await page.goto(URL,{waitUntil:'networkidle'});
  await page.evaluate(()=>window.closeModal?.());
  const before=await savedState(page);
  const payload={format:'photon/local-project-backup/1',data:JSON.parse(before.memory)};
  payload.data.repos[payload.data.cur].name='Replacement';
  const dialog=page.waitForEvent('dialog');
  await page.locator('#photonRestoreInput').setInputFiles({name:'backup.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify(payload))});
  await (await dialog).dismiss();
  assert.deepEqual(await savedState(page),before);
 }finally{await browser.close();}
});
test('invalid backup is refused without changing local projects',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  await page.goto(URL,{waitUntil:'networkidle'});
  await page.evaluate(()=>window.closeModal?.());
  const before=await page.evaluate(()=>JSON.stringify(DB));
  await page.locator('#photonRestoreInput').setInputFiles({
   name:'invalid.json',mimeType:'application/json',
   buffer:Buffer.from('{"format":"photon/local-project-backup/1","data":{"repos":{}}}')
  });
  await page.waitForFunction(()=>document.title.includes('Backup restore rejected'));
  assert.equal(await page.evaluate(()=>JSON.stringify(DB)),before);
 }finally{await browser.close();}
});
