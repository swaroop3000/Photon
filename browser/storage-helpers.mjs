export async function settled(page){await page.evaluate(()=>window.PhotonProjects?.whenIdle().catch(()=>{}));}
export async function savedState(page){
 await settled(page);
 return page.evaluate(async()=>{
  const saved=await new Promise((resolve,reject)=>{
   const request=indexedDB.open('photon-projects');
   request.onerror=()=>reject(request.error);
   request.onsuccess=()=>{
    const db=request.result;if(!db.objectStoreNames.contains('state')){db.close();resolve(null);return;}
    const tx=db.transaction('state'),read=tx.objectStore('state').get('active');
    tx.oncomplete=()=>{db.close();resolve(read.result??null);};tx.onabort=()=>{db.close();reject(tx.error);};
   };
  });
  return {memory:JSON.stringify(DB),saved:saved?JSON.stringify(saved.data):null,revision:saved?.revision??0,legacy:localStorage.getItem('locusPro_v1')};
 });
}
export async function faultProjectWrites(page,message='injected quota failure'){
 await page.evaluate(message=>{
  const put=IDBObjectStore.prototype.put;window.failProjectWrites=true;
  IDBObjectStore.prototype.put=function(...args){
   if(this.transaction.db.name==='photon-projects'&&this.name==='state'&&window.failProjectWrites)
    throw new DOMException(message,'QuotaExceededError');
   return put.apply(this,args);
  };
 },message);
}
