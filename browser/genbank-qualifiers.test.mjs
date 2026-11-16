import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {settled} from './storage-helpers.mjs';
const APP_URL='http://127.0.0.1:8765/';
const raw=readFileSync(new URL('../tests/fixtures/genbank/J01749.1.gb',import.meta.url));
test('real GenBank import persists repeated qualifiers and exposes table-11 CDS results after reload',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(APP_URL,{waitUntil:'networkidle'});await page.evaluate(()=>window.closeModal?.());
  await page.locator('#fileIn').setInputFiles({name:'J01749.1.gb',mimeType:'text/plain',buffer:raw});
  await page.locator('#impApply').click();await settled(page);
  const before=await page.evaluate(()=>structuredClone(PhotonEditorBridgeHost.working()));
  assert.equal(before.features.length,48);
  assert.deepEqual(before.features.find(f=>f.start===2730).qualifiers.citation,['[2]','[16]','[17]']);
  await page.reload({waitUntil:'networkidle'});await page.evaluate(()=>window.closeModal?.());
  assert.deepEqual(await page.evaluate(()=>structuredClone(PhotonEditorBridgeHost.working())),before);
  await page.locator('.tab[data-tool="builder"]').click();
  await page.getByRole('button',{name:'Analyze translation',exact:true}).click();
  const text=await page.locator('#photonCDSViewV33').innerText();
  assert.equal((text.match(/table 11/g)||[]).length,3);
  assert.ok(!text.includes('ANNOTATED_TRANSLATION_MISMATCH'));
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
test('CDS biological exceptions are shown as unanalyzed rather than a standard-code peptide',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();await page.goto(APP_URL,{waitUntil:'networkidle'});
  await page.evaluate(async()=>{
   window.closeModal?.();
   await PhotonEditorHistory.replaceConstruct({name:'exception',seq:'ATGTAATAA',topology:'linear',features:[
    {name:'selenocysteine',type:'CDS',start:1,end:9,strand:1,qualifiers:{transl_except:'(pos:4..6,aa:Sec)'}}]});
  });
  await settled(page);await page.locator('.tab[data-tool="builder"]').click();
  await page.getByRole('button',{name:'Analyze translation',exact:true}).click();
  const text=await page.locator('#photonCDSViewV33').innerText();
  assert.match(text,/CDS not analyzed:.*transl_except/);assert.ok(!text.includes('Protein '));
 }finally{await browser.close();}
});
test('legacy inspector and Analyze panel refuse unsupported CDS biology and disable optimization',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();await page.goto(APP_URL,{waitUntil:'networkidle'});
  await page.evaluate(async()=>{
   window.closeModal?.();
   await PhotonEditorHistory.replaceConstruct({name:'exception',seq:'ATGTAATAA',topology:'linear',features:[
    {name:'edited CDS',type:'CDS',start:1,end:9,strand:1,qualifiers:{exception:'RNA editing'}}]});
   U.sel=0;U.tool='analyze';PhotonEditorBridgeHost.render();
  });
  await settled(page);
  assert.match(await page.locator('#inspector').innerText(),/CDS not analyzed:.*exception/);
  assert.match(await page.locator('#to').innerText(),/CDS not analyzed:.*exception/);
  assert.equal(await page.locator('#copt').isVisible(),false);
  assert.ok(!(await page.locator('#tb').innerText()).includes('Protein stats'));
 }finally{await browser.close();}
});
test('legacy codon optimization preserves qualifiers and participates in full-construct undo',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();await page.goto(APP_URL,{waitUntil:'networkidle'});
  await page.evaluate(async()=>{
   window.closeModal?.();
   await PhotonEditorHistory.replaceConstruct({name:'optimize',seq:'ATGAAGTAA',topology:'linear',features:[
    {name:'CDS',type:'CDS',start:1,end:9,strand:1,qualifiers:{translation:'MK',note:['first','second']}}]});
   U.sel=0;U.tool='analyze';PhotonEditorBridgeHost.render();
  });
  await settled(page);
  const original=await page.evaluate(()=>structuredClone(PhotonEditorBridgeHost.working()));
  await page.locator('#copt').click();await settled(page);
  const optimized=await page.evaluate(()=>structuredClone(PhotonEditorBridgeHost.working()));
  assert.notEqual(optimized.seq,original.seq);
  assert.deepEqual(optimized.features[0].qualifiers,original.features[0].qualifiers);
  await page.locator('#ub').click();await settled(page);
  assert.deepEqual(await page.evaluate(()=>structuredClone(PhotonEditorBridgeHost.working())),original);
 }finally{await browser.close();}
});
