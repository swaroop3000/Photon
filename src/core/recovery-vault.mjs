/** IndexedDB staging archive + recovery journal, independent of active projects.
 * A catalog entry and its payload commit together in one readwrite transaction.
 * Transaction completion is required before reporting success. No source deletes.
 */
import {sha256} from './project-archive.mjs';
export const VAULT_DATABASE='photon-project-recovery';
const SCHEMA_VERSION=1;
const limits={archive:5,recovery:20};

export function createRecoveryVault({indexedDB=globalThis.indexedDB,name=VAULT_DATABASE}={}){
 let connection,opening;
 async function open(){
  if(connection)return connection;
  if(opening)return opening;
  opening=new Promise((resolve,reject)=>{
   if(!indexedDB){reject(new Error('Browser recovery storage is unavailable'));return;}
   let refused=false;
   const request=indexedDB.open(name,SCHEMA_VERSION);
   request.onupgradeneeded=()=>{
    const db=request.result;
    db.createObjectStore('payloads',{keyPath:'id'});
    db.createObjectStore('catalog',{keyPath:'id'}).createIndex('category','category');
   };
   request.onblocked=()=>{refused=true;reject(new Error('Recovery storage upgrade is blocked; close other Photon tabs and retry'));};
   request.onerror=()=>reject(request.error??new Error('Could not open recovery storage'));
   request.onsuccess=()=>{
    if(refused){request.result.close();return;}
    connection=request.result;
    connection.onversionchange=()=>{connection?.close();connection=undefined;};
    resolve(connection);
   };
  });
  try{return await opening;}finally{opening=undefined;}
 }
 async function transaction(mode,work){
  const db=await open();
  return new Promise((resolve,reject)=>{
   const tx=db.transaction(['catalog','payloads'],mode);
   let result,failure;
   tx.oncomplete=()=>resolve(result);
   tx.onabort=()=>reject(failure??tx.error??new Error('Recovery transaction was interrupted'));
   const context={tx,catalog:tx.objectStore('catalog'),payloads:tx.objectStore('payloads'),
    result:value=>{result=value;},fail:error=>{failure=error;tx.abort();}};
   try{work(context);}catch(error){context.fail(error);}
  });
 }
 return {
  async put(category,body,{label=''}={}){
   if(!Object.hasOwn(limits,category))throw new RangeError('Unknown recovery category');
   const text=JSON.stringify(body);
   if(typeof text!=='string'||new TextEncoder().encode(text).byteLength>64_000_000)
    throw new RangeError('Recovery payload exceeds the 64 MB limit');
   const hash=await sha256(text),id=category+':'+hash;
   const metadata={id,category,createdAt:new Date().toISOString(),hash,label:String(label).slice(0,200)};
   return transaction('readwrite',({catalog,payloads,result,fail})=>{
    const existing=catalog.get(id);
    existing.onsuccess=()=>{
     const count=catalog.index('category').count(category);
     count.onsuccess=()=>{
      if(!existing.result&&count.result>=limits[category]){
       fail(new Error('Saved '+category+' limit reached; export and clear copies before saving another'));return;
      }
      payloads.put({id,text});catalog.put(metadata);result(metadata);
     };
    };
   });
  },
  async list(category){
   if(category!==undefined&&!Object.hasOwn(limits,category))throw new RangeError('Unknown recovery category');
   return transaction('readonly',({catalog,result})=>{
    const request=category===undefined?catalog.getAll():catalog.index('category').getAll(category);
    request.onsuccess=()=>result(request.result.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id)));
   });
  },
  async read(id){
   if(typeof id!=='string')throw new TypeError('Expected recovery identifier');
   const pair=await transaction('readonly',({catalog,payloads,result})=>{
    const metadata=catalog.get(id),payload=payloads.get(id);
    const finish=()=>{if(metadata.readyState==='done'&&payload.readyState==='done')result([metadata.result,payload.result]);};
    metadata.onsuccess=finish;payload.onsuccess=finish;
   });
   const [metadata,payload]=pair;
   if(!metadata||!payload)throw new Error('Saved recovery copy was not found');
   if(await sha256(payload.text)!==metadata.hash)throw new Error('Saved recovery checksum mismatch; original projects were not changed');
   return JSON.parse(payload.text);
  },
  async remove(id){
   if(typeof id!=='string')throw new TypeError('Expected recovery identifier');
   return transaction('readwrite',({catalog,payloads})=>{catalog.delete(id);payloads.delete(id);});
  },
  close(){connection?.close();connection=undefined;}
 };
}
