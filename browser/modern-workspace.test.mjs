import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {createExampleProject} from './project-ui-helpers.mjs';
import {settled,faultProjectWrites} from './storage-helpers.mjs';
const APP_URL='http://127.0.0.1:8765/';
async function visit(page){await page.goto(APP_URL,{waitUntil:'networkidle'});await settled(page);}
async function sample(page){await createExampleProject(page);}
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
test('phone workspace and menus fit the viewport without changing the design',async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage({viewport:{width:390,height:844}});await visit(page);await sample(page);
  const before=await page.evaluate(()=>structuredClone(W()));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('#expBtn').click();const menu=await page.locator('#expDD').boundingBox();assert.ok(menu.x>=0&&menu.x+menu.width<=390);
  assert.deepEqual(await page.evaluate(()=>structuredClone(W())),before);
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
  const page=await browser.newPage();await visit(page);await sample(page);
  const label=page.locator('label[for="fileIn"]');assert.equal(await label.getAttribute('role'),'button');await label.focus();
  const pending=page.waitForEvent('filechooser');await label.press('Enter');
  await(await pending).setFiles({name:'keyboard.fasta',mimeType:'text/plain',buffer:Buffer.from('>KeyboardImport\nAACCGGTT\n')});
  await page.locator('#impApply').waitFor();await page.locator('#impApply').click();await settled(page);
  assert.equal(await page.evaluate(()=>PhotonEditorBridgeHost.working().seq),'AACCGGTT');
 }finally{await browser.close();}
});
test('modern shell is present before JavaScript and is independent of a stalled optional draft module',async()=>{
 const browser=await chromium.launch();try{
  const noScript=await browser.newPage({javaScriptEnabled:false});await noScript.goto(APP_URL,{waitUntil:'domcontentloaded'});
  assert.equal(await noScript.locator('body').getAttribute('class'),'photon-modern');assert.equal(await noScript.locator('.app').evaluate(el=>getComputedStyle(el).display),'grid');await noScript.close();
  const page=await browser.newPage();await page.route('**/src/ui/draft-tools.mjs',route=>route.fulfill({status:200,contentType:'text/javascript',body:'await new Promise(() => {});'}));await page.goto(APP_URL,{waitUntil:'domcontentloaded'});await page.locator('.photon-workspace-brand').waitFor();await page.waitForFunction(()=>window.PhotonEditorBridgeReady&&window.PhotonProjects);
  assert.equal(await page.locator('.app').evaluate(el=>getComputedStyle(el).display),'grid');assert.equal(await page.locator('.photon-projects-link').count(),1);assert.equal(await page.locator('#helpBtn').innerText(),'Tutorial');assert.ok((await page.evaluate(()=>PhotonProjects.readSnapshot())).data.repos);
 }finally{await browser.close();}
});
test('refreshed projects navigation and cards fit desktop and phone while retaining full project snapshots',async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});await visit(page);await sample(page);const before=await page.evaluate(()=>PhotonProjects.readSnapshot());
  assert.equal(await page.locator('.photon-editor-heading h1').innerText(),'Design your next revision');await page.locator('.photon-projects-link').click();await page.locator('#projectSearch').waitFor();assert.equal(await page.locator('.photon-projects-link').getAttribute('aria-current'),'page');
  assert.deepEqual(await page.evaluate(()=>PhotonProjects.readSnapshot()),before);await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const card=await page.locator('.project-card').first().boundingBox();assert.ok(card.x>=0&&card.x+card.width<=390);await page.locator('#projectSearch').fill('Example_DNA');await page.locator('.project-card').click();await settled(page);assert.deepEqual((await page.evaluate(()=>PhotonProjects.readSnapshot())).data.repos,before.data.repos);
 }finally{await browser.close();}
});

test('built entrypoint selects the exact stylesheet revision while the portable package keeps its asset paths',async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage(),htmlResponse=await page.request.get(APP_URL+'dist/');assert.equal(htmlResponse.ok(),true);const html=await htmlResponse.text();
  const match=html.match(/href="src\/ui\/modern-workspace\.css\?v=([a-f0-9]{16})"/);assert.ok(match,'built stylesheet must have a revision key');
  const cssResponse=await page.request.get(APP_URL+'dist/src/ui/modern-workspace.css?v='+match[1]);assert.equal(cssResponse.ok(),true);assert.equal(createHash('sha256').update(await cssResponse.body()).digest('hex').slice(0,16),match[1]);
  const manifest=await (await page.request.get(APP_URL+'dist/photon-app-manifest.json')).json();assert.ok(manifest.files.some(f=>f.path==='src/ui/modern-workspace.css'));assert.ok(!manifest.files.some(f=>f.path.includes('?')));
 }finally{await browser.close();}
});
