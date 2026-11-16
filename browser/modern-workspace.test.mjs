import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {settled,faultProjectWrites} from './storage-helpers.mjs';
const APP_URL='http://127.0.0.1:8765/';
async function visit(page){await page.goto(APP_URL+'?demo=investor',{waitUntil:'networkidle'});}
async function sample(page){await page.locator('#photonInvestorStart').click();await settled(page);}
test('workspace sidebar remains usable across real history navigation and retains original data',async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await visit(page);await sample(page);
  const original=await page.evaluate(()=>structuredClone(PhotonEditorBridgeHost.working()));
  await page.locator('.navt[data-t="commits"]').click();await settled(page);
  assert.equal(await page.locator('.navt[data-t="commits"]').getAttribute('aria-current'),'page');
  assert.equal(await page.locator('.photon-workspace-brand').count(),1);
  assert.equal(await page.locator('.photon-nav-icon').count(),await page.locator('.navt').count());
  await page.locator('.navt[data-t="code"]').click();await settled(page);
  assert.deepEqual(await page.evaluate(()=>structuredClone(PhotonEditorBridgeHost.working())),original);
  assert.equal(await page.locator('#photonBackup').getAttribute('aria-label'),'Backup projects');
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
test('save indicator distinguishes unapplied text, committed baseline, applied changes and failed storage',async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage();await visit(page);await sample(page);
  assert.equal(await page.locator('#photonWorkspaceStatus').innerText(),'Saved locally');
  const original=await page.locator('#se').inputValue();await page.locator('#se').fill(original+'A');
  assert.equal(await page.locator('#photonWorkspaceStatus').innerText(),'Unapplied text');
  assert.equal(await page.evaluate(()=>PhotonEditorBridgeHost.working().seq),original);
  await page.locator('#ap').click();await settled(page);
  assert.equal(await page.locator('#photonWorkspaceStatus').innerText(),'Uncommitted changes');
  await faultProjectWrites(page);await page.locator('#se').fill(original+'AC');await page.locator('#ap').click();await settled(page);
  assert.equal(await page.locator('#photonWorkspaceStatus').innerText(),'Storage needs attention');
  assert.equal(await page.evaluate(()=>PhotonEditorBridgeHost.working().seq),original+'A');
 }finally{await browser.close();}
});
test('phone layout fits the viewport and guide collapse is keyboard usable without saving project data',async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage({viewport:{width:390,height:844}});await visit(page);await sample(page);
  const before=await page.evaluate(()=>PhotonProjects.readSnapshot());
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const toggle=page.locator('#photonGuideToggle');await toggle.focus();await page.keyboard.press('Enter');
  assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  assert.equal(await page.locator('#photonInvestorEdit').isVisible(),false);
  assert.deepEqual(await page.evaluate(()=>PhotonProjects.readSnapshot()),before);
  await page.keyboard.press('Enter');assert.equal(await toggle.getAttribute('aria-expanded'),'true');
  await page.locator('#photonInvestorEdit').click();await settled(page);
  assert.equal(await page.locator('#photonWorkspaceStatus').innerText(),'Uncommitted changes');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('#photonInvestorMode').click();await page.locator('#expBtn').click();
  const menu=await page.locator('#expDD').boundingBox();assert.ok(menu.x>=0&&menu.x+menu.width<=390);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }finally{await browser.close();}
});
test('dark/light primary actions retain readable contrast and reduced-motion preferences are honored',async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage();await visit(page);
  for(const theme of ['light','dark']){
   await page.evaluate(theme=>applyTheme(theme),theme);
   const contrast=await page.locator('#btnCommit').evaluate(button=>{
    const style=getComputedStyle(button),lum=rgb=>{
     const c=rgb.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
     return c[0]*.2126+c[1]*.7152+c[2]*.0722;
    };
    const a=lum(style.color),b=lum(style.backgroundColor);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
   });assert.ok(contrast>=4.5,theme+' contrast '+contrast);
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('#btnCommit').evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
 }finally{await browser.close();}
});
test('import file control is keyboard accessible and still opens a real import review',async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage();await visit(page);
  const label=page.locator('label[for="fileIn"]');assert.equal(await label.getAttribute('role'),'button');await label.focus();
  const pending=page.waitForEvent('filechooser');await page.keyboard.press('Enter');
  await(await pending).setFiles({name:'keyboard.fasta',mimeType:'text/plain',buffer:Buffer.from('>KeyboardImport\nAACCGGTT\n')});
  await page.locator('#impApply').waitFor();await page.locator('#impApply').click();await settled(page);
  assert.equal(await page.evaluate(()=>PhotonEditorBridgeHost.working().seq),'AACCGGTT');
 }finally{await browser.close();}
});
