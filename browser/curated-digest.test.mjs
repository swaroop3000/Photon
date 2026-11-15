import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const APP_URL='http://127.0.0.1:8765/';
test('legacy digest panel and console adapter use outside-site Type IIS offsets',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(APP_URL,{waitUntil:'networkidle'});
  const result=await page.evaluate(async()=>{
   window.closeModal?.();await PhotonEditorHistory.replaceConstruct({name:'Type IIS',seq:'AAAAAGGTCTCAAAACCCCGGGGTTTTAAAAAGAGACCAAAAA',topology:'linear',features:[]});
   U.enz=new Set(['BsaI']);U.tool='analyze';PhotonEditorBridgeHost.render();
   return digest(W().seq,['BsaI'],false);
  });
  assert.deepEqual(result.cuts.map(s=>s.pos),[12,27]);
  assert.deepEqual(result.frags,[16,15,12]);
  assert.match(await page.locator('#do').innerText(),/2 cut\(s\).*16bp, 15bp, 12bp/);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
test('legacy digest reports ambiguous DNA as unavailable without inventing exact fragments',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(APP_URL,{waitUntil:'networkidle'});
  await page.evaluate(async()=>{
   window.closeModal?.();await PhotonEditorHistory.replaceConstruct({name:'ambiguous',seq:'AANGAATTCCC',topology:'linear',features:[]});
   U.enz=new Set(['EcoRI']);U.tool='analyze';PhotonEditorBridgeHost.render();
  });
  assert.match(await page.locator('#do').innerText(),/Digest unavailable:.*Invalid DNA base/);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
