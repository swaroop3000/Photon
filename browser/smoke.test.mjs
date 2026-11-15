/** Photon browser smoke checks. Run with local HTTP server on port 8765.
 * Verifies module loading and basic editor interaction without touching remote data.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {settled} from './storage-helpers.mjs';
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
  await settled(page);
   }
   await editor.waitFor();
   const original=await editor.inputValue();
   assert.ok(original.length>0,'Seeded DNA construct was expected');
   await editor.fill(original+'A');
   await page.locator('#ap').click();
  await settled(page);
   assert.equal(await page.locator('#se').inputValue(),original+'A');
   await page.locator('#ub').click();
  await settled(page);
   assert.equal(await page.locator('#se').inputValue(),original);
   await page.locator('#rb').click();
  await settled(page);
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
  await settled(page);
   await page.locator('.tab[data-tool="primers"]').click();
  await settled(page);
   await page.locator('#photonPrimersV17').waitFor();
   await page.locator('#photonPrimerDesignV18').waitFor();
   await page.locator('#photonPrimerMismatchV19').waitFor();
   await page.locator('.tab[data-tool="cloning"]').click();
  await settled(page);
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
  await settled(page);
  assert.equal(await page.locator('#mapView #photonWrappedFeatures rect').count(),2);
  await page.locator('.maptab[data-v="circular"]').click();
  await settled(page);
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
  await settled(page);
  const length=await page.locator('#se').inputValue().then(s=>s.length);
  await page.getByText('+ Add feature').click();
  await settled(page);
  await page.locator('#nn').fill('Wrap test');
  await page.locator('#ns').fill(String(length-4));
  await page.locator('#ne').fill('3');
  await page.locator('#na').click();
  await settled(page);
  await page.locator('.frow').filter({hasText:'Wrap test'}).click();
  await settled(page);
  await page.locator('#editSel').click();
  await settled(page);
  await page.locator('#efn').fill('Wrapped edited');
  await page.locator('#efe').fill('4');
  await page.locator('#efv').click();
  await settled(page);
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
  await settled(page);
  let state=await page.evaluate(()=>({
    seq:window.PhotonEditorBridgeHost.working().seq,
    f:window.PhotonEditorBridgeHost.working().features[0]
  }));
  assert.equal(state.seq,'AACCGGGGTTAACC');
  assert.deepEqual([state.f.start,state.f.end],[12,3]);
  await page.locator('#ub').click();
  await settled(page);
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
  await settled(page);
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


test('SBOL3 N-Triples export and reviewed file import preserve circular features',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(URL,{waitUntil:'networkidle'});
  await page.evaluate(()=>{if(document.getElementById('modalBg')?.classList.contains('open'))window.closeModal();});
  const input={name:'P2_5',seq:'AACCGGTTAACC',topology:'circular',
    features:[{name:'wrapped',type:'CDS',start:10,end:3,strand:-1,
      qualifiers:{gene:'bla',note:'test'}}]};
  const graph=await page.evaluate(w=>window.PhotonSbol3.serialize(w),input);
  assert.match(graph,/http:\/\/sbols.org\/v3#Component/);
  await page.locator('#fileIn').setInputFiles({
    name:'test.sbol3.nt',mimeType:'text/plain',buffer:Buffer.from(graph)
  });
  await page.locator('#impApply').waitFor();
  await page.locator('#impApply').click();
  await settled(page);
  const out=await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working()));
  assert.equal(out.name,input.name);
  assert.equal(out.seq,input.seq);
  assert.equal(out.topology,input.topology);
  assert.deepEqual(out.features,input.features);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});


test('Builder previews multi-component SBOL3 and exposes graph download',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(URL,{waitUntil:'networkidle'});
  await page.evaluate(()=>{if(document.getElementById('modalBg')?.classList.contains('open'))window.closeModal();});
  await page.locator('.tab[data-tool="builder"]').click();
  await settled(page);
  await page.locator('#photonSbol3BuilderV26').waitFor();
  await page.getByRole('button',{name:'Preview SBOL 3 assembly'}).click();
  await settled(page);
  await page.getByText('Design: PhotonAssembly', {exact:false}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Export SBOL 3 N-Triples'}).isVisible(),true);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});


test('reusable library previews nested DNA graph, persists, and rejects cycles',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(URL,{waitUntil:'networkidle'});
  await page.evaluate(()=>{if(document.getElementById('modalBg')?.classList.contains('open'))window.closeModal();});
  await page.locator('.tab[data-tool="builder"]').click();
  await settled(page);
  await page.locator('#photonPartsV27').waitFor();
  await page.getByRole('button',{name:'Preview hierarchy'}).click();
  await settled(page);
  const output=page.locator('#photonPartsPreview');
  await output.getByText('circuit', {exact:false}).first().waitFor();
  assert.match(await output.innerText(),/promoter/);
  assert.match(await output.innerText(),/cassette/);
  assert.equal(await page.getByRole('button',{name:'Export hierarchy SBOL 3'}).isVisible(),true);
  await page.getByRole('button',{name:'Save part library'}).click();
  await settled(page);
  await page.reload({waitUntil:'networkidle'});
  await page.evaluate(()=>{if(document.getElementById('modalBg')?.classList.contains('open'))window.closeModal();});
  await page.locator('.tab[data-tool="builder"]').click();
  await settled(page);
  assert.match(await page.locator('#photonPartsDefinitions').inputValue(),/assembly circuit/);
  await page.locator('#photonPartsDefinitions').fill('assembly A B+\nassembly B A+');
  await page.getByRole('button',{name:'Preview hierarchy'}).click();
  await settled(page);
  assert.match(await page.locator('#photonPartsPreview').innerText(),/Circular assembly reference/);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});


test('visual circuit designer inserts, reverses, moves, removes without editing DNA',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
   const page=await browser.newPage();
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(URL,{waitUntil:'networkidle'});
   await page.evaluate(()=>{if(document.getElementById('modalBg')?.classList.contains('open'))window.closeModal();});
   const before=await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working()));
   await page.locator('.tab[data-tool="builder"]').click();
  await settled(page);
   const visual=page.locator('#photonCircuitVisualV28');
   await visual.waitFor();
   const cards=visual.locator('#photonCircuitTrack > div');
   assert.equal(await cards.count(),3);
   await visual.locator('#photonCircuitPartPicker').selectOption('promoter');
   await visual.getByRole('button',{name:'Insert component'}).click();
  await settled(page);
   assert.equal(await cards.count(),4);
   assert.match(await page.locator('#photonPartsDefinitions').inputValue(),/assembly circuit cassette\+ terminator\+ cassette- promoter\+/);
   await visual.getByRole('button',{name:'Reverse promoter'}).click();
  await settled(page);
   assert.match(await page.locator('#photonPartsDefinitions').inputValue(),/promoter-/);
   await visual.getByRole('button',{name:'Move promoter left'}).click();
  await settled(page);
   assert.match(await page.locator('#photonPartsDefinitions').inputValue(),/assembly circuit cassette\+ terminator\+ promoter- cassette-/);
   await visual.getByRole('button',{name:'Remove promoter'}).click();
  await settled(page);
   assert.equal(await cards.count(),3);
   assert.deepEqual(await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working())),before);
   assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});


test('reviewed circuit application replaces working construct and undo restores full snapshot',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(URL,{waitUntil:'networkidle'});
  await page.evaluate(()=>{if(document.getElementById('modalBg')?.classList.contains('open'))window.closeModal();});
  const before=await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working()));
  await page.locator('.tab[data-tool="builder"]').click();
  await settled(page);
  await page.locator('#photonCircuitApplyV29').waitFor();
  const panel=page.locator('#photonCircuitApplyV29');
  await panel.getByRole('button',{name:'Review plasmid replacement'}).click();
  await settled(page);
  assert.match(await panel.locator('#photonCircuitApplyReview').innerText(),/Replacement: circuit/);
  const apply=panel.getByRole('button',{name:'Apply reviewed circuit'});
  assert.equal(await apply.isEnabled(),false);
  await panel.locator('#photonCircuitApplyConfirm').check();
  await apply.click();
  await settled(page);
  const changed=await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working()));
  assert.equal(changed.name,'circuit');
  assert.equal(changed.topology,'linear');
  assert.equal(changed.features.length,5);
  assert.equal(changed.seq.length,42);
  assert.deepEqual(changed.features.map(f=>f.strand),[1,-1,1,1,-1]);
  assert.notEqual(changed.seq,before.seq);
  await page.locator('.tab[data-tool="features"]').click();
  await settled(page);
  await page.locator('#ub').click();
  await settled(page);
  const restored=await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working()));
  assert.deepEqual(restored,before);
  await page.locator('#rb').click();
  await settled(page);
  const again=await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working()));
  assert.deepEqual(again,changed);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});

test('circuit application rejects stale reviews after circuit edits',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  await page.goto(URL,{waitUntil:'networkidle'});
  await page.evaluate(()=>{if(document.getElementById('modalBg')?.classList.contains('open'))window.closeModal();});
  const before=await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working()));
  await page.locator('.tab[data-tool="builder"]').click();
  await settled(page);
  const panel=page.locator('#photonCircuitApplyV29');
  await panel.getByRole('button',{name:'Review plasmid replacement'}).click();
  await settled(page);
  await page.locator('#photonPartsDefinitions').fill('part p ATGC\nassembly circuit p+');
  assert.equal(await panel.getByRole('button',{name:'Apply reviewed circuit'}).isVisible(),false);
  const unchanged=await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working()));
  assert.deepEqual(unchanged,before);
 }finally{await browser.close();}
});


test('reviewed circular backbone insertion preserves features and supports complete undo redo',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(URL,{waitUntil:'networkidle'});
  await page.evaluate(()=>{
   if(document.getElementById('modalBg')?.classList.contains('open'))window.closeModal();
   const host=window.PhotonEditorBridgeHost,w=host.working();
   w.name='pBackbone';w.seq='AACCGGTTAACC';w.topology='circular';
   w.features=[
    {name:'upstream',start:1,end:3,strand:1,type:'promoter'},
    {name:'downstream',start:9,end:11,strand:-1,type:'CDS'}
   ];
   host.render();
  });
  const before=await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working()));
  await page.locator('.tab[data-tool="builder"]').click();
  await settled(page);
  const panel=page.locator('#photonCircularBackboneV30');
  await panel.waitFor();
  await panel.locator('#photonBackboneBoundary').fill('6');
  await panel.getByRole('button',{name:'Review circular plasmid assembly'}).click();
  await settled(page);
  assert.match(await panel.locator('#photonBackboneReview').innerText(),/Result: pBackbone/);
  const apply=panel.getByRole('button',{name:'Apply reviewed circular assembly'});
  assert.equal(await apply.isEnabled(),false);
  await panel.locator('#photonBackboneConfirm').check();
  await apply.click();
  await settled(page);
  const after=await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working()));
  assert.equal(after.name,'pBackbone');
  assert.equal(after.topology,'circular');
  assert.equal(after.seq.length,54);
  assert.equal(after.features.length,7);
  assert.deepEqual(after.features.slice(0,2).map(f=>[f.name,f.start,f.end]),[
   ['upstream',1,3],['downstream',51,53]]);
  assert.equal(after.features[2].start,7);
  const gb=await page.evaluate(()=>{
   const w=window.PhotonEditorBridgeHost.working();
   const encoded=toGenBank(w),imported=parseGenBank(encoded);
   return {seq:imported.seq,topology:imported.topology,features:imported.features};
  });
  assert.equal(gb.seq,after.seq);
  assert.equal(gb.topology,'circular');
  assert.deepEqual(gb.features,after.features);
  await page.locator('.tab[data-tool="features"]').click();
  await settled(page);
  await page.locator('#ub').click();
  await settled(page);
  assert.deepEqual(await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working())),before);
  await page.locator('#rb').click();
  await settled(page);
  assert.deepEqual(await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working())),after);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
test('circular backbone review refuses insertion that splits an existing feature',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  await page.goto(URL,{waitUntil:'networkidle'});
  await page.evaluate(()=>{
   if(document.getElementById('modalBg')?.classList.contains('open'))window.closeModal();
   const host=window.PhotonEditorBridgeHost,w=host.working();
   w.name='pBackbone';w.seq='AACCGGTTAACC';w.topology='circular';
   w.features=[{name:'protected',start:1,end:4,strand:1,type:'CDS'}];
   host.render();
  });
  const before=await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working()));
  await page.locator('.tab[data-tool="builder"]').click();
  await settled(page);
  const panel=page.locator('#photonCircularBackboneV30');
  await panel.locator('#photonBackboneBoundary').fill('2');
  await panel.getByRole('button',{name:'Review circular plasmid assembly'}).click();
  await settled(page);
  assert.match(await panel.locator('#photonBackboneReview').innerText(),/split backbone feature: protected/);
  assert.equal(await panel.getByRole('button',{name:'Apply reviewed circular assembly'}).isVisible(),false);
  assert.deepEqual(await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working())),before);
 }finally{await browser.close();}
});


test('Photon 3.1 selects saved backbone, previews junctions and applies to unrelated working construct',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(URL,{waitUntil:'networkidle'});
  await page.evaluate(()=>{
   if(document.getElementById('modalBg')?.classList.contains('open'))window.closeModal();
   const w=window.PhotonEditorBridgeHost.working();
   w.name='BackboneA';w.seq='AACCGGTTAACC';w.topology='circular';
   w.features=[{name:'ori',start:1,end:3,strand:1,type:'rep_origin'}];
   window.PhotonEditorBridgeHost.render();
  });
  await page.locator('.tab[data-tool="builder"]').click();
  await settled(page);
  const lib=page.locator('#photonBackboneLibraryV31');
  await lib.waitFor();
  await lib.locator('#photonBackboneSaveId').fill('savedBase');
  await lib.getByRole('button',{name:'Save current backbone'}).click();
  await settled(page);
  assert.match(await lib.locator('#photonBackboneLibraryStatus').innerText(),/Saved circular backbone/);
  const selected=lib.locator('#photonBackboneSource');
  await selected.selectOption('savedBase');
  // Deliberately change the working construct. Saved backbones remain independent.
  await page.evaluate(()=>{
    const w=window.PhotonEditorBridgeHost.working();
    w.name='DifferentLinear';w.seq='ATGC';w.topology='linear';w.features=[];
  });
  const before=await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working()));
  const panel=page.locator('#photonCircularBackboneV30');
  await panel.locator('#photonBackboneBoundary').fill('6');
  await panel.getByRole('button',{name:'Review circular plasmid assembly'}).click();
  await settled(page);
  const report=await panel.locator('#photonBackboneReview').innerText();
  assert.match(report,/Selected backbone: BackboneA/);
  assert.match(report,/Current working plasmid: DifferentLinear/);
  assert.match(report,/Junctions \(left \| right, top strand\)/);
  assert.match(report,/Curated restriction sites before/);
  await panel.locator('#photonBackboneConfirm').check();
  await panel.getByRole('button',{name:'Apply reviewed circular assembly'}).click();
  await settled(page);
  const after=await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working()));
  assert.equal(after.name,'BackboneA');
  assert.equal(after.topology,'circular');
  assert.equal(after.seq.length,54);
  assert.equal(after.features[0].name,'ori');
  assert.equal(after.features[0].start,1);
  await page.locator('.tab[data-tool="features"]').click();
  await settled(page);
  await page.locator('#ub').click();
  await settled(page);
  assert.deepEqual(await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working())),before);
  await page.locator('#rb').click();
  await settled(page);
  assert.deepEqual(await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working())),after);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});

test('Photon 3.1 invalidates review when selected backbone changes',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  await page.goto(URL,{waitUntil:'networkidle'});
  await page.evaluate(()=>{
    if(document.getElementById('modalBg')?.classList.contains('open'))window.closeModal();
    const w=window.PhotonEditorBridgeHost.working();
    w.name='Base';w.seq='AACCGGTTAACC';w.topology='circular';w.features=[];
    window.PhotonEditorBridgeHost.render();
  });
  await page.locator('.tab[data-tool="builder"]').click();
  await settled(page);
  await page.locator('#photonBackboneSaveId').fill('saved');
  await page.getByRole('button',{name:'Save current backbone'}).click();
  await settled(page);
  const panel=page.locator('#photonCircularBackboneV30');
  await panel.locator('#photonBackboneBoundary').fill('5');
  await panel.getByRole('button',{name:'Review circular plasmid assembly'}).click();
  await settled(page);
  assert.equal(await panel.getByRole('button',{name:'Apply reviewed circular assembly'}).isVisible(),true);
  await panel.locator('#photonBackboneSource').selectOption('current');
  await panel.locator('#photonBackboneSource').selectOption('saved');
  assert.equal(await panel.getByRole('button',{name:'Apply reviewed circular assembly'}).isVisible(),false);
  assert.match(await panel.locator('#photonBackboneReview').innerText(),/Review again/);
 }finally{await browser.close();}
});


test('Photon 3.2 runs advisory construct QC and downloads versioned JSON without mutation',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(URL,{waitUntil:'networkidle'});
  await page.evaluate(()=>{
   if(document.getElementById('modalBg')?.classList.contains('open'))window.closeModal();
   const w=window.PhotonEditorBridgeHost.working();
   w.name='QCDemo';w.seq='ATGTAATAAAAAAAAAA';w.topology='linear';
   w.features=[{name:'test CDS',type:'CDS',start:1,end:9,strand:1}];
   window.PhotonEditorBridgeHost.render();
  });
  const before=await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working()));
  await page.locator('.tab[data-tool="builder"]').click();
  await settled(page);
  const panel=page.locator('#photonConstructQCV32');
  await panel.waitFor();
  await panel.getByRole('button',{name:'Run construct QC'}).click();
  await settled(page);
  assert.match(await panel.locator('#photonQCResult').innerText(),/QCDemo/);
  assert.match(await panel.locator('#photonQCResult').innerText(),/Homopolymer runs/);
  assert.match(await panel.locator('#photonQCWarnings').innerText(),/CDS_INTERNAL_STOP/);
  assert.match(await panel.locator('#photonQCWarnings').innerText(),/HOMOPOLYMER/);
  const downloadPromise=page.waitForEvent('download');
  await panel.getByRole('button',{name:'Download QC JSON'}).click();
  await settled(page);
  const download=await downloadPromise;
  assert.equal(download.suggestedFilename(),'photon-qc-QCDemo.json');
  assert.deepEqual(await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working())),before);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
test('Photon 3.2 refuses to export a report after the working construct changes',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  await page.goto(URL,{waitUntil:'networkidle'});
  await page.evaluate(()=>{if(document.getElementById('modalBg')?.classList.contains('open'))window.closeModal();});
  await page.locator('.tab[data-tool="builder"]').click();
  await settled(page);
  const panel=page.locator('#photonConstructQCV32');
  await panel.getByRole('button',{name:'Run construct QC'}).click();
  await settled(page);
  const exportButton=panel.getByRole('button',{name:'Download QC JSON'});
  assert.equal(await exportButton.isVisible(),true);
  await page.evaluate(()=>{window.PhotonEditorBridgeHost.working().seq+='A';});
  await exportButton.click();
  await settled(page);
  assert.match(await panel.locator('#photonQCResult').innerText(),/Working construct changed/);
  assert.equal(await exportButton.isVisible(),false);
 }finally{await browser.close();}
});


test('Photon 3.3 translates six frames, reports CDS and downloads versioned JSON without mutation',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(URL,{waitUntil:'networkidle'});
  await page.evaluate(()=>{
   if(document.getElementById('modalBg')?.classList.contains('open'))window.closeModal();
   const w=window.PhotonEditorBridgeHost.working();
   w.name='TranslationDemo';w.seq='ATGAAATAA';w.topology='linear';
   w.features=[{name:'gene',type:'CDS',start:1,end:9,strand:1}];
   window.PhotonEditorBridgeHost.render();
  });
  const before=await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working()));
  await page.locator('.tab[data-tool="builder"]').click();
  await settled(page);
  const panel=page.locator('#photonTranslationV33');
  await panel.waitFor();
  await panel.locator('#photonOrfMinV33').fill('1');
  await panel.getByRole('button',{name:'Analyze translation'}).click();
  await settled(page);
  assert.match(await panel.locator('#photonTranslationSummary').innerText(),/Six reading frames/);
  assert.match(await panel.locator('#photonTranslationSummary').innerText(),/1 complete ORF/);
  assert.match(await panel.locator('#photonFrameViewV33').innerText(),/Protein preview: MK\*/);
  assert.match(await panel.locator('#photonCDSViewV33').innerText(),/gene/);
  await panel.locator('#photonFrameSelectV33').selectOption('-1');
  assert.match(await panel.locator('#photonFrameViewV33').innerText(),/Frame -1/);
  const downloadPromise=page.waitForEvent('download');
  await panel.getByRole('button',{name:'Download translation JSON'}).click();
  await settled(page);
  const download=await downloadPromise;
  assert.equal(download.suggestedFilename(),'photon-translation-TranslationDemo.json');
  assert.deepEqual(await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working())),before);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
test('Photon 3.3 rejects stale translation report downloads after DNA changes',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  await page.goto(URL,{waitUntil:'networkidle'});
  await page.evaluate(()=>{if(document.getElementById('modalBg')?.classList.contains('open'))window.closeModal();});
  await page.locator('.tab[data-tool="builder"]').click();
  await settled(page);
  const panel=page.locator('#photonTranslationV33');
  await panel.getByRole('button',{name:'Analyze translation'}).click();
  await settled(page);
  const download=panel.getByRole('button',{name:'Download translation JSON'});
  assert.equal(await download.isVisible(),true);
  await page.evaluate(()=>{window.PhotonEditorBridgeHost.working().seq+='A';});
  await download.click();
  await settled(page);
  assert.match(await panel.locator('#photonTranslationSummary').innerText(),/Construct changed/);
  assert.equal(await download.isVisible(),false);
 }finally{await browser.close();}
});


test('Photon 3.4 exports request and accepts template-validated Primer3 results',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
   const page=await browser.newPage({acceptDownloads:true});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(URL,{waitUntil:'networkidle'});
   await page.evaluate(()=>{
     if(document.getElementById('modalBg')?.classList.contains('open'))window.closeModal();
     const w=window.PhotonEditorBridgeHost.working();
     w.name='Primer3Sample';w.seq='ATGCGTACCGTTAGCAATGCCGTAGCTTACGATCGATGCCTGATCGTTACGATCGTTCATCGATCGTTCATGC';
     w.topology='linear';w.features=[];
     window.PhotonEditorBridgeHost.render();
   });
   const before=await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working()));
   await page.locator('.tab[data-tool="primers"]').click();
  await settled(page);
   const panel=page.locator('#photonPrimer3V34');
   await panel.waitFor();
   await panel.locator('#photonPrimer3MinV34').fill('40');
   await panel.locator('#photonPrimer3MaxV34').fill('65');
   const downloadEvent=page.waitForEvent('download');
   await panel.getByRole('button',{name:'Export Primer3 request'}).click();
  await settled(page);
   const download=await downloadEvent;
   assert.equal(download.suggestedFilename(),'primer3-request.json');
   const fixture=await page.evaluate(()=>{
     const seq=window.PhotonEditorBridgeHost.working().seq;
     const comp={A:'T',T:'A',C:'G',G:'C'};
     const reverse=[...seq.slice(45,65)].reverse().map(c=>comp[c]).join('');
     return {
       format:'photon/primer3-result/1',engine:'primer3-py',engineVersion:'2.4.0',
       name:'Primer3Sample',template:seq,
       pairs:[{forward:{sequence:seq.slice(0,20),start:0,tm:60.1},
         reverse:{sequence:reverse,start:45,tm:59.5},
         productSize:65,pairPenalty:1.2}],
       explain:'Browser interchange fixture (not a real design run)'
     };
   });
   await panel.locator('#photonPrimer3ResultFileV34').setInputFiles({
     name:'fixture-primer3.json',mimeType:'application/json',
     buffer:Buffer.from(JSON.stringify(fixture))
   });
   await page.waitForFunction(()=>document.querySelector('#photonPrimer3ResultsV34')?.textContent?.includes('validated pair')||
     document.querySelector('#photonPrimer3ResultsV34')?.textContent?.includes('Primer3 import rejected:'),null,{timeout:5000});
   assert.match(await panel.locator('#photonPrimer3ResultsV34').innerText(),/1 validated pair/);
   assert.match(await panel.locator('#photonPrimer3ResultsV34').innerText(),/Primer3-py 2.4.0/);
   assert.deepEqual(await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working())),before);
   assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
test('Photon 3.4 rejects a stale Primer3 result after template change',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
   const page=await browser.newPage();
   await page.goto(URL,{waitUntil:'networkidle'});
   await page.evaluate(()=>{if(document.getElementById('modalBg')?.classList.contains('open'))window.closeModal();});
   await page.locator('.tab[data-tool="primers"]').click();
  await settled(page);
   const panel=page.locator('#photonPrimer3V34');
   await panel.locator('#photonPrimer3MinV34').fill('80');
   await panel.locator('#photonPrimer3MaxV34').fill('300');
   await page.evaluate(()=>{
     const w=window.PhotonEditorBridgeHost.working();
     w.seq='ATGCCGTAGTTCGATGCTAG'.repeat(25);
     w.topology='linear';w.features=[];
   });
   const requestDownload=page.waitForEvent('download');
   await panel.getByRole('button',{name:'Export Primer3 request'}).click();
  await settled(page);
   assert.equal((await requestDownload).suggestedFilename(),'primer3-request.json');
   await page.evaluate(()=>{window.PhotonEditorBridgeHost.working().seq+='A';});
   await panel.locator('#photonPrimer3ResultFileV34').setInputFiles({
     name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{}')
   });
   assert.match(await panel.locator('#photonPrimer3ResultsV34').innerText(),/changed since request export/);
 }finally{await browser.close();}
});

test('editor commit boundary isolates undo and preserves committed annotations',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
   const page=await browser.newPage();
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(URL,{waitUntil:'networkidle'});
   await page.evaluate(()=>{if(document.getElementById('modalBg')?.classList.contains('open'))window.closeModal();});
   if(await page.locator('#se').count()===0)await page.getByRole('button',{name:/code/i}).first().click();
  await settled(page);
   const before=await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working()));
   const idBefore=await page.evaluate(()=>window.PhotonEditorBridgeHost.identity());
   await page.locator('#se').fill(before.seq+'A');
   await page.locator('#ap').click();
  await settled(page);
   await page.evaluate(()=>commit('DNA integration regression fixture'));
   const idAfter=await page.evaluate(()=>window.PhotonEditorBridgeHost.identity());
   assert.notEqual(idAfter,idBefore);
   const committed=await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working()));
   assert.equal(committed.seq,before.seq+'A');
   await page.locator('#ub').click();
  await settled(page);
   assert.deepEqual(await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working())),committed);
   // Undo within the new commit boundary must work, but not cross it.
   await page.locator('#se').fill(committed.seq+'C');
   await page.locator('#ap').click();
  await settled(page);
   await page.locator('#ub').click();
  await settled(page);
   assert.deepEqual(await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working())),committed);
   const committedStored=await page.evaluate(()=>structuredClone(head().snap));
   assert.deepEqual(committedStored,committed);
   await page.evaluate(()=>createBranch('integration-branch'));
   assert.notEqual(await page.evaluate(()=>window.PhotonEditorBridgeHost.identity()),idAfter);
   assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
test('invalid annotated deletion is rejected without mutating working DNA',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(URL,{waitUntil:'networkidle'});
  await page.evaluate(()=>{
    if(document.getElementById('modalBg')?.classList.contains('open'))window.closeModal();
    const w=window.PhotonEditorBridgeHost.working();
    w.seq='AACCGGTTAACC';w.topology='linear';
    w.features=[{name:'essential',start:5,end:6,type:'CDS',strand:1}];
    window.PhotonEditorBridgeHost.render();
  });
  const before=await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working()));
  await page.locator('#se').fill('AACCTTAACC');
  await page.locator('#ap').click();
  await settled(page);
  assert.deepEqual(await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working())),before);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});

test('disjoint substitutions preserve intervening features in the browser editor',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(URL,{waitUntil:'networkidle'});
  await page.evaluate(()=>{
   if(document.getElementById('modalBg')?.classList.contains('open'))window.closeModal();
   const host=window.PhotonEditorBridgeHost,w=host.working();
   w.seq='AACCGGTTAACC';w.topology='linear';
   w.features=[{name:'middle',start:5,end:8,type:'promoter',strand:1},
               {name:'first',start:2,end:2,type:'misc',strand:1},
               {name:'last',start:11,end:11,type:'misc',strand:1}];
   host.render();
  });
  const before=await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working()));
  await page.locator('#se').fill('ATCCGGTTAATC');
  await page.locator('#ap').click();
  await settled(page);
  const after=await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working()));
  assert.deepEqual(after.features.map(f=>[f.start,f.end]),[[5,8],[2,2],[11,11]]);
  assert.equal(after.features[0].affected,undefined);
  assert.equal(after.features[1].affected,true);
  assert.equal(after.features[2].affected,true);
  await page.locator('#ub').click();
  await settled(page);
  assert.deepEqual(await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working())),before);
  await page.locator('#rb').click();
  await settled(page);
  assert.deepEqual(await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working())),after);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});

test('missing DNA module fails closed instead of running unsafe sequence-only fallback',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  await page.route('**/src/ui/editor-bridge.mjs',route=>route.abort());
  await page.goto(URL,{waitUntil:'networkidle'});
  await page.evaluate(()=>{if(document.getElementById('modalBg')?.classList.contains('open'))window.closeModal();});
  if(await page.locator('#se').count()===0)await page.getByRole('button',{name:/code/i}).first().click();
  await settled(page);
  const original=await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working()));
  assert.equal(await page.evaluate(()=>Boolean(window.PhotonEditorBridgeReady)),false);
  await page.locator('#se').fill(original.seq+'A');
  await page.locator('#ap').click();
  await settled(page);
  assert.deepEqual(await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working())),original);
 }finally{await browser.close();}
});

test('explicit mixed indel batch creates one reversible construct revision',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(URL,{waitUntil:'networkidle'});
  await page.evaluate(()=>{
   if(document.getElementById('modalBg')?.classList.contains('open'))window.closeModal();
   const host=window.PhotonEditorBridgeHost,w=host.working();
   w.seq='AACCGGTTAACC';w.topology='linear';
   w.features=[{name:'up',start:1,end:2,type:'misc'},
    {name:'middle',start:5,end:6,type:'misc'},
    {name:'down',start:10,end:12,type:'misc'}];
   host.render();
  });
  const before=await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working()));
  assert.equal(await page.evaluate(()=>window.PhotonEditorHistory.applyEdits([
    {start:2,end:4,insert:'G'},{start:8,end:8,insert:'TT'}])),true);
  const after=await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working()));
  assert.equal(after.seq,'AAGGGTTTTAACC');
  assert.deepEqual(after.features.map(f=>[f.start,f.end]),[[1,2],[4,5],[11,13]]);
  await page.locator('#ub').click();
  await settled(page);
  assert.deepEqual(await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working())),before);
  await page.locator('#rb').click();
  await settled(page);
  assert.deepEqual(await page.evaluate(()=>structuredClone(window.PhotonEditorBridgeHost.working())),after);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
test('wrapped feature highlights both arms in sequence preview',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  await page.goto(URL,{waitUntil:'networkidle'});
  await page.evaluate(()=>{
   if(document.getElementById('modalBg')?.classList.contains('open'))window.closeModal();
   const host=window.PhotonEditorBridgeHost,w=host.working();
   w.seq='AACCGGTTAACC';w.topology='circular';
   w.features=[{name:'wrap',start:10,end:3,type:'CDS',strand:1}];
   host.render();
  });
  const preview=page.locator('#sv');
  assert.equal(await preview.locator('.b').count(),6);
 }finally{await browser.close();}
});
