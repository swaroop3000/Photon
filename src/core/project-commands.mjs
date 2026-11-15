/** Serialize legacy UI save requests behind asynchronous transaction completion.
 * Callers may await individual requests; whenIdle waits for the whole queue.
 * Success notifications/rendering are deferred by the UI adapter while busy.
 */
export function createProjectCommands({store,onBusy=()=>{},onFailure=()=>{},onIdle=()=>{}}){
 const queue=[];let running=false,replacing=false,lastFailure=null;
 const waiters=[];
 async function drain(){
  if(running)return;running=true;lastFailure=null;onBusy(true);
  while(queue.length){
   let job=queue.shift();const combined=[];
   // Legacy actions sometimes save twice (data, then navigation). Commit their
   // final snapshot once, with every acknowledgement tied to that transaction.
   while(job.kind==='projects'&&!job.options?.restore&&!job.error&&queue[0]?.kind==='projects'&&!queue[0].options?.restore&&!queue[0].error){combined.push(job);job=queue.shift();}
   try{
    if(job.error)throw job.error;
    if(job.kind==='library')await store.saveLibrary(job.key,job.raw);
    else await store.save(JSON.parse(job.raw),job.options);
    for(const item of combined)item.resolve(true);job.resolve(true);
   }catch(error){
    const abandoned=queue.splice(0);
    if((job.error||abandoned.length)&&store.recordFailure)error=store.recordFailure(error,[job,...abandoned]);
    lastFailure=error;
    onFailure(error,store.rollback(),job.kind);job.reject(error);
    for(const item of combined)item.reject(error);
    for(const item of abandoned)item.reject(error);
    break;
   }
  }
  running=false;replacing=false;onBusy(false);onIdle(lastFailure);
  for(const {resolve,reject} of waiters.splice(0))if(lastFailure)reject(lastFailure);else resolve();
 }
 function enqueue(job){
  if(replacing||(job.options?.restore&&(running||queue.length)))job.error=new Error('Another action or restore is saving; retry after it finishes');
  if(job.options?.restore&&!job.error)replacing=true;
  const promise=new Promise((resolve,reject)=>queue.push({...job,resolve,reject}));
  // Legacy callbacks historically ignored save's return. Handle rejection here
  // while preserving the rejection for callers that explicitly await it.
  promise.catch(()=>{});
  if(!running){onBusy(true);queueMicrotask(drain);}
  return promise;
 }
 return {
  save(data,options){let raw,error,capturedOptions;try{raw=JSON.stringify(data);capturedOptions=options===undefined?undefined:JSON.parse(JSON.stringify(options));}catch(cause){error=cause;}return enqueue({kind:'projects',raw,error,options:capturedOptions});},
  saveLibrary(key,raw){return enqueue({kind:'library',key,raw});},
  whenIdle(){
   if(!running&&!queue.length)return lastFailure?Promise.reject(lastFailure):Promise.resolve();
   return new Promise((resolve,reject)=>waiters.push({resolve,reject}));
  },
  get busy(){return running||queue.length>0;}
 };
}
