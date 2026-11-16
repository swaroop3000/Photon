import test from 'node:test';import assert from 'node:assert/strict';import {chromium} from 'playwright';
import {settled} from './storage-helpers.mjs';
const URL='http://127.0.0.1:8765/';
test('visible tutorial walks all topics without changing projects, history, drafts or current tools',async()=>{
 const b=await chromium.launch();try{const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(URL,{waitUntil:'networkidle'});await settled(p);
 const draft=(await p.locator('#se').inputValue())+'A';await p.locator('#se').fill(draft);const before=await p.evaluate(()=>PhotonProjects.readSnapshot()),selection=await p.evaluate(()=>({tab:DB.tab,tool:U.tool}));
 assert.equal(await p.locator('#helpBtn').innerText(),'Tutorial');assert.equal(await p.locator('#helpBtn').getAttribute('class').then(c=>c.includes('photon-icon-action')),false);await p.locator('#helpBtn').click();
 for(let step=1;step<=6;step++){assert.equal(await p.locator('#tutorialProgress').innerText(),`Step ${step} of 6`);await p.locator('#tutorialNext').click();}
 assert.equal(await p.locator('#photonTutorial').isVisible(),false);assert.equal(await p.locator('#se').inputValue(),draft);assert.deepEqual(await p.evaluate(()=>PhotonProjects.readSnapshot()),before);assert.deepEqual(await p.evaluate(()=>({tab:DB.tab,tool:U.tool})),selection);assert.equal(await p.evaluate(()=>document.activeElement.id),'helpBtn');
 await p.locator('#helpBtn').click();await p.locator('[data-lesson="3"]').click();await p.locator('#tutorialBack').click();assert.match(await p.locator('#tutorialTitle').innerText(),/Edit/);await p.keyboard.press('Escape');assert.equal(await p.locator('#photonTutorial').isVisible(),false);assert.deepEqual(await p.evaluate(()=>PhotonProjects.readSnapshot()),before);assert.deepEqual(errors,[]);
 }finally{await b.close();}
});
test('phone tutorial fits the modal, traps keyboard focus and can be reopened with the help shortcut',async()=>{
 const b=await chromium.launch();try{const p=await b.newPage({viewport:{width:390,height:844}});await p.goto(URL,{waitUntil:'networkidle'});await p.locator('#helpBtn').focus();await p.keyboard.press('Enter');await p.locator('#tutorialNext').focus();await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.id),'tutorialClose');await p.keyboard.press('Shift+Tab');assert.equal(await p.evaluate(()=>document.activeElement.id),'tutorialNext');
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);const bounds=await p.locator('#photonTutorial').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=390);
 await p.locator('#tutorialClose').click();await p.keyboard.press('?');await p.locator('#tutorialTitle').waitFor();assert.match(await p.locator('#tutorialTitle').innerText(),/Create or import/);
 }finally{await b.close();}
});
