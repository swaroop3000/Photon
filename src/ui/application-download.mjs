import {validateAppManifest,applicationZip} from '../core/application-bundle.mjs';
async function digest(bytes){
 if(!crypto.subtle)throw new Error('Application downloads require HTTPS or localhost.');
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
}
globalThis.PhotonApplicationDownload={async download(){
 const marker=document.querySelector('meta[name="photon-app-manifest"]');
 const local=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
 const base=new URL(marker?'./':local?'./dist/':'./',document.baseURI);
 const response=await fetch(new URL('photon-app-manifest.json',base),{cache:'no-store'});
 if(!response.ok)throw new Error('Build the application before downloading its package.');
 const text=await response.text();let manifest;
 try{manifest=validateAppManifest(JSON.parse(text));}catch{throw new Error('Application package manifest is unavailable or invalid. Run the current static build.');}
 const entries=new Array(manifest.files.length);let cursor=0;
 async function worker(){
  while(cursor<manifest.files.length){
   const index=cursor++,file=manifest.files[index],asset=await fetch(new URL(file.path,base),{cache:'no-store'});
   if(!asset.ok)throw new Error('Missing application file: '+file.path);
   const bytes=new Uint8Array(await asset.arrayBuffer());
   if(bytes.length!==file.bytes||await digest(bytes)!==file.sha256)throw new Error('Application files changed during download. Reload and retry.');
   entries[index]={path:file.path,bytes};
  }
 }
 await Promise.all(Array.from({length:Math.min(6,manifest.files.length)},worker));
 entries.push({path:'photon-app-manifest.json',bytes:new TextEncoder().encode(text)});
 const blob=new Blob([applicationZip(entries)],{type:'application/zip'}),url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='photon-app.zip';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}};
