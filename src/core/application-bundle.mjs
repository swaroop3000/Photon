/** Portable static application package. No project data is collected. */
const encoder=new TextEncoder();
export function bundlePath(path){
 if(typeof path!=='string'||!path||path.length>512||!/^[A-Za-z0-9_.\/-]+$/.test(path)||
    path.startsWith('/')||path.split('/').some(part=>!part||part==='.'||part==='..'))
  throw new RangeError('Unsafe application bundle path');
 return path;
}
export function validateAppManifest(value){
 if(value?.format!=='photon/application-bundle/1'||!Array.isArray(value.files)||!value.files.length||value.files.length>500)
  throw new RangeError('Unsupported application manifest');
 const seen=new Set();let total=0;
 for(const file of value.files){
  if(!file||typeof file!=='object'||file.path==='photon-app-manifest.json')throw new RangeError('Invalid application manifest entry');
  bundlePath(file.path);
  if(seen.has(file.path)||!Number.isSafeInteger(file.bytes)||file.bytes<0||file.bytes>5_000_000||
     typeof file.sha256!=='string'||!/^[a-f0-9]{64}$/.test(file.sha256))throw new RangeError('Invalid application manifest entry');
  seen.add(file.path);total+=file.bytes;
 }
 if(total>32_000_000||!['index.html','src/ui/bootstrap.mjs','src/ui/modern-workspace.css','START.txt'].every(path=>seen.has(path)))
  throw new RangeError('Incomplete or oversized application bundle');
 return value;
}
const crcTable=Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
export function crc32(bytes){let c=0xffffffff;for(const byte of bytes)c=crcTable[(c^byte)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
function join(chunks){const size=chunks.reduce((n,c)=>n+c.length,0);if(size>32_000_000)throw new RangeError('Application ZIP exceeds memory budget');const out=new Uint8Array(size);let offset=0;for(const c of chunks){out.set(c,offset);offset+=c.length;}return out;}
/** Standard stored (uncompressed) ZIP, UTF-8 names, deterministic DOS date. */
export function applicationZip(entries){
 if(!Array.isArray(entries)||!entries.length||entries.length>501)throw new RangeError('Invalid application ZIP entries');
 const local=[],central=[],seen=new Set();let offset=0;
 for(const entry of entries){
  const path=bundlePath(entry.path),name=encoder.encode(path),bytes=entry.bytes;
  if(seen.has(path)||!(bytes instanceof Uint8Array)||bytes.length>5_000_000)throw new RangeError('Invalid or duplicate application ZIP entry');
  seen.add(path);const crc=crc32(bytes),header=new Uint8Array(30),h=new DataView(header.buffer);
  h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x800,true);h.setUint16(12,33,true);
  h.setUint32(14,crc,true);h.setUint32(18,bytes.length,true);h.setUint32(22,bytes.length,true);h.setUint16(26,name.length,true);
  local.push(header,name,bytes);
  const directory=new Uint8Array(46),d=new DataView(directory.buffer);
  d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x800,true);d.setUint16(14,33,true);
  d.setUint32(16,crc,true);d.setUint32(20,bytes.length,true);d.setUint32(24,bytes.length,true);d.setUint16(28,name.length,true);d.setUint32(42,offset,true);
  central.push(directory,name);offset+=header.length+name.length+bytes.length;
  if(offset>32_000_000)throw new RangeError('Application ZIP exceeds memory budget');
 }
 const directory=join(central),end=new Uint8Array(22),e=new DataView(end.buffer);
 e.setUint32(0,0x06054b50,true);e.setUint16(8,entries.length,true);e.setUint16(10,entries.length,true);e.setUint32(12,directory.length,true);e.setUint32(16,offset,true);
 return join([...local,directory,end]);
}
