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

test('origin-spanning circular annotation draws two clickable map segments',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(URL,{waitUntil:'networkidle'});
  await page.evaluate(()=>{
   if(document.getElementById('modalBg')?.classList.contains('open'))window.closeModal();
   const host=window.PhotonEditorBridgeHost,w=host.working();
   w.topology='circular';
   w.features.push({name:'origin-crossing test',start:w.seq.length-5,end:4,strand:1,type:'CDS'});
   host.render();
  });
  await page.locator('#mapView #photonWrappedFeatures path').first().waitFor();
  assert.equal(await page.locator('#mapView #photonWrappedFeatures path').count(),2);
  await page.locator('.maptab[data-v="linear"]').click();
  assert.equal(await page.locator('#mapView #photonWrappedFeatures rect').count(),2);
  await page.locator('.maptab[data-v="circular"]').click();
  assert.equal(await page.locator('#mapView #photonWrappedFeatures path').count(),2);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});


test('circular feature creation, editing, and GenBank roundtrip preserve origin coordinates',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(URL,{waitUntil:'networkidle'});
  await page.evaluate(()=>{
   if(document.getElementById('modalBg')?.classList.contains('open'))window.closeModal();
   const host=window.PhotonEditorBridgeHost;
   host.working().topology='circular';
   host.render();
  });
  await page.locator('.tab[data-tool="features"]').click();
  const length=await page.locator('#se').inputValue().then(s=>s.length);
  await page.getByText('+ Add feature').click();
  await page.locator('#nn').fill('Wrap test');
  await page.locator('#ns').fill(String(length-4));
  await page.locator('#ne').fill('3');
  await page.locator('#na').click();
  await page.locator('.frow').filter({hasText:'Wrap test'}).click();
  await page.locator('#editSel').click();
  await page.locator('#efn').fill('Wrapped edited');
  await page.locator('#efe').fill('4');
  await page.locator('#efv').click();
  const result=await page.evaluate(()=>{
   const w=window.PhotonEditorBridgeHost.working();
   const exported=toGenBank(w),imported=parseGenBank(exported);
   return {feature:w.features.find(f=>f.name==='Wrapped edited'),
     reimported:imported.features.find(f=>f.name==='Wrapped edited'),
     text:exported,topology:imported.topology};
  });
  assert.equal(result.feature.start,length-4);
  assert.equal(result.feature.end,4);
  assert.deepEqual(result.reimported,result.feature);
  assert.match(result.text,/join\(/);
  assert.equal(result.topology,'circular');
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});


test('safe edit inside circular annotation gap preserves wrapped feature and undo',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  await page.goto(URL,{waitUntil:'networkidle'});
  await page.evaluate(()=>{
   if(document.getElementById('modalBg')?.classList.contains('open'))window.closeModal();
   const host=window.PhotonEditorBridgeHost,w=host.working();
   w.topology='circular';
   w.seq='AACCGGTTAACC';
   w.features=[{name:'wrap',start:10,end:3,strand:1,type:'CDS'}];
   host.render();
  });
  await page.locator('#se').fill('AACCGGGGTTAACC');
  await page.locator('#ap').click();
  let state=await page.evaluate(()=>({
    seq:window.PhotonEditorBridgeHost.working().seq,
    f:window.PhotonEditorBridgeHost.working().features[0]
  }));
  assert.equal(state.seq,'AACCGGGGTTAACC');
  assert.deepEqual([state.f.start,state.f.end],[12,3]);
  await page.locator('#ub').click();
  state=await page.evaluate(()=>({
    seq:window.PhotonEditorBridgeHost.working().seq,
    f:window.PhotonEditorBridgeHost.working().features[0]
  }));
  assert.equal(state.seq,'AACCGGTTAACC');
  assert.deepEqual([state.f.start,state.f.end],[10,3]);
 }finally{await browser.close();}
});


test('Photon SBOL interchange preserves circular annotations and supported qualifiers in the browser',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(URL,{waitUntil:'networkidle'});
  const result=await page.evaluate(()=>{
   if(document.getElementById('modalBg')?.classList.contains('open'))window.closeModal();
   const input={name:'p&demo',seq:'AACCGGTTAACC',topology:'circular',
    features:[{name:'wrap & gene',type:'CDS',start:10,end:3,strand:-1,
      qualifiers:{gene:'abc',note:'verified'}}]};
   const xml=toSBOL(input);
   return {xml,read:parseSBOL(xml),unsupported: (()=>{try{parseSBOL('<sbol:SBOL/>');return false;}catch{return true;}})()};
  });
  assert.equal(result.unsupported,true);
  assert.deepEqual(result.read,{name:'p&demo',seq:'AACCGGTTAACC',topology:'circular',
   features:[{name:'wrap & gene',type:'CDS',start:10,end:3,strand:-1,qualifiers:{gene:'abc',note:'verified'}}]});
  assert.match(result.xml,/photon:format="Photon-2.3"/);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});


test('external GenBank import preserves annotations and refuses unsupported join without mutation',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(URL,{waitUntil:'networkidle'});
  await page.evaluate(()=>{if(document.getElementById('modalBg')?.classList.contains('open'))window.closeModal();});
  const sample=[
   'LOCUS       EXAMPLE02             16 bp    DNA     circular',
   'DEFINITION  Synthetic external format example.',
   'FEATURES             Location/Qualifiers',
   '     source          1..16',
   '                     /organism="synthetic construct"',
   '     CDS             complement(join(14..16,1..2))',
   '                     /gene="wrapB"',
   '                     /note="external flatfile"',
   '     promoter        3..6',
   '                     /label="promB"',
   'ORIGIN',
   '        1 aaccggttaaccggtt',
   '//'
  ].join('\n');
  await page.locator('#fileIn').setInputFiles({
   name:'external.gb',mimeType:'text/plain',buffer:Buffer.from(sample)
  });
  await page.locator('#impApply').waitFor();
  await page.locator('#impApply').click();
  await page.waitForFunction(()=>window.PhotonEditorBridgeHost.working().name==='EXAMPLE02');
  const before=await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working()));
  assert.equal(before.topology,'circular');
  assert.equal(before.seq,'AACCGGTTAACCGGTT');
  assert.deepEqual(before.features,[
   {name:'wrapB',type:'CDS',start:14,end:2,strand:-1,
     qualifiers:{gene:'wrapB',note:'external flatfile'}},
   {name:'promB',type:'promoter',start:3,end:6,strand:1}
  ]);
  const invalid=sample.replace('14..16,1..2','14..15,1..2');
  await page.locator('#fileIn').setInputFiles({
   name:'invalid.gb',mimeType:'text/plain',buffer:Buffer.from(invalid)
  });
  await page.getByRole('heading',{name:'Import rejected'}).waitFor();
  const after=await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working()));
  assert.deepEqual(after,before);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
