import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {settled,faultProjectWrites} from './storage-helpers.mjs';
import {parseGenbank} from '../src/core/feature-io.mjs';
const APP_URL='http://127.0.0.1:8765/';
test('investor workflow imports a separate sample, edits, undoes, commits, exports and survives reload',async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage({acceptDownloads:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(APP_URL+'?demo=investor',{waitUntil:'networkidle'});
  const originals=await page.evaluate(()=>structuredClone(DB.repos));
  assert.equal(await page.locator('#modalBg').evaluate(el=>el.classList.contains('open')),false);
  await page.locator('#photonInvestorStart').click();await settled(page);
  const initial=await page.evaluate(()=>structuredClone(PhotonEditorBridgeHost.working()));
  assert.equal(initial.name,'Photon_demo');
  for(const [id,value] of Object.entries(originals))assert.deepEqual(await page.evaluate(id=>structuredClone(DB.repos[id]),id),value);
  await page.locator('#photonInvestorEdit').click();await settled(page);
  const edited=await page.evaluate(()=>structuredClone(PhotonEditorBridgeHost.working()));assert.notEqual(edited.seq,initial.seq);
  await page.locator('#photonInvestorUndo').click();await settled(page);
  assert.deepEqual(await page.evaluate(()=>structuredClone(PhotonEditorBridgeHost.working())),initial);
  await page.locator('#photonInvestorEdit').click();await settled(page);
  page.once('dialog',dialog=>dialog.accept('Tune synthetic spacer'));
  await page.locator('#photonInvestorCommit').click();await settled(page);
  assert.equal(await page.evaluate(()=>Object.keys(DB.repos[DB.cur].commits).length),2);
  assert.equal(await page.evaluate(()=>isDirty()),false);
  const pending=page.waitForEvent('download');await page.locator('#photonInvestorExport').click();
  const exported=parseGenbank(await readFile(await (await pending).path(),'utf8'));
  assert.deepEqual(exported,edited);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('#photonInvestorPanel').isVisible(),true);
  assert.equal(await page.evaluate(()=>Object.keys(DB.repos[DB.cur].commits).length),2);
  assert.deepEqual(await page.evaluate(()=>structuredClone(PhotonEditorBridgeHost.working())),edited);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
test('failed sample save preserves every existing project and reports failure without a success state',async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage();await page.goto(APP_URL+'?demo=investor',{waitUntil:'networkidle'});
  const before=await page.evaluate(()=>PhotonProjects.readSnapshot());await faultProjectWrites(page);
  await page.locator('#photonInvestorStart').click();await settled(page);
  await page.waitForFunction(()=>document.querySelector('#photonInvestorStatus').textContent.includes('could not be saved'));
  assert.deepEqual(await page.evaluate(()=>PhotonProjects.readSnapshot()),before);
  assert.equal(await page.locator('#photonInvestorEdit').isDisabled(),true);
 }finally{await browser.close();}
});
test('presentation toggle preserves unapplied editor text and restores the full interface',async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage();await page.goto(APP_URL,{waitUntil:'networkidle'});await page.evaluate(()=>closeModal());
  const before=await page.evaluate(()=>PhotonProjects.readSnapshot()),draft=(await page.locator('#se').inputValue())+'A';
  await page.locator('#se').fill(draft);await page.locator('#photonInvestorMode').click();
  assert.equal(await page.locator('#se').inputValue(),draft);
  assert.equal(await page.locator('.tab[data-tool="cloning"]').isVisible(),false);
  assert.equal(await page.locator('#photonInvestorEdit').isDisabled(),true);
  await page.locator('#photonInvestorMode').click();
  assert.equal(await page.locator('.tab[data-tool="cloning"]').isVisible(),true);
  assert.equal(await page.locator('#se').inputValue(),draft);
  assert.deepEqual(await page.evaluate(()=>PhotonProjects.readSnapshot()),before);
 }finally{await browser.close();}
});
