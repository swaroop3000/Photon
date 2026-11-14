/** Publish only the browser assets needed by Photon.
 * Usage: npm run build. This does not run tests or deploy anything.
 */
import {mkdir,copyFile,cp,rm,access,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const out=join(root,'dist');
await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
await copyFile(join(root,'index.html'),join(out,'index.html'));
await cp(join(root,'src'),join(out,'src'),{recursive:true});
const index=await stat(join(out,'index.html'));
await access(join(out,'src','ui','editor-bridge.mjs'));
await access(join(out,'src','core','dna.mjs'));
if(index.size===0)throw new Error('Empty Photon entrypoint');
console.log('Photon static distribution ready: dist/index.html + dist/src');
