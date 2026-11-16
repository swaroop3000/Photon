/** Lossless, versioned copies of the current browser storage namespace.
 * Archives preserve source strings; they never switch or delete live storage.
 */
import {validateProjectDatabase} from './project-backup.mjs';
import {hasCompoundAnnotations} from './feature-capabilities.mjs';
export const COMPOUND_ARCHIVE_FORMAT='photon/browser-storage-archive/2';
export const BROWSER_ARCHIVE_FORMAT='photon/browser-storage-archive/1';
export const PRIMARY_PROJECT_KEY='locusPro_v1';
const prefixes=['photon.parts.2.7:','photon.backbones.3.1:'];
export function isProjectStorageKey(key){
 return key===PRIMARY_PROJECT_KEY||prefixes.some(prefix=>key.startsWith(prefix));
}
export async function sha256(text){
 if(typeof text!=='string')throw new TypeError('Expected text to hash');
 if(!globalThis.crypto?.subtle)throw new Error('Local recovery requires HTTPS or localhost');
 const digest=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
 return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
function checkEntries(entries){
 if(!Array.isArray(entries)||!entries.length||entries.length>10000)
  throw new RangeError('Invalid browser archive entry count');
 const seen=new Set();
 for(const entry of entries){
  if(!entry||typeof entry.key!=='string'||!isProjectStorageKey(entry.key)||
     entry.key.length>2048||typeof entry.raw!=='string'||seen.has(entry.key))
   throw new RangeError('Invalid or duplicate browser archive entry');
  seen.add(entry.key);
 }
 const primary=entries.find(e=>e.key===PRIMARY_PROJECT_KEY);
 if(!primary)throw new RangeError('Browser archive requires saved projects');
 validateProjectDatabase(JSON.parse(primary.raw),{maxProjects:Infinity});
 return [...entries].sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0).map(({key,raw})=>({key,raw}));
}
export function captureProjectStorage(storage){
 const entries=[];
 for(let i=0;i<storage.length;i++){
  const key=storage.key(i);
  if(typeof key==='string'&&isProjectStorageKey(key)){
   const raw=storage.getItem(key);
   if(raw===null)throw new Error('Browser storage changed while reading; retry the archive');
   entries.push({key,raw});
  }
 }
 return checkEntries(entries);
}
export async function createBrowserArchive(entries,{createdAt=new Date().toISOString()}={}){
 if(typeof createdAt!=='string'||!Number.isFinite(Date.parse(createdAt)))throw new RangeError('Invalid archive date');
 const normalized=checkEntries(entries);
 const hash=await sha256(JSON.stringify(normalized));
 const compound=normalized.some(e=>hasCompoundAnnotations(e.raw));
 return {format:compound?COMPOUND_ARCHIVE_FORMAT:BROWSER_ARCHIVE_FORMAT,createdAt,sha256:hash,entries:normalized};
}
export async function parseBrowserArchive(text){
 if(typeof text!=='string'||new TextEncoder().encode(text).byteLength>64_000_000)
  throw new RangeError('Browser archive exceeds the 64 MB read limit');
 const value=JSON.parse(text);
 if(![BROWSER_ARCHIVE_FORMAT,COMPOUND_ARCHIVE_FORMAT].includes(value?.format)||typeof value.createdAt!=='string'||
    typeof value.sha256!=='string'||!/^[a-f0-9]{64}$/.test(value.sha256))
  throw new RangeError('Unsupported browser archive format');
 const checked=await createBrowserArchive(value.entries,{createdAt:value.createdAt});
 if(checked.sha256!==value.sha256)throw new RangeError('Browser archive checksum mismatch');
 return checked;
}
