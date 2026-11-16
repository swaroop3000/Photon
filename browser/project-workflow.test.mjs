import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';import {chromium} from 'playwright';
import {settled,faultProjectWrites} from './storage-helpers.mjs';import {createExampleProject} from './project-ui-helpers.mjs';
import {parseGenbank} from '../src/core/feature-io.mjs';
const URL='http://127.0.0.1:8765/';
test('normal project workflow preserves prior projects, edits, undoes, commits, exports and reloads',async()=>{
 const b=await chromium.launch();try{const p=await b.newPage({acceptDownloads:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(URL,{waitUntil:'networkidle'});
 const originals=await p.evaluate(()=>structuredClone(DB.repos));await createExampleProject(p,'MVP_construct');
 const original=await p.evaluate(()=>structuredClone(W()));
 for(const[id,r]of Object.entries(originals))assert.deepEqual(await p.evaluate(id=>structuredClone(DB.repos[id]),id),r);
 const editedSeq=original.seq.slice(0,33)+'A'+original.seq.slice(34);
 await p.locator('#se').fill(editedSeq);await p.locator('#ap').click();await settled(p);
 assert.equal(await p.evaluate(()=>W().seq),editedSeq);await p.locator('#ub').click();await settled(p);
 assert.deepEqual(await p.evaluate(()=>structuredClone(W())),original);
 await p.locator('#se').fill(editedSeq);await p.locator('#ap').click();await settled(p);
 p.once('dialog',d=>d.accept('Update spacer'));await p.locator('#btnCommit').click();await settled(p);
 assert.equal(await p.evaluate(()=>Object.keys(repo().commits).length),2);assert.equal(await p.evaluate(()=>isDirty()),false);
 await p.locator('#expBtn').click();await p.locator('#expDD [data-f="genbank"]').click();
 const pending=p.waitForEvent('download');await p.locator('#doExp').click();const exported=parseGenbank(await readFile(await(await pending).path(),'utf8'));
 assert.equal(exported.seq,editedSeq);assert.deepEqual(exported.features,original.features);
 await p.reload({waitUntil:'networkidle'});assert.equal(await p.evaluate(()=>W().seq),editedSeq);assert.equal(await p.evaluate(()=>Object.keys(repo().commits).length),2);assert.deepEqual(errors,[]);
 }finally{await b.close();}
});
test('failed new project creation leaves all saved projects and legacy source untouched',async()=>{
 const b=await chromium.launch();try{const p=await b.newPage();await p.goto(URL,{waitUntil:'networkidle'});const before=await p.evaluate(()=>PhotonProjects.readSnapshot()),legacy=await p.evaluate(()=>localStorage.getItem('locusPro_v1'));
 await faultProjectWrites(p);await createExampleProject(p,'Should_fail');
 await p.waitForFunction(()=>document.querySelector('#projectCreateStatus')?.textContent.includes('could not be created'));
 assert.deepEqual(await p.evaluate(()=>PhotonProjects.readSnapshot()),before);assert.equal(await p.evaluate(()=>localStorage.getItem('locusPro_v1')),legacy);
 }finally{await b.close();}
});
test('blank project creation works and cancelling a new project preserves unapplied text',async()=>{
 const b=await chromium.launch();try{const p=await b.newPage();await p.goto(URL,{waitUntil:'networkidle'});
 const draft=(await p.locator('#se').inputValue())+'A';await p.locator('#se').fill(draft);const before=await p.evaluate(()=>PhotonProjects.readSnapshot());
 await p.locator('#photonNewProject').click();await p.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await p.locator('#se').inputValue(),draft);assert.deepEqual(await p.evaluate(()=>PhotonProjects.readSnapshot()),before);
 await p.locator('#photonNewProject').click();await p.locator('#projectName').fill('Empty');await p.locator('#photonCreateProject').click();await settled(p);assert.equal(await p.evaluate(()=>W().seq),'');
 await p.locator('#se').fill('AACCGGTT');await p.locator('#ap').click();await settled(p);assert.equal(await p.evaluate(()=>W().seq),'AACCGGTT');
 }finally{await b.close();}
});
test('one normal workspace ignores old presentation URLs and exposes only implemented pages',async()=>{
 const b=await chromium.launch();try{const p=await b.newPage();await p.goto(URL+'?demo=investor',{waitUntil:'networkidle'});
 assert.equal(await p.locator('#photonInvestorPanel,#photonInvestorMode,#btnReset,#cpBtn').count(),0);
 assert.equal(await p.locator('.navt[data-t="labs"],.navt[data-t="remote"],.navt[data-t="actions"]').count(),0);
 assert.equal(await p.locator('.tab[data-tool]').count(),7);assert.equal(await p.locator('.tab[data-tool="cloning"]').isVisible(),true);
 await p.locator('.navt[data-t="settings"]').click();await settled(p);assert.equal(await p.locator('#mockR').count(),0);
 await p.evaluate(()=>{DB.tab='labs';render();});assert.equal(await p.evaluate(()=>DB.tab),'code');
 assert.equal(await p.locator('#se').isVisible(),true);
 }finally{await b.close();}
});
