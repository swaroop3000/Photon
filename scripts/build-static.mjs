/** Publish only the browser assets needed by Photon.
 * Usage: npm run build. This does not run tests or deploy anything.
 */
import {mkdir,cp,rm,access,stat,readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {validateAppManifest} from '../src/core/application-bundle.mjs';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const out=join(root,'dist');
await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
const uiHash=createHash('sha256').update(await readFile(join(root,'src/ui/modern-workspace.css'))).digest('hex').slice(0,16);
const html=(await readFile(join(root,'index.html'),'utf8')).replace('href="src/ui/modern-workspace.css"','href="src/ui/modern-workspace.css?v='+uiHash+'"').replace('</head>','<meta name="photon-app-manifest" content="photon-app-manifest.json">\n</head>');
await writeFile(join(out,'index.html'),html);
await cp(join(root,'src'),join(out,'src'),{recursive:true});
const index=await stat(join(out,'index.html'));
await access(join(out,'src','ui','editor-bridge.mjs'));
await access(join(out,'src','core','dna.mjs'));
if(index.size===0)throw new Error('Empty Photon entrypoint');
console.log('Photon static distribution ready: dist/index.html + dist/src');

await writeFile(join(out,'START.txt'),`Photon application package

This package contains the application, not your projects. Export project backups separately.

Extract all files into one folder. ES modules require HTTP; do not open index.html directly.
Run: python3 -m http.server 8765
Then open: http://localhost:8765/
No internet connection is required once all files are extracted.
Store backups before switching browser origins; local projects do not move automatically.
`);
const files=[];
async function collect(path){
 for(const entry of await readdir(join(out,path),{withFileTypes:true})){
  const relative=path?path+'/'+entry.name:entry.name;
  if(entry.isDirectory())await collect(relative);
  else if(entry.isFile()){
   const bytes=await readFile(join(out,relative));files.push({path:relative,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
  }
 }
}
await collect('');files.sort((a,b)=>a.path.localeCompare(b.path));
const manifest=validateAppManifest({format:'photon/application-bundle/1',files});
await writeFile(join(out,'photon-app-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Complete application download manifest ready: '+files.length+' files');
