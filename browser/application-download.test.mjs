import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,stat} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join,resolve,extname} from 'node:path';
import {execFileSync} from 'node:child_process';import {createServer} from 'node:http';import {chromium} from 'playwright';
import {settled} from './storage-helpers.mjs';import {createExampleProject} from './project-ui-helpers.mjs';
const URL='http://127.0.0.1:8765/';
test('downloaded application ZIP passes independent CRC/extraction and runs offline with full editing and persistence',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'photon-package-')),browser=await chromium.launch();let server;
 try{
  const page=await browser.newPage({acceptDownloads:true});await page.goto(URL,{waitUntil:'networkidle'});await createExampleProject(page,'Private_design');
  const pending=page.waitForEvent('download');await page.locator('#dlBtn').click();const download=await pending;assert.equal(download.suggestedFilename(),'photon-app.zip');
  const zip=join(dir,'app.zip');await download.saveAs(zip);
  execFileSync('python3',['-c',`import zipfile,sys,json,hashlib
with zipfile.ZipFile(sys.argv[1]) as z:
 assert z.testzip() is None
 names=z.namelist()
 assert len(names)==len(set(names))
 assert all(n=='index.html' or n=='START.txt' or n=='photon-app-manifest.json' or n.startswith('src/') for n in names)
 m=json.loads(z.read('photon-app-manifest.json'))
 assert len(names)==len(m['files'])+1
 for f in m['files']:
  b=z.read(f['path']);assert len(b)==f['bytes'];assert hashlib.sha256(b).hexdigest()==f['sha256']
 assert b'Private_design' not in z.read('index.html')
 assert b'python3 -m http.server' in z.read('START.txt')
 z.extractall(sys.argv[2])`,zip,join(dir,'extracted')]);
  const root=resolve(dir,'extracted');
  server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+decodeURIComponent(new globalThis.URL(req.url,'http://localhost').pathname));if(path!==root&&!path.startsWith(root+'/'))throw Error('outside');const file=(await stat(path)).isDirectory()?join(path,'index.html'):path;res.setHeader('Content-Type',({'.mjs':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json'})[extname(file)]||'text/plain');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
  const offline=await browser.newPage(),errors=[],outside=[];offline.on('pageerror',e=>errors.push(e.message));await offline.route('**/*',route=>{if(!route.request().url().startsWith(origin+'/')){outside.push(route.request().url());return route.abort();}return route.continue();});
  await offline.goto(origin,{waitUntil:'networkidle'});await createExampleProject(offline,'Packaged_design');const old=await offline.evaluate(()=>structuredClone(W()));
  await offline.locator('#se').fill(old.seq+'A');await offline.locator('#ap').click();await settled(offline);assert.equal(await offline.evaluate(()=>W().seq),old.seq+'A');
  await offline.locator('#ub').click();await settled(offline);assert.deepEqual(await offline.evaluate(()=>structuredClone(W())),old);
  await offline.reload({waitUntil:'networkidle'});assert.deepEqual(await offline.evaluate(()=>structuredClone(W())),old);assert.deepEqual(errors,[]);assert.deepEqual(outside,[]);
 }finally{await browser.close();if(server)await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});}
});
test('application download rejects changed assets visibly without changing projects',async()=>{
 const browser=await chromium.launch();try{const page=await browser.newPage();await page.goto(URL,{waitUntil:'networkidle'});await settled(page);const before=await page.evaluate(()=>PhotonProjects.readSnapshot());let downloads=0;page.on('download',()=>downloads++);
 await page.route('**/dist/START.txt',route=>route.fulfill({status:200,body:'Changed'}));
 await page.locator('#dlBtn').click();await page.waitForFunction(()=>document.querySelector('#photonToast')?.textContent.includes('changed during download'));
 assert.equal(await page.locator('#dlBtn').isEnabled(),true);assert.equal(downloads,0);assert.deepEqual(await page.evaluate(()=>PhotonProjects.readSnapshot()),before);
 }finally{await browser.close();}
});
