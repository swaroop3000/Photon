/** Active project/library backend. Migration and revision checks are transactional.
 * Legacy source keys are retained. They are never used as an automatic fallback.
 */
import {validateProjectDatabase} from './project-backup.mjs';
import {isProjectStorageKey,PRIMARY_PROJECT_KEY,sha256} from './project-archive.mjs';
import {ProjectStorageError} from './project-storage.mjs';
export const PROJECT_DATABASE='photon-projects';
export const PROJECT_STORE_FORMAT='photon/active-project-store/1';

function legacyEntries(storage){
 const entries=[];
 for(let i=0;i<storage.length;i++){
  const key=storage.key(i);
  if(typeof key==='string'&&isProjectStorageKey(key)){
   const raw=storage.getItem(key);if(raw===null)throw new Error('Legacy storage changed while reading');
   entries.push({key,raw});
  }
 }
 return entries.sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0);
}
const fingerprint=entries=>sha256(JSON.stringify(entries));
function header(record){
 if(record?.format!==PROJECT_STORE_FORMAT||record.id!=='active'||
    !Number.isSafeInteger(record.revision)||record.revision<1||
    typeof record.legacyHash!=='string'||!/^[a-f0-9]{64}$/.test(record.legacyHash))
  throw new Error('Unsupported or corrupt active project-store header');
}
function libraryKey(key){
 if(typeof key!=='string'||key===PRIMARY_PROJECT_KEY||!isProjectStorageKey(key))
  throw new RangeError('Unsupported project library key');
}
export function createIndexedProjectStorage({indexedDB=globalThis.indexedDB,legacyStorage=globalThis.localStorage,fenceStorage=globalThis.localStorage,name=PROJECT_DATABASE}={}){
 let db,opening,revision,checkpoint,sourceHash,libraries=new Map();
 let blocked=false,temporary=true,migrated=false,issue=null,recoveryRaw=null,recoveryKind=null;
 const validate=data=>validateProjectDatabase(data,{maxProjects:Infinity});
 const fenceKey='photon.active-indexeddb.v1:'+name;
 const fenceValue=JSON.stringify({format:'photon/active-store-fence/1',database:name});
 function ensureFence({restore=false}={}){
  const old=fenceStorage.getItem(fenceKey);
  if(old===fenceValue)return;
  if(old!==null&&!restore)throw new Error('Migration marker is unrecognized; export data before reviewed restore');
  fenceStorage.setItem(fenceKey,fenceValue);
 }
 async function database(){
  if(db)return db;if(opening)return opening;
  opening=new Promise((resolve,reject)=>{
   if(!indexedDB){reject(new Error('IndexedDB is unavailable; no legacy fallback was opened'));return;}
   const request=indexedDB.open(name,1);let refused=false;
   request.onupgradeneeded=()=>{
    const connection=request.result;
    connection.createObjectStore('state',{keyPath:'id'});
    connection.createObjectStore('libraries',{keyPath:'key'});
    connection.createObjectStore('migrations',{keyPath:'id'});
   };
   request.onblocked=()=>{refused=true;reject(new Error('Project migration is blocked; close older Photon tabs and reload'));};
   request.onerror=()=>reject(request.error??new Error('Could not open active project storage'));
   request.onsuccess=()=>{
    if(refused){request.result.close();return;}
    db=request.result;db.onversionchange=()=>{db?.close();db=undefined;};db.onclose=()=>{db=undefined;};resolve(db);
   };
  });
  try{return await opening;}finally{opening=undefined;}
 }
 async function transaction(mode,work){
  const connection=await database();
  return new Promise((resolve,reject)=>{
   const tx=connection.transaction(['state','libraries','migrations'],mode);
   let result,failure;
   tx.oncomplete=()=>resolve(result);
   tx.onabort=()=>reject(failure??tx.error??new Error('Project transaction was interrupted'));
   const context={tx,state:tx.objectStore('state'),libs:tx.objectStore('libraries'),migrations:tx.objectStore('migrations'),
    result:value=>{result=value;},fail:error=>{failure=error;tx.abort();}};
   try{work(context);}catch(error){context.fail(error);}
  });
 }
 async function snapshot(){
  return transaction('readonly',({state,libs,migrations,result,fail})=>{
   const a=state.get('active'),b=libs.getAll();let source,sourceDone=false;
   const finish=()=>{if(a.readyState==='done'&&b.readyState==='done'&&sourceDone)result({record:a.result,rows:b.result,source});};
   a.onsuccess=()=>{
    if(!a.result){sourceDone=true;finish();return;}
    try{header(a.result);}catch(error){fail(error);return;}
    const request=migrations.get(a.result.legacyHash);
    request.onsuccess=()=>{source=request.result;sourceDone=true;finish();};
   };b.onsuccess=finish;
  });
 }
 function adopt(record,rows){
  header(record);validate(record.data);
  const cache=new Map();
  for(const row of rows){libraryKey(row.key);if(typeof row.raw!=='string')throw new Error('Invalid stored library');cache.set(row.key,row.raw);}
  revision=record.revision;sourceHash=record.legacyHash;checkpoint=JSON.stringify(record.data);
  libraries=cache;temporary=false;
 }
 function reject(error,raw,{original=false}={}){
  if(typeof raw==='string'){recoveryRaw=raw;recoveryKind=original?'original':'unsaved';}
  issue=new ProjectStorageError('Project was not saved: '+error.message,error);throw issue;
 }
 async function write(data,{restore=false,libraries:changes=[],reviewedLegacyHash}={}){
  let raw;const expectedRevision=revision,expectedSourceHash=sourceHash;
  try{
   raw=JSON.stringify(data);validate(data);
   if(expectedRevision===undefined)throw new Error('Active storage was not verified; restore access and reload before writing');
   if(blocked&&!restore)throw new Error('Saving is blocked until a validated backup is restored');
   for(const change of changes){libraryKey(change.key);if(change.raw!==null&&typeof change.raw!=='string')throw new Error('Invalid library value');}
   const entries=legacyEntries(legacyStorage),hash=await fingerprint(entries);
   if(reviewedLegacyHash!==undefined&&reviewedLegacyHash!==hash)
    throw new Error('Retained source changed after review; review it again before restoring');
   if(expectedSourceHash!==undefined&&hash!==expectedSourceHash&&!restore)
    throw new Error('Legacy storage changed after migration. Export both versions and close older Photon tabs before restoring a reviewed backup');
   // Reserve a non-genomic marker before cutover. Any marker with missing active
   // data requires explicit recovery; a lost DB must never reopen stale source.
   ensureFence({restore});
   const nextRevision=expectedRevision+1;
   if(!Number.isSafeInteger(nextRevision))throw new Error('Project revision overflow');
   const next={id:'active',format:PROJECT_STORE_FORMAT,revision:nextRevision,legacyHash:hash,data:JSON.parse(raw)};
   const initialRows=entries.filter(e=>e.key!==PRIMARY_PROJECT_KEY);
   const priorRows=await transaction('readwrite',({state,libs,migrations,result,fail})=>{
    const current=state.get('active');let previousRecord;
    const rows=libs.getAll();
    rows.onsuccess=()=>{
     try{
      for(const row of rows.result){libraryKey(row.key);if(typeof row.raw!=='string')throw new Error('Invalid stored library');}
      if(restore&&blocked&&previousRecord)migrations.put({id:'repair:'+expectedRevision,record:previousRecord,libraries:rows.result,createdAt:new Date().toISOString()});
      result(rows.result);
     }
     catch(error){fail(error);}
    };
    current.onsuccess=()=>{
     try{
      if((current.result?.revision??0)!==expectedRevision)throw new Error('Projects changed in another tab or action. Export recovery and reload before editing');
      if(current.result)header(current.result);
      previousRecord=current.result;
      // Recheck the source immediately before enqueuing writes; it is preserved,
      // never moved/deleted. Old applications must not remain open during cutover.
      if(JSON.stringify(legacyEntries(legacyStorage))!==JSON.stringify(entries))throw new Error('Legacy storage changed during migration; reload');
      if(!current.result)for(const row of initialRows)libs.put(row);
      if(!current.result||restore||current.result.legacyHash!==hash)
       migrations.put({id:hash,format:'photon/legacy-source/1',entries,createdAt:new Date().toISOString()});
      for(const change of changes)if(change.raw===null)libs.delete(change.key);else libs.put(change);
      state.put(next);
     }catch(error){fail(error);}
    };
   });
   libraries=new Map((expectedRevision===0?initialRows:priorRows).map(e=>[e.key,e.raw]));
   for(const change of changes)if(change.raw===null)libraries.delete(change.key);else libraries.set(change.key,change.raw);
   revision=nextRevision;sourceHash=hash;checkpoint=raw;blocked=false;temporary=false;issue=null;return true;
  }catch(error){
   try{return reject(error,blocked&&temporary?undefined:raw);}
   catch(failure){if(!(blocked&&temporary)&&changes.length){recoveryRaw=JSON.stringify({format:'photon/failed-project-command/1',data:JSON.parse(raw),libraries:changes});recoveryKind='command';}throw failure;}
  }
 }
 return {
  async open({create,migrate=()=>{}}){
   if(checkpoint!==undefined)throw new Error('Project storage already opened');
   let original;
   async function fromSaved(saved){
     header(saved.record);revision=saved.record.revision;
     if(!saved.source||saved.source.format!=='photon/legacy-source/1'||await fingerprint(saved.source.entries)!==saved.record.legacyHash)
      throw new Error('Migration source metadata is missing or corrupt');
     original=JSON.stringify(saved.record.data);adopt(saved.record,saved.rows);
     ensureFence();
     // Existing active data is the authority, even if a legacy tab wrote later.
     const currentHash=await fingerprint(legacyEntries(legacyStorage));
     if(currentHash!==sourceHash){original=legacyStorage.getItem(PRIMARY_PROJECT_KEY);throw new Error('Legacy storage changed after migration; current IndexedDB projects are read-only until reviewed restore');}
     blocked=false;issue=null;recoveryRaw=null;recoveryKind=null;
     return {data:JSON.parse(checkpoint),issue:null};
   }
   try{
    const saved=await snapshot();
    if(saved.record)return await fromSaved(saved);
    revision=0;
    const entries=legacyEntries(legacyStorage);original=entries.find(e=>e.key===PRIMARY_PROJECT_KEY)?.raw;
    if(fenceStorage.getItem(fenceKey)!==null){
     const inFlight=await snapshot();
     if(inFlight.record)return await fromSaved(inFlight);
     throw new Error('Active project data is missing or migration was interrupted. Restore a reviewed backup; the retained legacy copy may be older');
    }
    const data=original===undefined?create():JSON.parse(original);migrate(data);validate(data);
    checkpoint=JSON.stringify(data);
    // A second opening tab may already have migrated. Never replace its state.
    try{await write(data);migrated=entries.length>0;}catch(error){
     const concurrent=await snapshot();
     if(!concurrent.record)throw error;
     return await fromSaved(concurrent);
    }
    return {data:JSON.parse(checkpoint),issue};
   }catch(error){
    blocked=true;
    if(original===undefined){try{original=legacyStorage.getItem(PRIMARY_PROJECT_KEY);}catch{}}
    recoveryRaw=typeof original==='string'?original:null;recoveryKind='original';
    issue=new ProjectStorageError('Stored projects could not be opened safely. Original storage was left untouched. '+error.message,error);
    if(temporary){const data=create();checkpoint=JSON.stringify(data);return {data,issue};}
    return {data:JSON.parse(checkpoint),issue};
   }
  },
  save:write,
  async saveLibrary(key,raw){
   try{return await write(JSON.parse(checkpoint),{libraries:[{key,raw}]});}
   catch(error){recoveryRaw=JSON.stringify({format:'photon/failed-library-save/1',key,raw});recoveryKind='library';throw error;}
  },
  getLibrary(key){libraryKey(key);return libraries.get(key)??null;},
  rollback(){return JSON.parse(checkpoint);},
  async readSnapshot(){
   const saved=await snapshot();
   if(!saved.record)throw new Error('No active project database');
   header(saved.record);validate(saved.record.data);
   return {data:saved.record.data,revision:saved.record.revision,libraries:saved.rows};
  },
  async snapshotEntries(){
   const saved=await this.readSnapshot();
   return [{key:PRIMARY_PROJECT_KEY,raw:JSON.stringify(saved.data)},...saved.libraries].sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0);
  },
  async migrationSource(){const saved=await snapshot();if(!saved.source)throw new Error('No migration source was verified');return saved.source;},
  retainedLegacySource(){return {format:'photon/retained-legacy-source/1',entries:legacyEntries(legacyStorage)};},
  recordFailure(error,jobs){
   if(!(blocked&&temporary)){
    recoveryRaw=JSON.stringify({format:'photon/failed-save-queue/1',commands:jobs.map(({kind,key,raw,options})=>({kind,key,raw,options}))});
    recoveryKind='command';
   }
   issue=error instanceof ProjectStorageError?error:new ProjectStorageError('Project was not saved: '+error.message,error);return issue;
  },
  close(){db?.close();db=undefined;},
  get status(){return {backend:'indexedDB',revision,blocked,temporary,migrated,issue,recoveryRaw,recoveryKind};}
 };
}
