import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {settled} from './storage-helpers.mjs';
const APP_URL='http://127.0.0.1:8765/';
test('megabase sequence navigation stays bounded, reaches final annotations and never saves DNA',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(APP_URL,{waitUntil:'networkidle'});
  await page.evaluate(async()=>{
   window.closeModal?.();
   await PhotonEditorHistory.replaceConstruct({name:'megabase',seq:'ACGT'.repeat(250000),topology:'circular',features:[
    {name:'tail',type:'CDS',start:999995,end:1000000,strand:1},
    {name:'wrap',type:'rep_origin',start:999998,end:3,strand:-1}]});
  });
  await settled(page);
  const original=await page.evaluate(async()=>({revision:(await PhotonProjects.readSnapshot()).revision,working:structuredClone(PhotonEditorBridgeHost.working())}));
  assert.equal(await page.locator('#sv').getAttribute('data-start'),'1');
  await page.getByRole('button',{name:'Next window',exact:true}).click();
  assert.equal(await page.locator('#sv').getAttribute('data-start'),'6001');
  await page.locator('#photonSequenceWindowStart').fill('999995');
  await page.getByRole('button',{name:'Go to base',exact:true}).click();
  assert.equal(await page.locator('#sv').getAttribute('data-end'),'1000000');
  assert.equal(await page.locator('#sv .b').count(),6);
  assert.match(await page.locator('#sv').innerText(),/999995/);
  assert.equal(await page.getByRole('button',{name:'Next window',exact:true}).isDisabled(),true);
  await page.locator('#photonSequenceWindowStart').fill('0');
  await page.getByRole('button',{name:'Go to base',exact:true}).click();
  assert.equal(await page.locator('#sv').getAttribute('data-start'),'999995');
  await page.getByRole('button',{name:'Previous window',exact:true}).click();
  assert.equal(await page.locator('#sv').getAttribute('data-start'),'993995');
  const final=await page.evaluate(async()=>({revision:(await PhotonProjects.readSnapshot()).revision,working:structuredClone(PhotonEditorBridgeHost.working()),visible:document.querySelector('#sv').textContent.replace(/[^ACGT]/g,'').length}));
  assert.equal(final.visible,6000);
  assert.equal(final.revision,original.revision);assert.deepEqual(final.working,original.working);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
test('selecting a far-away feature opens its sequence window with absolute coordinates',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();await page.goto(APP_URL,{waitUntil:'networkidle'});
  await page.evaluate(async()=>{
   window.closeModal?.();
   await PhotonEditorHistory.replaceConstruct({name:'ten megabases',seq:'ACGT'.repeat(2500000),topology:'linear',features:[
    {name:'last feature',type:'misc_feature',start:9999995,end:10000000,strand:1}]});
   U.sel=0;PhotonEditorBridgeHost.render();
  });
  await settled(page);
  assert.equal(await page.locator('#sv').getAttribute('data-start'),'9999995');
  assert.equal(await page.locator('#sv .b').count(),6);
  assert.match(await page.locator('#snote').innerText(),/10000000/);
  await page.reload({waitUntil:'networkidle'});await page.evaluate(()=>window.closeModal?.());
  assert.equal(await page.locator('#se').evaluate(el=>el.value.length),10000000);
  assert.equal(await page.locator('#sv').getAttribute('data-start'),'1');
 }finally{await browser.close();}
});
