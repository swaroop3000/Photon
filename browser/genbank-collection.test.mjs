import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {settled} from './storage-helpers.mjs';
const URL='http://127.0.0.1:8765/';

test('multi-record GenBank collection imports to separate local repositories',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(URL,{waitUntil:'networkidle'});
  await page.evaluate(()=>window.closeModal?.());
  const sample=await page.evaluate(()=>window.PhotonFeatureIO.serializeCollection([
   {name:'CollectionA',seq:'AACCGGTTAACC',topology:'linear',features:[{name:'a',type:'CDS',start:2,end:5,strand:1}]},
   {name:'CollectionB',seq:'ACCGGTTAACC',topology:'circular',features:[{name:'wrap',type:'promoter',start:9,end:2,strand:-1}]}
  ]));
  await page.locator('#fileIn').setInputFiles({name:'two.gb',mimeType:'text/plain',buffer:Buffer.from(sample)});
  await page.locator('#impCollection').waitFor();
  assert.match(await page.locator('#modal').innerText(),/2 records/);
  await page.locator('#impCollection').click();
  await settled(page);
  await page.waitForFunction(()=>window.PhotonEditorBridgeHost.working().name==='CollectionA');
  const result=await page.evaluate(()=>{
   const items=Object.values(DB.repos).filter(r=>r.desc==='Imported GenBank collection');
   return items.map(r=>({name:r.name,seq:r.working.seq,topology:r.working.topology,features:r.working.features}));
  });
  assert.equal(result.length,2);
  assert.deepEqual(result.map(x=>x.name).sort(),['CollectionA','CollectionB']);
  assert.equal(result.find(x=>x.name==='CollectionB').features[0].start,9);
  assert.equal(result.find(x=>x.name==='CollectionB').topology,'circular');
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});

test('invalid record aborts GenBank collection without changing browser repositories',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  await page.goto(URL,{waitUntil:'networkidle'});
  await page.evaluate(()=>window.closeModal?.());
  const original=await page.evaluate(()=>({names:Object.keys(DB.repos),working:structuredClone(window.PhotonEditorBridgeHost.working())}));
  const text=await page.evaluate(()=>window.PhotonFeatureIO.serializeCollection([
   {name:'Valid',seq:'AACCGGTT',topology:'linear',features:[]},
   {name:'Invalid',seq:'AACCGGTT',topology:'linear',features:[]}
  ]));
  const pieces=text.split('//\n');
  assert.equal(pieces.length,3);
  const corrupted=pieces[0]+'//\n'+pieces[1].replace('1 aaccggtt','1 xaccggtt')+'//\n';
  assert.notEqual(corrupted,text);
  await page.locator('#fileIn').setInputFiles({name:'bad.gb',mimeType:'text/plain',buffer:Buffer.from(corrupted)});
  await page.getByText('Collection import rejected').waitFor();
  const after=await page.evaluate(()=>({names:Object.keys(DB.repos),working:structuredClone(window.PhotonEditorBridgeHost.working())}));
  assert.deepEqual(after,original);
 }finally{await browser.close();}
});
