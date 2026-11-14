import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
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
  await page.evaluate(()=>{DB.repos[DB.cur].name='TEMP_RENAMED';save();});
  page.once('dialog',d=>d.accept());
  await page.locator('#photonRestoreInput').setInputFiles({
   name:'photon-projects-backup.json',mimeType:'application/json',buffer:bytes
  });
  await page.waitForFunction(expected=>JSON.stringify(DB)===expected,before);
  assert.equal(await page.evaluate(()=>JSON.stringify(DB)),before);
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
