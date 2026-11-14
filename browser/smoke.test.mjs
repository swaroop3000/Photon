/** Photon browser smoke checks. Run with local HTTP server on port 8765.
 * Verifies module loading and basic editor interaction without touching remote data.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const URL='http://127.0.0.1:8765/';
test('editor opens and dynamic modules connect to interface',async()=>{
 const browser=await chromium.launch({headless:true});
 try {
   const page=await browser.newPage();
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(URL,{waitUntil:'networkidle'});
   await page.evaluate(()=>{if(document.getElementById('modalBg')?.classList.contains('open'))window.closeModal();});
   assert.equal(await page.title(),'Photon — DNA design + version control');
   const editor=page.locator('#se');
   // If the app starts in the editor already, no navigation is needed.
   if(await editor.count()===0){
     const button=page.getByRole('button',{name:/code/i}).first();
     await button.click();
   }
   await editor.waitFor();
   const original=await editor.inputValue();
   assert.ok(original.length>0,'Seeded DNA construct was expected');
   await editor.fill(original+'A');
   await page.locator('#ap').click();
   assert.equal(await page.locator('#se').inputValue(),original+'A');
   await page.locator('#ub').click();
   assert.equal(await page.locator('#se').inputValue(),original);
   await page.locator('#rb').click();
   assert.equal(await page.locator('#se').inputValue(),original+'A');
   assert.deepEqual(errors,[]);
 } finally {await browser.close();}
});
test('Primer and Cloning tabs load independently without script exceptions',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
   const page=await browser.newPage();
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(URL,{waitUntil:'networkidle'});
   await page.evaluate(()=>{if(document.getElementById('modalBg')?.classList.contains('open'))window.closeModal();});
   if(await page.locator('#se').count()===0)await page.getByRole('button',{name:/code/i}).first().click();
   await page.locator('.tab[data-tool="primers"]').click();
   await page.locator('#photonPrimersV17').waitFor();
   await page.locator('#photonPrimerDesignV18').waitFor();
   await page.locator('#photonPrimerMismatchV19').waitFor();
   await page.locator('.tab[data-tool="cloning"]').click();
   await page.locator('#photonCloningV14').waitFor();
   await page.locator('#photonGibsonV15').waitFor();
   await page.locator('#photonGoldenGateV16').waitFor();
   assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
