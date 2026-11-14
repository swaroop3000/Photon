import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const URL='http://127.0.0.1:8765/';
const hostile='<img src="missing-import-image" onerror="window.photonImportedMarkupExecuted=1">';
for(const field of ['feature type','tag label','annotation warning'])test('backup '+field+' is displayed as literal text',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();await page.goto(URL,{waitUntil:'networkidle'});await page.evaluate(()=>closeModal());
  const data=await page.evaluate(()=>structuredClone(DB)),r=data.repos[data.cur];
  if(field==='feature type')r.working.features[0].type=hostile;
  else if(field==='tag label'){data.tab='commits';r.tags.push({name:hostile,note:'untrusted imported label',time:0,commitId:r.branches[r.branch].head});}
  else{r.working.features[0].name=hostile;r.working.features[0].needsResolution=true;}
  page.once('dialog',d=>d.accept());
  await page.locator('#photonRestoreInput').setInputFiles({name:'untrusted-backup.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify({format:'photon/local-project-backup/1',data}))});
  await page.waitForFunction(()=>document.title.startsWith('Restored '));
  const target=page.locator(field==='feature type'?'#legend':field==='tag label'?'.tagpill':'#vshelf');
  assert.equal(await target.locator('img').count(),0,'untrusted metadata must not create HTML elements');
  assert.ok((await target.innerText()).includes(hostile));
  assert.equal(await page.evaluate(()=>window.photonImportedMarkupExecuted),undefined);
  if(field==='feature type'){
   await page.locator('.frow[data-i="0"]').click();
   assert.equal(await page.locator('#inspector img').count(),0);
   assert.ok((await page.locator('#inspector').innerText()).includes(hostile));
  }
  const value=await page.evaluate(field=>field==='feature type'?W().features[0].type:field==='tag label'?repo().tags.at(-1).name:W().features[0].name,field);
  assert.equal(value,hostile,'display escaping must not alter stored metadata');
 }finally{await browser.close();}
});
